import { ScoreMetric, SpeakingScores } from "@/types/models";

export type NormalizedSpeakingScores = Record<ScoreMetric, number>;

export const SCORE_METRICS: ScoreMetric[] = [
  "grammar",
  "vocabulary",
  "fluency",
  "pronunciation",
  "coherence",
  "naturalness",
  "overall"
];

export const SCORE_LABELS: Record<ScoreMetric, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  fluency: "Fluency",
  pronunciation: "Pronunciation",
  coherence: "Coherence",
  naturalness: "Naturalness",
  overall: "Overall"
};

export function normalizeScoreValue(value: number | undefined, fallback = 0): number {
  const source = Number.isFinite(value) ? Number(value) : fallback;
  const normalized = source <= 10 ? source * 10 : source;

  return clampScore(normalized);
}

export function normalizeScores(scores: SpeakingScores): NormalizedSpeakingScores {
  const normalizedFluency = normalizeScoreValue(scores.fluency);
  const normalizedCoherence = normalizeScoreValue(scores.coherence);

  return {
    grammar: normalizeScoreValue(scores.grammar),
    vocabulary: normalizeScoreValue(scores.vocabulary),
    fluency: normalizedFluency,
    pronunciation: normalizeScoreValue(scores.pronunciation, normalizedFluency),
    coherence: normalizedCoherence,
    naturalness: normalizeScoreValue(scores.naturalness, normalizedCoherence),
    overall: normalizeScoreValue(scores.overall)
  };
}

export function formatScore100(value: number): string {
  return clampScore(value).toFixed(0);
}

export function scoreDelta(current: number, previous: number): number {
  return Math.round((clampScore(current) - clampScore(previous)) * 10) / 10;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}
