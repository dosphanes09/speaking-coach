import {
  AnalysisResult,
  ErrorPattern,
  ErrorPatternCategory,
  ErrorPatternSeverity,
  ProgressTag,
  RecordedMedia,
  SpeakingAnalytics,
  Topic,
  WordFrequency
} from "@/types/models";
import { normalizeScores } from "./scoreUtils";

interface EnrichAnalysisInput {
  analysis: AnalysisResult;
  transcript: string;
  media: RecordedMedia;
  topic: Topic;
}

const FILLER_TERMS = [
  "um",
  "uh",
  "erm",
  "like",
  "actually",
  "basically",
  "literally",
  "well",
  "so"
];

const FILLER_PHRASES = ["you know", "i mean", "kind of", "sort of"];

const STOP_WORDS = new Set([
  "the",
  "and",
  "that",
  "this",
  "with",
  "you",
  "your",
  "for",
  "from",
  "but",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "not",
  "can",
  "will",
  "would",
  "could",
  "should",
  "about",
  "because",
  "they",
  "them",
  "there",
  "then",
  "than",
  "very",
  "really",
  "also",
  "into",
  "when",
  "what",
  "which"
]);

export function enrichAnalysisForProgress({
  analysis,
  transcript,
  media,
  topic
}: EnrichAnalysisInput): AnalysisResult {
  const speakingAnalytics =
    analysis.speakingAnalytics ?? deriveSpeakingAnalytics({ analysis, transcript, media, topic });
  const errorPatterns = normalizeErrorPatterns(
    analysis.errorPatterns ?? deriveErrorPatterns(analysis)
  );
  const progressTags = normalizeProgressTags(
    analysis.progressTags ?? deriveProgressTags({ analysis, errorPatterns, topic })
  );
  return {
    ...analysis,
    speakingAnalytics,
    errorPatterns,
    progressTags
  };
}

export function deriveSpeakingAnalytics({
  analysis,
  transcript,
  media,
  topic
}: EnrichAnalysisInput): SpeakingAnalytics {
  const words = tokenizeWords(transcript);
  const transcriptWordCount = words.length;
  const sentences = splitSentences(transcript);
  const responseDurationSeconds = Math.max(0, Math.round(media.durationSeconds || 0));
  const availableDurationSeconds = Math.max(
    responseDurationSeconds,
    Math.round(media.expectedDurationSeconds || responseDurationSeconds)
  );
  const wordsPerMinute =
    responseDurationSeconds > 0 ? roundOneDecimal((transcriptWordCount / responseDurationSeconds) * 60) : 0;
  const averageSentenceLength =
    sentences.length > 0 ? roundOneDecimal(transcriptWordCount / sentences.length) : transcriptWordCount;
  const fillerWords = findFillerWords(words, transcript);
  const repeatedWords = findRepeatedWords(words);

  return {
    estimatedCEFRLevel: estimateCEFRLevel(analysis, topic),
    wordsPerMinute,
    fillerWords,
    repeatedWords,
    averageSentenceLength,
    transcriptWordCount,
    responseDurationSeconds,
    availableDurationSeconds,
    clarityNotesTR: buildClarityNotes({
      wordsPerMinute,
      fillerWordCount: fillerWords.reduce((sum, item) => sum + item.count, 0),
      averageSentenceLength,
      transcriptWordCount,
      durationSeconds: responseDurationSeconds
    })
  };
}

export function deriveErrorPatterns(analysis: AnalysisResult): ErrorPattern[] {
  const fromMistakes = analysis.mistakes.map((mistake) => {
    const source = `${mistake.problem} ${mistake.explanation}`;
    const category = classifyErrorPattern(source);
    const label = normalizeText(mistake.problem, categoryLabel(category));
    const isTurkishTransferError = detectTurkishTransfer(source);

    return {
      id: buildPatternId(category, label || mistake.id),
      category: isTurkishTransferError ? "turkish-transfer" : category,
      label,
      explanationTR: normalizeText(
        mistake.explanation,
        `${categoryLabel(category)} alaninda tekrar calisilmasi gereken bir nokta.`
      ),
      exampleOriginal: normalizeText(mistake.originalSentence, ""),
      exampleCorrected: normalizeText(mistake.correctVersion, ""),
      severity: estimateErrorSeverity(source, category, isTurkishTransferError),
      isTurkishTransferError
    } satisfies ErrorPattern;
  });

  const fromTopProblems = analysis.improvementPlan.topProblems.map((problem) => {
    const category = classifyErrorPattern(problem);
    const isTurkishTransferError = detectTurkishTransfer(problem);
    const finalCategory = isTurkishTransferError ? "turkish-transfer" : category;

    return {
      id: buildPatternId(finalCategory, problem),
      category: finalCategory,
      label: normalizeText(problem, categoryLabel(finalCategory)),
      explanationTR: `${normalizeText(problem, categoryLabel(finalCategory))} tekrar eden bir gelisim alani olabilir.`,
      exampleOriginal: "",
      exampleCorrected: "",
      severity: estimateErrorSeverity(problem, finalCategory, isTurkishTransferError),
      isTurkishTransferError
    } satisfies ErrorPattern;
  });

  return normalizeErrorPatterns([...fromMistakes, ...fromTopProblems]);
}

export function deriveProgressTags({
  analysis,
  errorPatterns,
  topic
}: {
  analysis: AnalysisResult;
  errorPatterns: ErrorPattern[];
  topic: Topic;
}): ProgressTag[] {
  const tags: ProgressTag[] = [];
  const normalizedScores = normalizeScores(analysis.scores);
  const topicTitle = topic.title.toLowerCase();

  if (topic.category === "work") {
    tags.push("business");
  }

  if (topic.grammarFocus) {
    tags.push("grammar");
  } else if (topic.category === "education") {
    tags.push("erasmus");
  }

  if (topic.category === "personal" || topic.category === "story" || topic.category === "opinion") {
    tags.push("daily-conversation");
  }

  if (containsAny(topicTitle, ["job", "career", "interview", "work"])) {
    tags.push("interview");
  }

  if (normalizedScores.grammar < 70 || hasCategory(errorPatterns, "grammar", "turkish-transfer")) {
    tags.push("grammar");
  }

  if (normalizedScores.vocabulary < 70 || hasCategory(errorPatterns, "vocabulary")) {
    tags.push("vocabulary");
  }

  if (normalizedScores.fluency < 70 || hasCategory(errorPatterns, "fluency")) {
    tags.push("fluency");
  }

  if (normalizedScores.pronunciation < 70 || hasCategory(errorPatterns, "pronunciation")) {
    tags.push("pronunciation");
  }

  return uniqueTags(tags);
}

function normalizeErrorPatterns(patterns: ErrorPattern[]): ErrorPattern[] {
  const unique = new Map<string, ErrorPattern>();

  for (const pattern of patterns) {
    const id = normalizeText(pattern.id, buildPatternId(pattern.category, pattern.label));
    const label = normalizeText(pattern.label, categoryLabel(pattern.category));

    if (!unique.has(id)) {
      unique.set(id, {
        ...pattern,
        id,
        label,
        explanationTR: normalizeText(pattern.explanationTR, `${label} tekrar calisilmasi gereken bir alan.`),
        exampleOriginal: normalizeText(pattern.exampleOriginal, ""),
        exampleCorrected: normalizeText(pattern.exampleCorrected, ""),
        severity: normalizeSeverity(pattern.severity),
        isTurkishTransferError: Boolean(pattern.isTurkishTransferError)
      });
    }
  }

  return [...unique.values()].slice(0, 12);
}

function normalizeProgressTags(tags: ProgressTag[]): ProgressTag[] {
  return uniqueTags(tags).slice(0, 8);
}

function findFillerWords(words: string[], transcript: string): WordFrequency[] {
  const counts = new Map<string, number>();
  const lowerTranscript = transcript.toLowerCase();

  for (const word of words) {
    if (FILLER_TERMS.includes(word)) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  for (const phrase of FILLER_PHRASES) {
    const count = countPhrase(lowerTranscript, phrase);
    if (count > 0) {
      counts.set(phrase, count);
    }
  }

  return toSortedFrequencies(counts);
}

function findRepeatedWords(words: string[]): WordFrequency[] {
  const counts = new Map<string, number>();

  for (const word of words) {
    if (word.length < 3 || STOP_WORDS.has(word) || FILLER_TERMS.includes(word)) {
      continue;
    }

    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const repeated = new Map([...counts.entries()].filter(([, count]) => count >= 3));

  return toSortedFrequencies(repeated).slice(0, 8);
}

function buildClarityNotes({
  wordsPerMinute,
  fillerWordCount,
  averageSentenceLength,
  transcriptWordCount,
  durationSeconds
}: {
  wordsPerMinute: number;
  fillerWordCount: number;
  averageSentenceLength: number;
  transcriptWordCount: number;
  durationSeconds: number;
}): string {
  const notes: string[] = [];

  if (durationSeconds <= 0) {
    notes.push("Kayit suresi bulunamadigi icin hiz tahmini sinirli.");
  } else if (wordsPerMinute < 85) {
    notes.push("Konusma hizi biraz yavas; kisa cumleleri daha ritmik tekrar etmeye odaklan.");
  } else if (wordsPerMinute > 165) {
    notes.push("Konusma hizi yuksek; ana fikirleri daha net duraklarla ayir.");
  } else {
    notes.push("Konusma hizi genel olarak dengeli gorunuyor.");
  }

  if (fillerWordCount >= 5) {
    notes.push("Filler word kullanimi dikkat cekiyor; cevap oncesi 2-3 anahtar kelime belirlemek yardimci olur.");
  }

  if (averageSentenceLength > 22) {
    notes.push("Cumleler uzun; daha kisa cumlelerle fikirleri bolmek anlasilirligi artirir.");
  }

  if (transcriptWordCount < 70) {
    notes.push("Cevap kisa kalmis olabilir; bir neden ve bir ornek ekleyerek cevabi genislet.");
  }

  return notes.join(" ");
}

function estimateCEFRLevel(analysis: AnalysisResult, topic: Topic): string {
  const normalizedScores = normalizeScores(analysis.scores);
  const average =
    (normalizedScores.grammar +
      normalizedScores.vocabulary +
      normalizedScores.fluency +
      normalizedScores.coherence) /
    4;

  if (average >= 85) {
    return `B2-C1 (${topic.level})`;
  }

  if (average >= 70) {
    return `B2 (${topic.level})`;
  }

  if (average >= 55) {
    return `B1 (${topic.level})`;
  }

  if (average >= 40) {
    return `A2-B1 (${topic.level})`;
  }

  return `A2 (${topic.level})`;
}

function classifyErrorPattern(value: string): ErrorPatternCategory {
  const source = value.toLowerCase();

  if (detectTurkishTransfer(source)) {
    return "turkish-transfer";
  }

  if (containsAny(source, ["word choice", "vocabulary", "collocation", "phrase", "lexical"])) {
    return "vocabulary";
  }

  if (containsAny(source, ["fluency", "pause", "hesitation", "repeat", "filler"])) {
    return "fluency";
  }

  if (containsAny(source, ["pronunciation", "pronounce", "stress", "intonation"])) {
    return "pronunciation";
  }

  if (containsAny(source, ["coherence", "connector", "organize", "structure", "flow"])) {
    return "coherence";
  }

  if (containsAny(source, ["natural", "awkward", "native-like", "idiomatic"])) {
    return "naturalness";
  }

  if (
    containsAny(source, [
      "grammar",
      "tense",
      "verb",
      "article",
      "preposition",
      "plural",
      "singular",
      "subject",
      "agreement",
      "word order"
    ])
  ) {
    return "grammar";
  }

  return "other";
}

function estimateErrorSeverity(
  value: string,
  category: ErrorPatternCategory,
  isTurkishTransferError: boolean
): ErrorPatternSeverity {
  const source = value.toLowerCase();

  if (isTurkishTransferError || containsAny(source, ["major", "unclear", "meaning", "confusing"])) {
    return "high";
  }

  if (category === "grammar" || category === "coherence" || containsAny(source, ["repeated", "often"])) {
    return "medium";
  }

  return "low";
}

function detectTurkishTransfer(value: string): boolean {
  return containsAny(value.toLowerCase(), [
    "turkish",
    "turk",
    "literal translation",
    "direct translation",
    "word order",
    "native language",
    "mother tongue"
  ]);
}

function categoryLabel(category: ErrorPatternCategory): string {
  const labels: Record<ErrorPatternCategory, string> = {
    grammar: "Grammar pattern",
    vocabulary: "Vocabulary choice",
    fluency: "Fluency pattern",
    pronunciation: "Pronunciation pattern",
    coherence: "Coherence pattern",
    naturalness: "Naturalness pattern",
    "turkish-transfer": "Turkish transfer pattern",
    other: "Speaking pattern"
  };

  return labels[category];
}

function hasCategory(
  patterns: ErrorPattern[],
  category: ErrorPatternCategory,
  fallbackCategory?: ErrorPatternCategory
): boolean {
  return patterns.some((pattern) => pattern.category === category || pattern.category === fallbackCategory);
}

function tokenizeWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z'\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^'+|'+$/g, ""))
    .filter(Boolean);
}

function splitSentences(value: string): string[] {
  return (value.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function countPhrase(source: string, phrase: string): number {
  return source.split(phrase).length - 1;
}

function toSortedFrequencies(counts: Map<string, number>): WordFrequency[] {
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

function buildPatternId(category: ErrorPatternCategory, label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${category}:${slug || "pattern"}`;
}

function normalizeText(value: string, fallback: string): string {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeSeverity(value: ErrorPatternSeverity): ErrorPatternSeverity {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function containsAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function uniqueTags(tags: ProgressTag[]): ProgressTag[] {
  return Array.from(new Set(tags));
}

function roundOneDecimal(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 10) / 10;
}
