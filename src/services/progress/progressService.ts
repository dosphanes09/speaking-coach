import { SpeakingRecord } from "@/types/models";
import { daysAgo } from "@/utils/date";

export interface ProgressPoint {
  id: string;
  label: string;
  score: number;
}

export interface ProgressSummary {
  overallAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  trend: number;
  topProblems: string[];
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
  const allScores = records.map((record) => record.scores.overall);
  const weeklyScores = recordsSince(records, daysAgo(7)).map((record) => record.scores.overall);
  const monthlyScores = recordsSince(records, daysAgo(30)).map((record) => record.scores.overall);
  const firstScore = sortedAscending[0]?.scores.overall ?? 0;
  const lastScore = sortedAscending[sortedAscending.length - 1]?.scores.overall ?? 0;
  const problemCounts = new Map<string, number>();

  for (const record of records) {
    for (const mistake of record.analysis.mistakes) {
      const key = mistake.problem.trim();
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
    score: record.scores.overall
  }));

  return {
    overallAverage: average(allScores),
    weeklyAverage: average(weeklyScores),
    monthlyAverage: average(monthlyScores),
    trend: records.length > 1 ? lastScore - firstScore : 0,
    topProblems,
    chart
  };
}
