import { ScoreMetric, SpeakingRecord } from "@/types/models";
import { getRecordErrorPatterns, getRecordSpeakingAnalytics } from "./progressMemoryService";
import { normalizeScores, SCORE_METRICS, scoreDelta } from "./scoreUtils";

export interface ScoreComparison {
  metric: ScoreMetric;
  before: number;
  after: number;
  delta: number;
}

export interface BeforeAfterComparison {
  beforeRecord: SpeakingRecord;
  afterRecord: SpeakingRecord;
  scoreChanges: ScoreComparison[];
  errorPatternDelta: number;
  beforeErrorPatternCount: number;
  afterErrorPatternCount: number;
  transcriptWordCountDelta: number;
  beforeTranscriptWordCount: number;
  afterTranscriptWordCount: number;
  wordsPerMinuteDelta: number;
  beforeWordsPerMinute: number;
  afterWordsPerMinute: number;
}

export function buildLatestTopicComparison(
  currentRecord: SpeakingRecord,
  previousRecords: SpeakingRecord[]
): BeforeAfterComparison | null {
  const previousRecord = findPreviousTopicRecord(currentRecord, previousRecords);

  if (!previousRecord) {
    return null;
  }

  return buildBeforeAfterComparison(previousRecord, currentRecord);
}

export function buildBeforeAfterComparison(
  beforeRecord: SpeakingRecord,
  afterRecord: SpeakingRecord
): BeforeAfterComparison {
  const beforeScores = normalizeScores(beforeRecord.scores);
  const afterScores = normalizeScores(afterRecord.scores);
  const beforeAnalytics = getRecordSpeakingAnalytics(beforeRecord);
  const afterAnalytics = getRecordSpeakingAnalytics(afterRecord);
  const beforeWordCount = beforeAnalytics?.transcriptWordCount ?? countWords(beforeRecord.transcript);
  const afterWordCount = afterAnalytics?.transcriptWordCount ?? countWords(afterRecord.transcript);
  const beforeWordsPerMinute = beforeAnalytics?.wordsPerMinute ?? estimateWordsPerMinute(beforeRecord);
  const afterWordsPerMinute = afterAnalytics?.wordsPerMinute ?? estimateWordsPerMinute(afterRecord);
  const beforeErrorPatternCount = getRecordErrorPatterns(beforeRecord).length;
  const afterErrorPatternCount = getRecordErrorPatterns(afterRecord).length;

  return {
    beforeRecord,
    afterRecord,
    scoreChanges: SCORE_METRICS.map((metric) => ({
      metric,
      before: beforeScores[metric],
      after: afterScores[metric],
      delta: scoreDelta(afterScores[metric], beforeScores[metric])
    })),
    errorPatternDelta: afterErrorPatternCount - beforeErrorPatternCount,
    beforeErrorPatternCount,
    afterErrorPatternCount,
    transcriptWordCountDelta: afterWordCount - beforeWordCount,
    beforeTranscriptWordCount: beforeWordCount,
    afterTranscriptWordCount: afterWordCount,
    wordsPerMinuteDelta: roundOneDecimal(afterWordsPerMinute - beforeWordsPerMinute),
    beforeWordsPerMinute,
    afterWordsPerMinute
  };
}

function findPreviousTopicRecord(
  currentRecord: SpeakingRecord,
  previousRecords: SpeakingRecord[]
): SpeakingRecord | null {
  const currentTopicTitle = normalizeTopicTitle(currentRecord.topic.title);

  return (
    previousRecords
      .filter((record) => record.id !== currentRecord.id)
      .filter(
        (record) =>
          record.topic.id === currentRecord.topic.id ||
          normalizeTopicTitle(record.topic.title) === currentTopicTitle
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

function estimateWordsPerMinute(record: SpeakingRecord): number {
  const durationSeconds = Math.max(0, record.media.durationSeconds || 0);

  if (durationSeconds <= 0) {
    return 0;
  }

  return roundOneDecimal((countWords(record.transcript) / durationSeconds) * 60);
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeTopicTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function roundOneDecimal(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 10) / 10;
}
