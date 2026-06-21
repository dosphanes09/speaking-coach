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
  suggestedExerciseTR: string;
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
    mode === "category" ? `${categoryLabel(category)} tekrar ediyor` : representative.label;
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
    suggestedExerciseTR: buildSuggestedExercise(category, representative, isTurkishTransferError)
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
    return "Turkce fikri once kisa yaz, sonra birebir cevirmeden ozne + fiil + tamamlayici sirasiyla 3 dogal Ingilizce cumle kur.";
  }

  switch (category) {
    case "grammar":
      return "Dogru versiyonu 3 kez sesli oku, sonra ayni gramer yapisiyla 3 yeni cumle kur.";
    case "vocabulary":
      return "Zayif kelimeyi daha guclu 3 alternatifle degistir ve her alternatifle bir ornek cumle soyle.";
    case "fluency":
      return "Corrected answer'dan 2 cumle sec; yavas, normal ve daha dogal hizda 3 tur shadowing yap.";
    case "pronunciation":
      return "Zorlandigin cumleyi kelime kelime bol, vurgu yerlerini belirle ve 5 kez tekrar et.";
    case "coherence":
      return "Cevabini fikir, neden, ornek ve sonuc olarak 4 kisa cumleye bol.";
    case "naturalness":
      return "Corrected version'dan 2 cumleyi sec ve ayni fikri daha kisa, daha dogal cumlelerle tekrar soyle.";
    default:
      return `Bu hata icin mini tekrar yap: ${pattern.label}. Once dogru versiyonu oku, sonra kendi ornegini soyle.`;
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
