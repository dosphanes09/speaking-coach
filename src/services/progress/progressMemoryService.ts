import { ErrorPattern, ProgressTag, SpeakingAnalytics, SpeakingRecord } from "@/types/models";
import { deriveErrorPatterns } from "./analysisEnrichmentService";

export function getRecordSpeakingAnalytics(record: SpeakingRecord): SpeakingAnalytics | undefined {
  return record.speakingAnalytics ?? record.analysis.speakingAnalytics;
}

export function getRecordErrorPatterns(record: SpeakingRecord): ErrorPattern[] {
  const existing = record.errorPatterns ?? record.analysis.errorPatterns ?? [];

  return existing.length > 0 ? existing : deriveErrorPatterns(record.analysis);
}

export function getRecordProgressTags(record: SpeakingRecord): ProgressTag[] {
  return record.tags ?? record.analysis.progressTags ?? [];
}
