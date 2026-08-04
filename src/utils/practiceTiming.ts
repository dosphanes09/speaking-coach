import { Topic, TopicLevel } from "@/types/models";

export const THINKING_SECONDS = 30;
/**
 * Hard floor for how much speaking time a learner is ever given. 60 seconds proved too
 * short to produce a meaningful, gradeable answer for most topics, so every topic now gets
 * at least 90 seconds regardless of its computed complexity.
 */
export const MIN_RECORDING_SECONDS = 90;
export const MAX_RECORDING_SECONDS = 120;
/**
 * Mid-tier duration for topics with moderate complexity, strictly between MIN and MAX so the
 * three complexity tiers below still produce three distinct durations instead of collapsing
 * the low and mid tiers into the same value once MIN_RECORDING_SECONDS was raised to 90.
 */
const MID_RECORDING_SECONDS = 105;

const LEVEL_COMPLEXITY: Record<TopicLevel, number> = {
  A1: 0,
  A2: 0,
  B1: 1,
  B2: 2,
  C1: 3,
  C2: 3
};

export function getRecommendedRecordingSeconds(topic: Topic): number {
  const wordCount = countWords(topic.title);
  const expectedStructureCount = topic.grammarFocus?.expectedStructures.length ?? 0;
  const complexity =
    wordCount +
    LEVEL_COMPLEXITY[topic.level] * 3 +
    expectedStructureCount * 2 +
    (topic.category === "opinion" || topic.category === "story" ? 4 : 0);

  if (complexity >= 22) {
    return MAX_RECORDING_SECONDS;
  }

  if (complexity >= 12) {
    return MID_RECORDING_SECONDS;
  }

  return MIN_RECORDING_SECONDS;
}

export function clampRecordingSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) {
    return MIN_RECORDING_SECONDS;
  }

  return Math.max(MIN_RECORDING_SECONDS, Math.min(MAX_RECORDING_SECONDS, Math.round(seconds)));
}

export function formatPracticeDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${remainingSeconds} sec`;
}

function countWords(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
