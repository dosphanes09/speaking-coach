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

export type RhetoricCategory =
  | "gundelik"
  | "fikir"
  | "teknik"
  | "hikaye"
  | "ikna"
  | "kariyer";

export interface RhetoricTopic {
  id: string;
  /** The prompt as the speaker sees it. */
  title: string;
  category: RhetoricCategory;
  level: RhetoricLevel;
  /** Angles worth considering, shown only after the recording — never before. */
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
}

export interface RhetoricFeedbackPoint {
  title: string;
  detail: string;
  quote: string;
  action: string;
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
  nextSessionFocus: string[];
  summary: string;
  /**
   * Whether the model actually listened to the recording. When this is
   * "transcript" the hesitation and voice measurements are guesses, and the
   * result screen says so rather than presenting them as facts.
   */
  analysisSource: "audio" | "transcript";
  audioAnalysisFallback: boolean;
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
