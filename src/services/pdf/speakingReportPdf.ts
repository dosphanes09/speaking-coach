import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  AnalysisResult,
  DailyStudyPlan,
  PersonalizedExercise,
  Topic
} from "@/types/models";
import { NormalizedSpeakingScores, normalizeScores } from "@/services/progress/scoreUtils";

interface SpeakingReportPdfInput {
  topic: Topic;
  transcript: string;
  analysis: AnalysisResult;
  recordId?: string;
}

const LOW_SCORE_THRESHOLD = 65;
const REPORT_OWNER_NAME = "Yağız Ali Küçük";

export async function createSpeakingReportPdf(input: SpeakingReportPdfInput): Promise<string> {
  const html = buildSpeakingReportHtml(input);
  const { uri } = await Print.printToFileAsync({ html });

  return copyPdfToNamedFile(uri, input.topic.title, input.recordId);
}

export async function createAndShareSpeakingReportPdf(input: SpeakingReportPdfInput): Promise<string> {
  const reportUri = await createSpeakingReportPdf(input);
  await shareSpeakingReportPdf(reportUri);

  return reportUri;
}

export async function shareSpeakingReportPdf(reportUri: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error("Bu cihazda PDF paylaşımı kullanılamıyor.");
  }

  await Sharing.shareAsync(reportUri, {
    dialogTitle: "Speaking Feedback Report",
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf"
  });
}

export async function isSpeakingReportPdfAvailable(reportUri?: string): Promise<boolean> {
  if (!reportUri) {
    return false;
  }

  const info = await FileSystem.getInfoAsync(reportUri);
  return info.exists;
}

export async function deleteSpeakingReportPdf(reportUri?: string): Promise<void> {
  if (!reportUri) {
    return;
  }

  await FileSystem.deleteAsync(reportUri, { idempotent: true });
}

async function copyPdfToNamedFile(sourceUri: string, topicTitle: string, recordId?: string): Promise<string> {
  const baseDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;

  if (!baseDirectory) {
    return sourceUri;
  }

  const reportsDirectory = `${baseDirectory}speaking-reports/${recordId ? `${recordId}/` : ""}`;
  const directoryInfo = await FileSystem.getInfoAsync(reportsDirectory);

  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(reportsDirectory, { intermediates: true });
  }

  const fileName = buildReportFileName(topicTitle);
  const targetUri = `${reportsDirectory}${fileName}`;
  const existingFile = await FileSystem.getInfoAsync(targetUri);

  if (existingFile.exists) {
    await FileSystem.deleteAsync(targetUri, { idempotent: true });
  }

  await FileSystem.copyAsync({ from: sourceUri, to: targetUri });

  return targetUri;
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
  const levelEstimate = estimateLevel(normalizedScores, topic.level);

  return `<!doctype html>
<html lang="tr">
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
        <h2>Konuşma Konusu</h2>
        <p>${escapeHtml(topic.title)}</p>
      </section>

      <section class="section">
        <h2>Kullanıcının Transcript'i</h2>
        <div class="text-box">${escapeHtml(transcript || analysis.originalTranscript)}</div>
      </section>

      <section class="section">
        <h2>Seviye Tahmini ve Genel Değerlendirme</h2>
        <p><strong>Seviye tahmini:</strong> ${escapeHtml(levelEstimate)}</p>
        <p>${escapeHtml(buildOverallEvaluation(analysis))}</p>
        ${scoresHtml(normalizedScores)}
      </section>

      <section class="section">
        <h2>Grammar Corrections</h2>
        ${mistakesHtml(analysis)}
      </section>

      <section class="section">
        <h2>Vocabulary Suggestions</h2>
        ${listHtml(analysis.vocabularySuggestions, "Bu analizde özel vocabulary önerisi bulunamadı.")}
      </section>

      <section class="section">
        <h2>Pronunciation & Fluency Feedback</h2>
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
        <h2>Kişiye Özel Alıştırmalar</h2>
        ${exercisesHtml(exercises)}
      </section>

      <section class="section">
        <h2>Bugünün Kişisel Çalışma Planı</h2>
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
    grammarTaskTR: firstMistake
      ? `5 dakika: "${firstMistake.problem}" hatasını incele. Doğru hali yüksek sesle 3 kez oku, sonra aynı yapıyla 3 yeni cümle kur.`
      : "5 dakika: Corrected version içinden 3 cümle seç ve aynı yapıyla yeni cümleler kur.",
    vocabularyTaskTR: firstVocabularySuggestion
      ? `5 dakika: Bu öneriyi kullanarak mini drill yap: ${firstVocabularySuggestion}. Aynı fikri daha güçlü 3 farklı cümleyle söyle.`
      : "5 dakika: Cevabındaki basit kelimeleri seç, her biri için daha doğal bir alternatif yaz ve cümlede kullan.",
    pronunciationFluencyTaskTR: buildFluencyTask(analysis),
    retrySpeakingPromptTR: `5 dakika: Aynı konuya tekrar cevap ver: "${topic.title}". Bu kez en az bir neden, bir örnek ve kısa bir sonuç cümlesi ekle.`,
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
    grammarTaskTR: normalizeText(plan.grammarTaskTR, fallback.grammarTaskTR),
    vocabularyTaskTR: normalizeText(plan.vocabularyTaskTR, fallback.vocabularyTaskTR),
    pronunciationFluencyTaskTR: normalizeText(
      plan.pronunciationFluencyTaskTR,
      fallback.pronunciationFluencyTaskTR
    ),
    retrySpeakingPromptTR: normalizeText(plan.retrySpeakingPromptTR, fallback.retrySpeakingPromptTR),
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
      goal: `Bu yapıyı güçlendir: ${firstMistake.problem}`,
      instructionsTR:
        "Önce hatalı cümleyi ve düzeltilmiş halini karşılaştır. Sonra aynı gramer yapısıyla 3 yeni İngilizce cümle kur.",
      examples: buildGrammarExamples(analysis)
    });
  }

  if (analysis.vocabularySuggestions.length > 0 || normalizedScores.vocabulary <= LOW_SCORE_THRESHOLD) {
    exercises.push({
      title: "Mini vocabulary drill",
      goal: "Daha doğal ve güçlü kelime seçimleri kullanmak.",
      instructionsTR:
        "Aşağıdaki önerileri yüksek sesle oku. Sonra her alternatif kelimeyle kendi cevabına uygun yeni bir cümle kur.",
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
      goal: "Daha akıcı, daha az duraksayan bir cevap üretmek.",
      instructionsTR:
        "Native-like answer içinden 2 kısa cümle seç. Her cümleyi önce yavaş, sonra doğal hızda 5 kez tekrar et.",
      examples: buildShadowingExamples(analysis.correctedVersion)
    });
  }

  if (isShortOrSurfaceLevel(transcript, analysis)) {
    exercises.push({
      title: "Idea expansion exercise",
      goal: "Cevabı daha derin ve ikna edici hale getirmek.",
      instructionsTR:
        "Cevabını 3 parçaya genişlet: fikir, neden, örnek. Her bölüm için tek cümle kur ve sonra bunları bağla.",
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
      title: "Türkçe düşünme kaynaklı correction drill",
      goal: "Türkçeden kelime kelime çeviri yerine doğal İngilizce cümle düzeni kurmak.",
      instructionsTR:
        "Önce Türkçe düşündüğün fikri kısa yaz. Sonra birebir çevirmeden İngilizce cümleyi özne + fiil + tamamlayıcı düzeniyle yeniden kur.",
      examples: [
        "Türkçe fikir: İngilizcemi geliştirmek istiyorum çünkü işimde lazım.",
        "Natural English: I want to improve my English because I need it for my job.",
        "Pattern: I want to ... because ..."
      ]
    });
  }

  if (exercises.length === 0) {
    exercises.push({
      title: "Polished answer rehearsal",
      goal: "İyi cevabı daha doğal ve güvenli söylemek.",
      instructionsTR:
        "Corrected version'ı 3 parçaya böl. Her parçayı yüksek sesle oku, sonra ekrana bakmadan aynı fikri kendi kelimelerinle tekrar söyle.",
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

  return `5 dakika: Şu cümleyi shadowing yap: "${shadowingLine}". Önce yavaş oku, sonra doğal hızda 5 kez tekrar et.`;
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

  return `${analysis.improvementPlan.whatWentWell} Ana gelişim odağı: ${analysis.improvementPlan.tomorrowFocus} Overall score: ${formatScore(normalizedScores.overall)}/100.`;
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
    return `<p class="muted">Bu konuşmada belirgin grammar correction bulunamadı.</p>`;
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
        <p>${escapeHtml(exercise.instructionsTR)}</p>
        ${listHtml(exercise.examples, "Bu alıştırma için örnek bulunamadı.")}
      </div>`
    )
    .join("");
}

function dailyPlanHtml(plan: DailyStudyPlan): string {
  return `<p><strong>Süre:</strong> ${plan.estimatedDurationMinutes} dakika</p>
    <p><strong>Odak alanları:</strong></p>
    ${listHtml(plan.focusAreas, "Bugün doğal ve akıcı tekrar çalışması yap.")}
    <div class="plan-grid">
      <div class="plan-item"><strong>Grammar:</strong> ${escapeHtml(plan.grammarTaskTR)}</div>
      <div class="plan-item"><strong>Vocabulary:</strong> ${escapeHtml(plan.vocabularyTaskTR)}</div>
      <div class="plan-item"><strong>Pronunciation & Fluency:</strong> ${escapeHtml(plan.pronunciationFluencyTaskTR)}</div>
      <div class="plan-item"><strong>Retry speaking:</strong> ${escapeHtml(plan.retrySpeakingPromptTR)}</div>
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
      typeof exercise.instructionsTR === "string" &&
      exercise.instructionsTR.trim() &&
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

  return safeDate.toLocaleDateString("tr-TR", {
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
