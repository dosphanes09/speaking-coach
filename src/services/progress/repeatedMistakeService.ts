import { ErrorPattern, ErrorPatternCategory, SpeakingRecord } from "@/types/models";
import { getRecordErrorPatterns } from "./progressMemoryService";

export interface RepeatedMistake {
  id: string;
  category: ErrorPatternCategory;
  label: string;
  count: number;
  lastSeenAt: string;
  exampleOriginal: string;
  exampleCorrected: string;
  explanationTR: string;
  severity: ErrorPattern["severity"];
  isTurkishTransferError: boolean;
  suggestedExercise: string;
}

interface PatternObservation {
  pattern: ErrorPattern;
  record: SpeakingRecord;
}

const DEFAULT_RECENT_RECORD_LIMIT = 8;
const DEFAULT_MIN_REPEAT_COUNT = 2;

export function detectRepeatedMistakes(
  records: SpeakingRecord[],
  recentRecordLimit = DEFAULT_RECENT_RECORD_LIMIT
): RepeatedMistake[] {
  const observations = collectPatternObservations(records, recentRecordLimit);
  const byPatternId = groupObservations(observations, (item) => item.pattern.id);
  const exactRepeated = [...byPatternId.values()]
    .filter((group) => group.length >= DEFAULT_MIN_REPEAT_COUNT)
    .map((group) => buildRepeatedMistake(group, "exact"));

  const exactKeys = new Set(exactRepeated.map((mistake) => mistake.id));
  const byCategory = groupObservations(observations, (item) => `category:${item.pattern.category}`);
  const categoryRepeated = [...byCategory.values()]
    .filter((group) => group.length >= DEFAULT_MIN_REPEAT_COUNT)
    .map((group) => buildRepeatedMistake(group, "category"))
    .filter((mistake) => !exactKeys.has(mistake.id));

  return [...exactRepeated, ...categoryRepeated]
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      if (severityWeight(b.severity) !== severityWeight(a.severity)) {
        return severityWeight(b.severity) - severityWeight(a.severity);
      }

      return b.lastSeenAt.localeCompare(a.lastSeenAt);
    })
    .slice(0, 8);
}

export function detectTurkishTransferMistakes(records: SpeakingRecord[]): RepeatedMistake[] {
  return detectRepeatedMistakes(records).filter((mistake) => mistake.isTurkishTransferError);
}

function collectPatternObservations(
  records: SpeakingRecord[],
  recentRecordLimit: number
): PatternObservation[] {
  const recentRecords = [...records]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, recentRecordLimit);
  const observations: PatternObservation[] = [];

  for (const record of recentRecords) {
    const patterns = getRecordErrorPatterns(record);

    for (const pattern of patterns) {
      if (!pattern.id.trim() || !pattern.label.trim()) {
        continue;
      }

      observations.push({ pattern, record });
    }
  }

  return observations;
}

function groupObservations(
  observations: PatternObservation[],
  getKey: (item: PatternObservation) => string
): Map<string, PatternObservation[]> {
  const groups = new Map<string, PatternObservation[]>();

  for (const observation of observations) {
    const key = getKey(observation);
    groups.set(key, [...(groups.get(key) ?? []), observation]);
  }

  return groups;
}

function buildRepeatedMistake(
  observations: PatternObservation[],
  mode: "exact" | "category"
): RepeatedMistake {
  const sorted = [...observations].sort((a, b) => b.record.createdAt.localeCompare(a.record.createdAt));
  const latest = sorted[0]!;
  const representative = pickRepresentativePattern(sorted);
  const category = representative.category;
  const label =
    mode === "category" ? `${categoryLabel(category)} keeps repeating` : representative.label;
  const isTurkishTransferError =
    category === "turkish-transfer" || observations.some((item) => item.pattern.isTurkishTransferError);

  return {
    id: mode === "category" ? `repeated-category:${category}` : representative.id,
    category,
    label,
    count: observations.length,
    lastSeenAt: latest.record.createdAt,
    exampleOriginal: representative.exampleOriginal,
    exampleCorrected: representative.exampleCorrected,
    explanationTR: representative.explanationTR,
    severity: pickHighestSeverity(observations.map((item) => item.pattern.severity)),
    isTurkishTransferError,
    suggestedExercise: buildSuggestedExercise(category, representative, isTurkishTransferError)
  };
}

function pickRepresentativePattern(observations: PatternObservation[]): ErrorPattern {
  return (
    observations.find((item) => item.pattern.exampleOriginal.trim() && item.pattern.exampleCorrected.trim())
      ?.pattern ?? observations[0]!.pattern
  );
}

function pickHighestSeverity(severities: ErrorPattern["severity"][]): ErrorPattern["severity"] {
  if (severities.includes("high")) {
    return "high";
  }

  if (severities.includes("medium")) {
    return "medium";
  }

  return "low";
}

function buildSuggestedExercise(
  category: ErrorPatternCategory,
  pattern: ErrorPattern,
  isTurkishTransferError: boolean
): string {
  if (isTurkishTransferError) {
    return "Write the idea in Turkish first, then build 3 natural English sentences in subject + verb + complement order without translating word-for-word.";
  }

  switch (category) {
    case "grammar":
      return "Read the correct version aloud 3 times, then build 3 new sentences using the same grammar structure.";
    case "vocabulary":
      return "Replace the weak word with 3 stronger alternatives and say one example sentence with each alternative.";
    case "fluency":
      return "Pick 2 sentences from the corrected answer; shadow them 3 rounds at a slow, normal, and more natural pace.";
    case "pronunciation":
      return "Break the sentence you struggled with into words, mark the stressed syllables, and repeat it 5 times.";
    case "coherence":
      return "Split your answer into 4 short sentences: idea, reason, example, and conclusion.";
    case "naturalness":
      return "Pick 2 sentences from the corrected version and say the same idea again with shorter, more natural phrasing.";
    default:
      return `Do a mini repetition drill for this mistake: ${pattern.label}. Read the correct version first, then say your own example.`;
  }
}

function categoryLabel(category: ErrorPatternCategory): string {
  const labels: Record<ErrorPatternCategory, string> = {
    grammar: "Grammar",
    vocabulary: "Vocabulary",
    fluency: "Fluency",
    pronunciation: "Pronunciation",
    coherence: "Coherence",
    naturalness: "Naturalness",
    "turkish-transfer": "Turkish transfer",
    other: "Speaking pattern"
  };

  return labels[category];
}

function severityWeight(severity: ErrorPattern["severity"]): number {
  if (severity === "high") {
    return 3;
  }

  if (severity === "medium") {
    return 2;
  }

  return 1;
}
