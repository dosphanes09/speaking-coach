/**
 * Turning a pile of practice records into the few numbers worth watching.
 *
 * The guiding idea: model scores drift, counts do not. A score of 78 one week
 * and 71 the next says almost nothing; "4.2 fillers per minute became 2.1" says
 * everything. So progress is built on the measured values, and the scores ride
 * along as context rather than as the headline.
 */
import { RhetoricMetrics, RhetoricRecord, RhetoricScores } from "@/types/rhetoric";

export interface RhetoricTrend {
  key: keyof RhetoricTrackedMetrics;
  label: string;
  unit: string;
  /** Average across the most recent sessions. */
  recent: number;
  /** Average across the sessions before those. */
  earlier: number;
  /** recent - earlier. */
  change: number;
  /** True when a lower number is the better outcome (fillers, pauses). */
  lowerIsBetter: boolean;
  /** Did this actually move in the right direction? */
  improved: boolean;
  /** Not enough history to say anything honest yet. */
  hasComparison: boolean;
}

export interface RhetoricTrackedMetrics {
  fillerSoundsPerMinute: number;
  fillerWordsPerMinute: number;
  wordsPerMinute: number;
  pausesPerMinute: number;
  silenceRatio: number;
  uniqueWordRatio: number;
}

export interface RhetoricSummary {
  totalSessions: number;
  totalSpeakingSeconds: number;
  currentStreakDays: number;
  lastOverallScore: number | null;
  bestOverallScore: number | null;
  averageSelfScoreGap: number | null;
  trends: RhetoricTrend[];
}

/** Per-minute rates, so a two minute and a five minute speech compare fairly. */
export function toTrackedMetrics(record: RhetoricRecord): RhetoricTrackedMetrics {
  const minutes = Math.max(record.recording.durationSeconds, 1) / 60;
  const metrics = record.analysis.metrics;

  return {
    fillerSoundsPerMinute: safeRate(metrics.fillerSoundCount, minutes),
    fillerWordsPerMinute: safeRate(metrics.fillerWordCount, minutes),
    wordsPerMinute: finiteOr(metrics.wordsPerMinute, 0),
    pausesPerMinute: safeRate(metrics.pauseCount, minutes),
    silenceRatio: finiteOr(metrics.silenceRatio, 0) * 100,
    uniqueWordRatio: finiteOr(metrics.uniqueWordRatio, 0) * 100
  };
}

const TREND_DEFINITIONS: Array<{
  key: keyof RhetoricTrackedMetrics;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
}> = [
  { key: "fillerSoundsPerMinute", label: "Dolgu sesi", unit: "/dk", lowerIsBetter: true },
  { key: "fillerWordsPerMinute", label: "Dolgu kelimesi", unit: "/dk", lowerIsBetter: true },
  { key: "pausesPerMinute", label: "Duraklama", unit: "/dk", lowerIsBetter: true },
  { key: "wordsPerMinute", label: "Konuşma hızı", unit: " kelime/dk", lowerIsBetter: false },
  { key: "silenceRatio", label: "Sessizlik oranı", unit: "%", lowerIsBetter: true },
  { key: "uniqueWordRatio", label: "Kelime çeşitliliği", unit: "%", lowerIsBetter: false }
];

/**
 * Compares the last `window` sessions against the `window` before them.
 * A rolling comparison rather than "first vs last" so one unusually good or
 * bad day cannot masquerade as progress.
 */
export function buildRhetoricSummary(records: RhetoricRecord[], window = 3): RhetoricSummary {
  const ordered = [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const recentSlice = ordered.slice(-window);
  const earlierSlice = ordered.slice(-window * 2, -window);

  const trends: RhetoricTrend[] = TREND_DEFINITIONS.map((definition) => {
    const recent = averageOf(recentSlice, definition.key);
    const earlier = averageOf(earlierSlice, definition.key);
    const hasComparison = recentSlice.length > 0 && earlierSlice.length > 0;
    const change = recent - earlier;

    return {
      ...definition,
      recent,
      earlier,
      change,
      improved: definition.lowerIsBetter ? change < 0 : change > 0,
      hasComparison
    };
  });

  const overallScores = ordered
    .map((record) => record.analysis.scores.overall)
    .filter((score) => Number.isFinite(score));

  const selfGaps = ordered
    .filter((record) => typeof record.selfAssessment?.score === "number")
    // The self score is 1-10, the model's is 0-100; compare on one scale.
    .map((record) => (record.selfAssessment as { score: number }).score * 10 - record.analysis.scores.overall);

  return {
    totalSessions: ordered.length,
    totalSpeakingSeconds: ordered.reduce((sum, record) => sum + record.recording.durationSeconds, 0),
    currentStreakDays: calculateStreakDays(ordered),
    lastOverallScore: overallScores.length > 0 ? (overallScores[overallScores.length - 1] as number) : null,
    bestOverallScore: overallScores.length > 0 ? Math.max(...overallScores) : null,
    averageSelfScoreGap:
      selfGaps.length > 0 ? selfGaps.reduce((sum, gap) => sum + gap, 0) / selfGaps.length : null,
    trends
  };
}

/** Score dimensions that keep coming back low, i.e. what to actually work on. */
export function findRecurringWeaknesses(
  records: RhetoricRecord[],
  sessions = 5,
  threshold = 70
): Array<{ key: keyof RhetoricScores; label: string; count: number; average: number }> {
  const labels: Record<keyof RhetoricScores, string> = {
    content: "İçerik ve argüman",
    structure: "Yapı ve akış",
    fluency: "Akıcılık ve tempo",
    language: "Dil ve üslup",
    impact: "Etki ve anlatıcılık",
    voice: "Ses kullanımı",
    overall: "Genel"
  };

  const recent = [...records]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, sessions);

  if (recent.length < 2) {
    return [];
  }

  return (Object.keys(labels) as Array<keyof RhetoricScores>)
    .filter((key) => key !== "overall")
    .map((key) => {
      const values = recent.map((record) => record.analysis.scores[key]).filter(Number.isFinite);
      const below = values.filter((value) => value < threshold).length;
      const average = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      return { key, label: labels[key], count: below, average };
    })
    .filter((item) => item.count >= Math.ceil(recent.length / 2))
    .sort((a, b) => a.average - b.average);
}

/** Pairs a retake with the attempt it repeats, for before/after comparison. */
export function findRetakeSource(
  record: RhetoricRecord,
  records: RhetoricRecord[]
): RhetoricRecord | undefined {
  if (!record.retakeOfRecordId) {
    return undefined;
  }
  return records.find((item) => item.id === record.retakeOfRecordId);
}

/** Earlier attempts at the same topic, newest first. */
export function findSameTopicAttempts(
  record: RhetoricRecord,
  records: RhetoricRecord[]
): RhetoricRecord[] {
  return records
    .filter((item) => item.id !== record.id && item.topic.id === record.topic.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ------------------------------------------------------------------ */

function safeRate(count: number, minutes: number): number {
  if (!Number.isFinite(count) || minutes <= 0) {
    return 0;
  }
  return count / minutes;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function averageOf(records: RhetoricRecord[], key: keyof RhetoricTrackedMetrics): number {
  if (records.length === 0) {
    return 0;
  }
  const total = records.reduce((sum, record) => sum + toTrackedMetrics(record)[key], 0);
  return total / records.length;
}

function calculateStreakDays(ordered: RhetoricRecord[]): number {
  if (ordered.length === 0) {
    return 0;
  }

  const days = new Set(ordered.map((record) => record.createdAt.slice(0, 10)));
  const today = new Date();
  let streak = 0;

  for (let offset = 0; offset < 400; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);

    if (days.has(key)) {
      streak += 1;
    } else if (offset > 0) {
      // Today not being practised yet does not break a streak; yesterday does.
      break;
    }
  }

  return streak;
}
