/**
 * Types for the 60-second micro-drills.
 *
 * Separate from the rhetoric types on purpose, and the reason is not tidiness.
 * A rhetoric session is a graded performance: six judged dimensions, a report,
 * a place on a progress curve. A drill is a rep. It has one target, it either
 * landed or it did not, and it is meant to be repeated five times in a day
 * without thinking about it.
 *
 * Mixing them would wreck both. A 0-100 score on a tongue twister would drag
 * the rhetoric average around; a drill that produced a full report would take
 * long enough to read that nobody would do a second one.
 *
 * Why drills exist at all: diction and hesitation sounds are motor skills, and
 * motor skills answer to frequency, not to session length. One twenty-minute
 * rhetoric session a week trains less than three one-minute reps a day.
 */

export type DrillKind =
  /** Speak for a minute with no "ııı". The only drill that needs a model's ear. */
  | "dolgu_yasagi"
  /** Read a passage at a set pace. Scored from the waveform. */
  | "tempo"
  /** Say a tongue twister cleanly. Scored against the expected words. */
  | "tekerleme";

export interface DrillPrompt {
  id: string;
  kind: DrillKind;
  /** What the speaker is asked to do, in one line. */
  title: string;
  /** How to do it. Shown on the recording screen while the timer runs. */
  instruction: string;
  /**
   * The words to say, for the drills that have a fixed text. Absent for
   * `dolgu_yasagi`, where the speaker improvises and only the delivery matters.
   */
  text?: string;
  /** Words per minute to hit. Only meaningful for `tempo`. */
  targetWordsPerMinute?: number;
  /** How long the recorder runs. Kept short — that is the entire point. */
  durationSeconds: number;
  difficulty: "kolay" | "orta" | "zor";
}

/**
 * The measured side of a drill.
 *
 * Everything here except the two filler counts comes from the waveform or from
 * comparing the transcript against the expected text, so the same recording
 * always produces the same numbers. That matters more for a drill than for a
 * session: a rep you repeat daily is worthless if its verdict wobbles.
 */
export interface DrillMetrics {
  /** Heard by the model. Silence detection cannot find a sound. */
  fillerSoundCount: number;
  fillerWordCount: number;
  wordsPerMinute: number | null;
  /** Tempo with pauses removed — how fast they talk while actually talking. */
  articulationWordsPerMinute: number | null;
  pauseCount: number;
  longestPauseSeconds: number;
  /** 0-1 word-level match against `prompt.text`. Null when there is no text. */
  textAccuracy: number | null;
  metricsSource: "measured" | "model";
}

export interface DrillOutcome {
  /** Computed in code from the metrics, never by the model. */
  passed: boolean;
  /** Four or five words: "Temiz geçti", "3 dolgu sesi". */
  headline: string;
  /** One or two sentences of what happened. Written by the model. */
  detail: string;
  /** One concrete thing to change on the next rep. Written by the model. */
  tip: string;
}

export interface DrillResult {
  transcript: string;
  metrics: DrillMetrics;
  outcome: DrillOutcome;
  /** Where each hesitation sound fell, so the speaker can hear the pattern. */
  fillerMoments: Array<{ text: string; startSeconds: number }>;
}

/**
 * A finished rep.
 *
 * Deliberately does not keep the recording. A drill is disposable by design and
 * five a day would fill the disk within a month for a playback nobody returns
 * to; the rhetoric module is where recordings are worth keeping.
 */
export interface DrillRecord {
  id: string;
  createdAt: string;
  prompt: DrillPrompt;
  durationSeconds: number;
  result: DrillResult;
}

export type DrillRoute =
  | { name: "home" }
  | { name: "record"; prompt: DrillPrompt }
  | { name: "analyzing"; prompt: DrillPrompt; durationSeconds: number; audioUri: string; mimeType: string }
  | { name: "result"; record: DrillRecord }
  | { name: "history" };
