import {
  AnalysisResult,
  DailyStudyPlan,
  PersonalizedExercise,
  Topic
} from "@/types/models";
import { NormalizedSpeakingScores, normalizeScores } from "@/services/progress/scoreUtils";
import {
  deleteDocument,
  documentExists,
  savePdfFromHtml,
  sharePdf
} from "@/services/platform/documentStore";

interface SpeakingReportPdfInput {
  topic: Topic;
  transcript: string;
  analysis: AnalysisResult;
  recordId?: string;
}

const LOW_SCORE_THRESHOLD = 65;
const REPORT_OWNER_NAME = "Daily Speaking Coach";

export async function createSpeakingReportPdf(input: SpeakingReportPdfInput): Promise<string> {
  const html = buildSpeakingReportHtml(input);
  const fileName = buildReportFileName(input.topic.title);
  const subfolder = `speaking-reports/${input.recordId ? `${input.recordId}/` : ""}`;
  const saved = await savePdfFromHtml(html, fileName, subfolder);

  return saved.uri;
}

export async function createAndShareSpeakingReportPdf(input: SpeakingReportPdfInput): Promise<string> {
  const reportUri = await createSpeakingReportPdf(input);
  await shareSpeakingReportPdf(reportUri);

  return reportUri;
}

export async function shareSpeakingReportPdf(reportUri: string): Promise<void> {
  await sharePdf(reportUri, "Speaking Feedback Report");
}

export async function isSpeakingReportPdfAvailable(reportUri?: string): Promise<boolean> {
  if (!reportUri) {
    return false;
  }

  return documentExists(reportUri);
}

export async function deleteSpeakingReportPdf(reportUri?: string): Promise<void> {
  if (!reportUri) {
    return;
  }

  await deleteDocument(reportUri);
}

function buildReportFileName(topicTitle: string): string {
  const safeTopic = sanitizeFileNameSegment(topicTitle) || "Speaking Topic";

  return `${REPORT_OWNER_NAME} - ${safeTopic} - Speaking Reports.pdf`;
}

function sanitizeFileNameSegment(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

export function buildSpeakingReportHtml({ topic, transcript, analysis }: SpeakingReportPdfInput): string {
  const exercises = resolvePersonalizedExercises(analysis, transcript);
  const dailyPlan = resolveDailyStudyPlan(analysis, topic, transcript);
  const normalizedScores = normalizeScores(analysis.scores);
  const levelEstimate = resolveLevelEstimate(analysis, normalizedScores, topic.level);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 32px;
        color: #172033;
        background: #f6f8fb;
        font-family: Arial, Helvetica, sans-serif;
        line-height: 1.48;
      }
      .page { max-width: 820px; margin: 0 auto; }
      .hero {
        background: #ffffff;
        border: 1px solid #dbe2ea;
        border-radius: 16px;
        padding: 28px;
        margin-bottom: 18px;
      }
      h1 { margin: 0 0 8px; font-size: 30px; color: #0f5f6f; }
      h2 { margin: 0 0 14px; font-size: 19px; color: #172033; }
      h3 { margin: 0 0 8px; font-size: 16px; color: #0f5f6f; }
      p { margin: 0 0 10px; }
      ul { margin: 0; padding-left: 20px; }
      li { margin-bottom: 7px; }
      .meta { color: #627084; font-size: 13px; }
      .section {
        background: #ffffff;
        border: 1px solid #dbe2ea;
        border-radius: 14px;
        padding: 20px;
        margin-bottom: 14px;
        page-break-inside: avoid;
      }
      .pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      .pill {
        border-radius: 999px;
        background: #e7f4f6;
        color: #0f5f6f;
        font-size: 12px;
        font-weight: 700;
        padding: 6px 10px;
      }
      .text-box {
        background: #f8fafc;
        border: 1px solid #e5ebf2;
        border-radius: 10px;
        padding: 14px;
        white-space: pre-wrap;
      }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td {
        border: 1px solid #dbe2ea;
        padding: 10px;
        text-align: left;
        vertical-align: top;
      }
      th { background: #edf5f7; color: #0f5f6f; }
      .score-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
      }
      .score {
        background: #f8fafc;
        border: 1px solid #e5ebf2;
        border-radius: 10px;
        padding: 12px;
        text-align: center;
      }
      .score strong {
        display: block;
        margin-top: 5px;
        font-size: 18px;
        color: #0f5f6f;
      }
      .exercise {
        border-top: 1px solid #e5ebf2;
        padding-top: 14px;
        margin-top: 14px;
      }
      .exercise:first-of-type { border-top: 0; padding-top: 0; margin-top: 0; }
      .muted { color: #627084; }
      .plan-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
      .plan-item {
        background: #f8fafc;
        border: 1px solid #e5ebf2;
        border-radius: 10px;
        padding: 12px;
      }
      .plan-item strong { color: #0f5f6f; }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <h1>Speaking Feedback Report</h1>
        <p class="meta">${escapeHtml(formatReportDate(analysis.createdAt))}</p>
        <div class="pill-row">
          <span class="pill">Topic: ${escapeHtml(topic.title)}</span>
          <span class="pill">Level estimate: ${escapeHtml(levelEstimate)}</span>
          <span class="pill">Overall: ${formatScore(normalizedScores.overall)}/100</span>
        </div>
      </section>

      <section class="section">
        <h2>Speaking Topic</h2>
        <p>${escapeHtml(topic.title)}</p>
      </section>

      <section class="section">
        <h2>Your Transcript</h2>
        <div class="text-box">${escapeHtml(transcript || analysis.originalTranscript)}</div>
      </section>

      <section class="section">
        <h2>Level Estimate and Overall Evaluation</h2>
        <p><strong>Level estimate:</strong> ${escapeHtml(levelEstimate)}</p>
        <p>${escapeHtml(buildOverallEvaluation(analysis))}</p>
        ${scoresHtml(normalizedScores)}
      </section>

      <section class="section">
        <h2>Grammar Corrections</h2>
        ${mistakesHtml(analysis)}
      </section>

      <section class="section">
        <h2>Vocabulary Suggestions</h2>
        ${listHtml(analysis.vocabularySuggestions, "No specific vocabulary suggestions were found in this analysis.")}
      </section>

      <section class="section">
        <h2>Pronunciation & Fluency Feedback</h2>
        <p class="meta">Pronunciation notes are estimated from the transcript only, not from audio analysis.</p>
        <p><strong>Pronunciation:</strong> ${escapeHtml(analysis.speakingFeedback.pronunciationNotes)}</p>
        <p><strong>Fluency:</strong> ${escapeHtml(analysis.speakingFeedback.fluency)}</p>
        <p><strong>Repetition:</strong> ${escapeHtml(analysis.speakingFeedback.repetitionProblems)}</p>
        <p><strong>Connectors:</strong> ${escapeHtml(analysis.speakingFeedback.missingConnectors)}</p>
      </section>

      <section class="section">
        <h2>Native-like Improved Answer</h2>
        <div class="text-box">${escapeHtml(analysis.correctedVersion)}</div>
      </section>

      <section class="section">
        <h2>Personalized Exercises</h2>
        ${exercisesHtml(exercises)}
      </section>

      <section class="section">
        <h2>Today's Personal Study Plan</h2>
        ${dailyPlanHtml(dailyPlan)}
      </section>
    </main>
  </body>
</html>`;
}

function resolvePersonalizedExercises(
  analysis: AnalysisResult,
  transcript: string
): PersonalizedExercise[] {
  const provided = (analysis.personalizedExercises ?? []).filter(isValidExercise);

  if (provided.length > 0) {
    return provided;
  }

  return buildPersonalizedExercises(analysis, transcript);
}

function resolveDailyStudyPlan(
  analysis: AnalysisResult,
  topic: Topic,
  transcript: string
): DailyStudyPlan {
  if (analysis.dailyStudyPlan) {
    return normalizeDailyStudyPlan(analysis.dailyStudyPlan, analysis, topic);
  }

  const focusAreas = buildFocusAreas(analysis);
  const firstMistake = analysis.mistakes[0];
  const firstVocabularySuggestion = analysis.vocabularySuggestions[0];

  return {
    focusAreas,
    grammarTask: firstMistake
      ? `5 minutes: Review the mistake "${firstMistake.problem}". Read the correct version aloud 3 times, then build 3 new sentences using the same structure.`
      : "5 minutes: Pick 3 sentences from the corrected version and build new sentences using the same structure.",
    vocabularyTask: firstVocabularySuggestion
      ? `5 minutes: Do a mini drill using this suggestion: ${firstVocabularySuggestion}. Say the same idea 3 different, stronger ways.`
      : "5 minutes: Pick the simple words in your answer, write a more natural alternative for each, and use it in a sentence.",
    pronunciationFluencyTask: buildFluencyTask(analysis),
    retrySpeakingPrompt: `5 minutes: Answer the same topic again: "${topic.title}". This time add at least one reason, one example, and a short conclusion sentence.`,
    estimatedDurationMinutes: estimateDailyDuration(transcript)
  };
}

function normalizeDailyStudyPlan(
  plan: DailyStudyPlan,
  analysis: AnalysisResult,
  topic: Topic
): DailyStudyPlan {
  const fallback = resolveDailyStudyPlan({ ...analysis, dailyStudyPlan: undefined }, topic, analysis.originalTranscript);

  return {
    focusAreas: normalizeStringArray(plan.focusAreas, fallback.focusAreas),
    grammarTask: normalizeText(plan.grammarTask, fallback.grammarTask),
    vocabularyTask: normalizeText(plan.vocabularyTask, fallback.vocabularyTask),
    pronunciationFluencyTask: normalizeText(
      plan.pronunciationFluencyTask,
      fallback.pronunciationFluencyTask
    ),
    retrySpeakingPrompt: normalizeText(plan.retrySpeakingPrompt, fallback.retrySpeakingPrompt),
    estimatedDurationMinutes: clampDuration(plan.estimatedDurationMinutes)
  };
}

function buildPersonalizedExercises(
  analysis: AnalysisResult,
  transcript: string
): PersonalizedExercise[] {
  const exercises: PersonalizedExercise[] = [];
  const firstMistake = analysis.mistakes[0];
  const normalizedScores = normalizeScores(analysis.scores);

  if (firstMistake) {
    exercises.push({
      title: "Grammar correction drill",
      goal: `Strengthen this structure: ${firstMistake.problem}`,
      instructions:
        "First compare the mistaken sentence with its corrected version. Then build 3 new English sentences using the same grammar structure.",
      examples: buildGrammarExamples(analysis)
    });
  }

  if (analysis.vocabularySuggestions.length > 0 || normalizedScores.vocabulary <= LOW_SCORE_THRESHOLD) {
    exercises.push({
      title: "Mini vocabulary drill",
      goal: "Use more natural and stronger word choices.",
      instructions:
        "Read the suggestions below out loud. Then build a new sentence that fits your own answer using each alternative word.",
      examples: normalizeStringArray(analysis.vocabularySuggestions.slice(0, 5), [
        "important -> essential: This skill is essential for my career.",
        "good -> valuable: It was a valuable experience for me.",
        "bad -> challenging: The situation was challenging, but I learned a lot."
      ])
    });
  }

  if (normalizedScores.fluency <= LOW_SCORE_THRESHOLD || hasRepetitionIssue(analysis)) {
    exercises.push({
      title: "Shadowing and repetition",
      goal: "Produce a more fluent answer with fewer hesitations.",
      instructions:
        "Pick 2 short sentences from the native-like answer. Repeat each sentence slowly first, then at a natural pace, 5 times.",
      examples: buildShadowingExamples(analysis.correctedVersion)
    });
  }

  if (isShortOrSurfaceLevel(transcript, analysis)) {
    exercises.push({
      title: "Idea expansion exercise",
      goal: "Make your answer deeper and more convincing.",
      instructions:
        "Expand your answer into 3 parts: idea, reason, example. Build one sentence for each part, then connect them.",
      examples: [
        "My main point is that ...",
        "The main reason is that ...",
        "For example, ...",
        "As a result, ..."
      ]
    });
  }

  if (hasTurkishThinkingIssue(analysis)) {
    exercises.push({
      title: "Turkish-thinking transfer correction drill",
      goal: "Build a natural English sentence order instead of translating word-for-word from Turkish.",
      instructions:
        "First write the idea you thought in Turkish, briefly. Then rebuild the English sentence in subject + verb + complement order, without translating word-for-word.",
      examples: [
        "Word-for-word attempt: English improve want because job need.",
        "Natural English: I want to improve my English because I need it for my job.",
        "Pattern: I want to ... because ..."
      ]
    });
  }

  if (exercises.length === 0) {
    exercises.push({
      title: "Polished answer rehearsal",
      goal: "Say the good answer more naturally and confidently.",
      instructions:
        "Split the corrected version into 3 parts. Read each part out loud, then say the same idea again in your own words without looking at the screen.",
      examples: buildShadowingExamples(analysis.correctedVersion)
    });
  }

  return exercises.slice(0, 5);
}

function buildGrammarExamples(analysis: AnalysisResult): string[] {
  const mistakeExamples = analysis.mistakes
    .slice(0, 3)
    .map((mistake) => mistake.correctVersion.trim())
    .filter(Boolean);

  return normalizeStringArray(mistakeExamples, [
    "I have been working on my English for a long time.",
    "One challenge I overcame was speaking without translating in my head.",
    "If I practice every day, I will become more confident."
  ]);
}

function buildShadowingExamples(correctedVersion: string): string[] {
  const sentences = splitSentences(correctedVersion).slice(0, 3);

  return normalizeStringArray(sentences, [
    "I believe this experience helped me become more confident.",
    "One reason is that it pushed me to communicate more clearly.",
    "In the future, I want to express my ideas more naturally."
  ]);
}

function buildFocusAreas(analysis: AnalysisResult): string[] {
  const lowScores = scoreFocusAreas(normalizeScores(analysis.scores));
  const problems = analysis.improvementPlan.topProblems.slice(0, 3);

  return uniqueStrings([...lowScores, ...problems]).slice(0, 4);
}

function scoreFocusAreas(scores: NormalizedSpeakingScores): string[] {
  const areas: string[] = [];

  if (scores.grammar <= LOW_SCORE_THRESHOLD) {
    areas.push("Grammar accuracy");
  }

  if (scores.vocabulary <= LOW_SCORE_THRESHOLD) {
    areas.push("Vocabulary range");
  }

  if (scores.fluency <= LOW_SCORE_THRESHOLD) {
    areas.push("Fluency and rhythm");
  }

  if (scores.coherence <= LOW_SCORE_THRESHOLD) {
    areas.push("Coherence and idea flow");
  }

  return areas.length > 0 ? areas : ["Natural delivery", "Clear examples"];
}

function buildFluencyTask(analysis: AnalysisResult): string {
  const shadowingLine = buildShadowingExamples(analysis.correctedVersion)[0];

  return `5 minutes: Shadow this sentence: "${shadowingLine}". Read it slowly first, then repeat it at a natural pace 5 times.`;
}

function estimateDailyDuration(transcript: string): number {
  const wordCount = countWords(transcript);

  if (wordCount < 60) {
    return 15;
  }

  if (wordCount > 130) {
    return 25;
  }

  return 20;
}

function clampDuration(value: number): number {
  if (!Number.isFinite(value)) {
    return 20;
  }

  return Math.min(25, Math.max(15, Math.round(value)));
}

function resolveLevelEstimate(
  analysis: AnalysisResult,
  normalizedScores: NormalizedSpeakingScores,
  topicLevel: Topic["level"]
): string {
  // Prefer the AI's own estimate (the same value already shown in-app on the Speaking
  // Analytics card) so the PDF never disagrees with what the learner already saw.
  // Only fall back to a locally computed estimate if the analysis genuinely has none.
  const aiEstimate = analysis.speakingAnalytics?.estimatedCEFRLevel?.trim();

  if (aiEstimate) {
    return aiEstimate.toLowerCase().includes("topic level") ? aiEstimate : `${aiEstimate} (topic level: ${topicLevel})`;
  }

  return estimateLevel(normalizedScores, topicLevel);
}

function estimateLevel(scores: NormalizedSpeakingScores, topicLevel: Topic["level"]): string {
  const average = (scores.grammar + scores.vocabulary + scores.fluency + scores.coherence) / 4;

  if (average >= 85) {
    return `B2-C1 (topic level: ${topicLevel})`;
  }

  if (average >= 70) {
    return `B2 (topic level: ${topicLevel})`;
  }

  if (average >= 55) {
    return `B1 (topic level: ${topicLevel})`;
  }

  if (average >= 40) {
    return `A2-B1 (topic level: ${topicLevel})`;
  }

  return `A2 (topic level: ${topicLevel})`;
}

function buildOverallEvaluation(analysis: AnalysisResult): string {
  const normalizedScores = normalizeScores(analysis.scores);

  return `${analysis.improvementPlan.whatWentWell} Main improvement focus: ${analysis.improvementPlan.tomorrowFocus} Overall score: ${formatScore(normalizedScores.overall)}/100.`;
}

function scoresHtml(scores: NormalizedSpeakingScores): string {
  return `<div class="score-grid">
    ${scoreBoxHtml("Grammar", scores.grammar)}
    ${scoreBoxHtml("Vocabulary", scores.vocabulary)}
    ${scoreBoxHtml("Fluency", scores.fluency)}
    ${scoreBoxHtml("Pronunciation", scores.pronunciation)}
    ${scoreBoxHtml("Coherence", scores.coherence)}
    ${scoreBoxHtml("Naturalness", scores.naturalness)}
    ${scoreBoxHtml("Overall", scores.overall)}
  </div>`;
}

function scoreBoxHtml(label: string, value: number): string {
  return `<div class="score"><span>${escapeHtml(label)}</span><strong>${formatScore(value)}</strong></div>`;
}

function mistakesHtml(analysis: AnalysisResult): string {
  if (analysis.mistakes.length === 0) {
    return `<p class="muted">No notable grammar corrections were found in this recording.</p>`;
  }

  const rows = analysis.mistakes
    .map(
      (mistake) => `<tr>
        <td>${escapeHtml(mistake.originalSentence)}</td>
        <td>${escapeHtml(mistake.problem)}</td>
        <td>${escapeHtml(mistake.correctVersion)}</td>
        <td>${escapeHtml(mistake.explanation)}</td>
      </tr>`
    )
    .join("");

  return `<table>
    <thead>
      <tr>
        <th>Original</th>
        <th>Problem</th>
        <th>Corrected</th>
        <th>Explanation</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function exercisesHtml(exercises: PersonalizedExercise[]): string {
  return exercises
    .map(
      (exercise) => `<div class="exercise">
        <h3>${escapeHtml(exercise.title)}</h3>
        <p><strong>Goal:</strong> ${escapeHtml(exercise.goal)}</p>
        <p>${escapeHtml(exercise.instructions)}</p>
        ${listHtml(exercise.examples, "No examples were found for this exercise.")}
      </div>`
    )
    .join("");
}

function dailyPlanHtml(plan: DailyStudyPlan): string {
  return `<p><strong>Duration:</strong> ${plan.estimatedDurationMinutes} minutes</p>
    <p><strong>Focus areas:</strong></p>
    ${listHtml(plan.focusAreas, "Do a natural, fluent repetition practice today.")}
    <div class="plan-grid">
      <div class="plan-item"><strong>Grammar:</strong> ${escapeHtml(plan.grammarTask)}</div>
      <div class="plan-item"><strong>Vocabulary:</strong> ${escapeHtml(plan.vocabularyTask)}</div>
      <div class="plan-item"><strong>Pronunciation & Fluency:</strong> ${escapeHtml(plan.pronunciationFluencyTask)}</div>
      <div class="plan-item"><strong>Retry speaking:</strong> ${escapeHtml(plan.retrySpeakingPrompt)}</div>
    </div>`;
}

function listHtml(items: string[], emptyText: string): string {
  const normalized = normalizeStringArray(items, []);

  if (normalized.length === 0) {
    return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  }

  return `<ul>${normalized.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function isValidExercise(exercise: PersonalizedExercise): boolean {
  return Boolean(
    typeof exercise.title === "string" &&
      exercise.title.trim() &&
      typeof exercise.goal === "string" &&
      exercise.goal.trim() &&
      typeof exercise.instructions === "string" &&
      exercise.instructions.trim() &&
      Array.isArray(exercise.examples) &&
      exercise.examples.length > 0
  );
}

function normalizeStringArray(items: string[], fallback: string[]): string[] {
  const normalized = items.map((item) => item.trim()).filter(Boolean);

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeText(value: string, fallback: string): string {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : fallback;
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function hasRepetitionIssue(analysis: AnalysisResult): boolean {
  const value = analysis.speakingFeedback.repetitionProblems.toLowerCase();

  return containsAny(value, ["repeat", "repetition", "tekrar", "same word", "same phrase"]);
}

function hasTurkishThinkingIssue(analysis: AnalysisResult): boolean {
  const source = analysis.mistakes
    .map((mistake) => `${mistake.problem} ${mistake.explanation}`)
    .join(" ")
    .toLowerCase();

  return containsAny(source, [
    "turkish",
    "türk",
    "literal translation",
    "direct translation",
    "word order",
    "native language",
    "mother tongue"
  ]);
}

function isShortOrSurfaceLevel(transcript: string, analysis: AnalysisResult): boolean {
  return countWords(transcript) < 75 || normalizeScores(analysis.scores).coherence <= LOW_SCORE_THRESHOLD;
}

function containsAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function splitSentences(value: string): string[] {
  return (value.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function formatScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1).replace(/\.0$/, "") : "0";
}

function formatReportDate(value: string): string {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  return safeDate.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
