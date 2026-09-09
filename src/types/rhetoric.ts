/**
 * Types for the Turkish rhetoric module.
 *
 * Deliberately separate from `@/types/models`: the English module measures
 * language accuracy, this one measures whether a speech lands. Sharing a record
 * type would have meant one history list and one progress chart mixing two
 * incompatible scales, which makes both meaningless.
 */

/** Which practice this was. Prepared gives 15 minutes; impromptu gives 60 seconds. */
export type RhetoricMode = "prepared" | "impromptu";

export type RhetoricLevel = "kolay" | "orta" | "zor";

/**
 * The field a topic is drawn from.
 *
 * These are subject areas, not speech types, because the exercise changed:
 * the speaker is handed a concept to research for fifteen minutes and then
 * explain. "Which field do I want to learn something from today" is a question
 * a person can actually answer; "do I want to practise persuasion today" is not.
 */
export type RhetoricCategory =
  | "psikoloji"
  | "ekonomi"
  | "bilim"
  | "tarih"
  | "teknoloji"
  | "toplum";

export interface RhetoricTopic {
  id: string;
  /** The concept as the speaker sees it. This is all they get before speaking. */
  title: string;
  category: RhetoricCategory;
  level: RhetoricLevel;
  /**
   * What the concept actually is, in two or three sentences.
   *
   * Never shown before the recording — that would replace the fifteen minutes
   * of research this whole exercise is built around. It has two jobs
   * afterwards: the speaker reads it to find out what they got wrong, and the
   * backend uses it as the reference for the accuracy check.
   */
  definition: string;
  /**
   * The points a correct explanation is expected to touch. Shown only AFTER the
   * recording, and sent to the analysis as a reference list — not as an
   * exhaustive one, so covering something else instead is not an error.
   */
  angles: string[];
  /** Where the topic came from, so AI-generated ones can be told apart. */
  source: "bank" | "ai";
}

/** The pieces of a segment the app renders as a marked-up transcript. */
export type RhetoricSegmentKind =
  | "speech"
  | "filler_sound"
  | "filler_word"
  | "long_pause"
  | "repetition"
  | "strong_moment";

export interface RhetoricSegment {
  text: string;
  kind: RhetoricSegmentKind;
  startSeconds: number;
  note: string;
}

export interface RhetoricScores {
  content: number;
  structure: number;
  fluency: number;
  language: number;
  impact: number;
  voice: number;
  overall: number;
}

export interface RhetoricMetrics {
  wordsPerMinute: number;
  fillerWordCount: number;
  fillerSoundCount: number;
  pauseCount: number;
  longestPauseSeconds: number;
  silenceRatio: number;
  uniqueWordRatio: number;
  averageSentenceWords: number;
  topFillers: Array<{ text: string; count: number }>;
  /**
   * Where the numbers above came from.
   *
   * "measured" means pause count, longest pause, silence ratio and speaking
   * tempo were read off the waveform with ffmpeg — the same recording always
   * produces the same figures, which is what makes the progress chart mean
   * anything. "model" means they are the model's impression and can drift
   * between runs. Filler counts are always the model's: "ııı" is sound, and
   * silence detection cannot hear it.
   *
   * Optional because records saved before this existed do not carry it.
   */
  metricsSource?: "measured" | "model";
}

export interface RhetoricFeedbackPoint {
  title: string;
  detail: string;
  quote: string;
  action: string;
}

/**
 * `verdict` is deliberately three-valued rather than a score. "Kısmen" is the
 * common and interesting case — the concept was roughly right but a load-bearing
 * piece was missing — and a number would blur it into the noise.
 */
export interface RhetoricConceptAccuracy {
  verdict: "dogru" | "kismen" | "yanlis";
  /** Points from the reference list the speaker actually explained. */
  correctPoints: string[];
  /** Reference points never mentioned. Missing is not the same as wrong. */
  missedPoints: string[];
  /** Things stated that are factually wrong. Only real errors belong here. */
  errors: string[];
  /** Correct material the speaker added beyond the reference list. */
  extraPoints: string[];
  comment: string;
}

export interface RhetoricAnalysis {
  transcript: string;
  segments: RhetoricSegment[];
  scores: RhetoricScores;
  metrics: RhetoricMetrics;
  strengths: RhetoricFeedbackPoint[];
  improvements: RhetoricFeedbackPoint[];
  structureFeedback: {
    opening: string;
    body: string;
    closing: string;
    transitions: string;
  };
  deliveryFeedback: {
    pace: string;
    intonation: string;
    articulation: string;
    energy: string;
  };
  preparationFeedback: {
    coveredPoints: string[];
    missedPoints: string[];
    improvisedPoints: string[];
    comment: string;
  };
  timeManagement: {
    targetSeconds: number;
    actualSeconds: number;
    comment: string;
  };
  /**
   * Whether the speaker understood the concept they researched.
   *
   * This is the only part of the analysis that judges *what* was said rather
   * than *how*. Fifteen minutes of research either lands or it does not, and
   * nothing else in the report can tell the difference between a confident
   * speaker who understood the idea and a confident speaker who did not.
   *
   * Optional because records saved before this feature existed do not have it.
   */
  conceptAccuracy?: RhetoricConceptAccuracy;
  nextSessionFocus: string[];
  summary: string;
  /**
   * Whether the model actually listened to the recording. When this is
   * "transcript" the hesitation and voice measurements are guesses, and the
   * result screen says so rather than presenting them as facts.
   */
  analysisSource: "audio" | "transcript";
  audioAnalysisFallback: boolean;
  /**
   * Set when the recording's background noise sat too close to the speaking
   * level for a silence threshold to be placed at all, so the waveform
   * measurement was skipped and the model's estimates stand.
   */
  measurementUnreliable?: boolean;
}

/** What the speaker thought before seeing the score. */
export interface RhetoricSelfAssessment {
  score: number;
  note: string;
}

export interface RhetoricRecording {
  /** What the speaker plays back. Video where available, otherwise the audio. */
  uri: string;
  /**
   * The audio track on its own, which is what gets uploaded for analysis.
   * Kept separate from `uri` because on desktop the two are different files:
   * the video stays on disk and is never sent anywhere.
   */
  audioUri: string;
  hasVideo: boolean;
  durationSeconds: number;
  mimeType: string;
}

export interface RhetoricRecord {
  id: string;
  createdAt: string;
  topic: RhetoricTopic;
  mode: RhetoricMode;
  targetDurationSeconds: number;
  preparationNotes: string;
  recording: RhetoricRecording;
  analysis: RhetoricAnalysis;
  selfAssessment?: RhetoricSelfAssessment;
  /** Set when this attempt repeats an earlier one, for before/after comparison. */
  retakeOfRecordId?: string;
  pdfReportUri?: string;
}

/* ------------------------------------------------------------------ *
 * Navigation
 * ------------------------------------------------------------------ */

export type RhetoricRoute =
  | { name: "home" }
  | { name: "topic"; mode: RhetoricMode; retakeOf?: RhetoricRecord }
  | {
      name: "prepare";
      topic: RhetoricTopic;
      mode: RhetoricMode;
      targetDurationSeconds: number;
      retakeOf?: RhetoricRecord;
    }
  | {
      name: "record";
      topic: RhetoricTopic;
      mode: RhetoricMode;
      targetDurationSeconds: number;
      preparationNotes: string;
      retakeOf?: RhetoricRecord;
    }
  | {
      name: "selfScore";
      topic: RhetoricTopic;
      mode: RhetoricMode;
      targetDurationSeconds: number;
      preparationNotes: string;
      recording: RhetoricRecording;
      retakeOf?: RhetoricRecord;
    }
  | {
      name: "analyzing";
      topic: RhetoricTopic;
      mode: RhetoricMode;
      targetDurationSeconds: number;
      preparationNotes: string;
      recording: RhetoricRecording;
      selfAssessment: RhetoricSelfAssessment;
      retakeOf?: RhetoricRecord;
    }
  | { name: "result"; record: RhetoricRecord }
  | { name: "history" }
  | { name: "progress" }
  | { name: "detail"; record: RhetoricRecord };
