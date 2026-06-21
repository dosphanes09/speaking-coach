import { ScoreMetric, SpeakingRecord } from "@/types/models";
import { daysAgo } from "@/utils/date";
import { getRecordErrorPatterns } from "./progressMemoryService";
import {
  detectRepeatedMistakes,
  detectTurkishTransferMistakes,
  RepeatedMistake
} from "./repeatedMistakeService";
import { normalizeScores, SCORE_LABELS, SCORE_METRICS, scoreDelta } from "./scoreUtils";

export interface ProgressPoint {
  id: string;
  label: string;
  score: number;
}

export interface ProgressScoreBreakdown {
  metric: ScoreMetric;
  label: string;
  average: number;
  latest: number;
  trend: number;
}

export interface ProgressSummary {
  totalConversations: number;
  totalDurationSeconds: number;
  overallAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  trend: number;
  lastSevenTrend: number;
  lastThirtyTrend: number;
  scoreBreakdown: ProgressScoreBreakdown[];
  topProblems: string[];
  repeatedMistakes: RepeatedMistake[];
  turkishTransferMistakes: RepeatedMistake[];
  chart: ProgressPoint[];
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function recordsSince(records: SpeakingRecord[], date: Date): SpeakingRecord[] {
  return records.filter((record) => new Date(record.createdAt) >= date);
}

export function calculateProgress(records: SpeakingRecord[]): ProgressSummary {
  const sortedAscending = [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const allScores = records.map((record) => normalizeScores(record.scores).overall);
  const weeklyScores = recordsSince(records, daysAgo(7)).map((record) => normalizeScores(record.scores).overall);
  const monthlyScores = recordsSince(records, daysAgo(30)).map((record) => normalizeScores(record.scores).overall);
  const firstScore = sortedAscending[0] ? normalizeScores(sortedAscending[0].scores).overall : 0;
  const lastScore = sortedAscending[sortedAscending.length - 1]
    ? normalizeScores(sortedAscending[sortedAscending.length - 1]!.scores).overall
    : 0;
  const totalDurationSeconds = records.reduce(
    (sum, record) => sum + Math.max(0, record.media.durationSeconds || 0),
    0
  );
  const problemCounts = new Map<string, number>();

  for (const record of records) {
    for (const pattern of getRecordErrorPatterns(record)) {
      const key = pattern.label.trim();
      if (key.length === 0 || key.toLowerCase().includes("mock analysis")) {
        continue;
      }
      problemCounts.set(key, (problemCounts.get(key) ?? 0) + 1);
    }
  }

  const topProblems = [...problemCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([problem]) => problem);

  const chart = sortedAscending.slice(-10).map((record, index) => ({
    id: record.id,
    label: `${index + 1}`,
    score: normalizeScores(record.scores).overall
  }));

  return {
    totalConversations: records.length,
    totalDurationSeconds,
    overallAverage: average(allScores),
    weeklyAverage: average(weeklyScores),
    monthlyAverage: average(monthlyScores),
    trend: records.length > 1 ? scoreDelta(lastScore, firstScore) : 0,
    lastSevenTrend: calculateRecentTrend(sortedAscending, 7),
    lastThirtyTrend: calculateRecentTrend(sortedAscending, 30),
    scoreBreakdown: calculateScoreBreakdown(sortedAscending),
    topProblems,
    repeatedMistakes: detectRepeatedMistakes(records),
    turkishTransferMistakes: detectTurkishTransferMistakes(records),
    chart
  };
}

function calculateRecentTrend(sortedAscending: SpeakingRecord[], limit: number): number {
  const recentRecords = sortedAscending.slice(-limit);

  if (recentRecords.length < 2) {
    return 0;
  }

  const first = normalizeScores(recentRecords[0]!.scores).overall;
  const last = normalizeScores(recentRecords[recentRecords.length - 1]!.scores).overall;

  return scoreDelta(last, first);
}

function calculateScoreBreakdown(sortedAscending: SpeakingRecord[]): ProgressScoreBreakdown[] {
  const latestRecord = sortedAscending[sortedAscending.length - 1];
  const firstRecord = sortedAscending[0];

  return SCORE_METRICS.map((metric) => {
    const values = sortedAscending.map((record) => normalizeScores(record.scores)[metric]);
    const latest = latestRecord ? normalizeScores(latestRecord.scores)[metric] : 0;
    const first = firstRecord ? normalizeScores(firstRecord.scores)[metric] : 0;

    return {
      metric,
      label: SCORE_LABELS[metric],
      average: average(values),
      latest,
      trend: sortedAscending.length > 1 ? scoreDelta(latest, first) : 0
    };
  });
}
