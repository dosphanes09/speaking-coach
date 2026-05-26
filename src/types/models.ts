export type TopicLevel = "A2" | "B1" | "B2" | "C1";

export type RecordingType = "audio" | "video";

export type SyncStatus = "local" | "pending" | "synced";

export type ChatMessageRole = "user" | "assistant";

export type ChatMessageKind = "text" | "audio";

export type ChatMessageSource = "typed" | "voice" | "mock" | "backend";

export type RouteName =
  | "home"
  | "chat"
  | "thinking"
  | "recording"
  | "transcript"
  | "analysis"
  | "history"
  | "recordDetail"
  | "progress"
  | "settings";

export interface Topic {
  id: string;
  title: string;
  level: TopicLevel;
  category: "personal" | "work" | "education" | "opinion" | "story";
}

export interface RecordedMedia {
  uri: string;
  type: RecordingType;
  durationSeconds: number;
  mimeType: string;
}

export interface SpeakingScores {
  grammar: number;
  vocabulary: number;
  fluency: number;
  coherence: number;
  overall: number;
}

export interface Mistake {
  id: string;
  originalSentence: string;
  problem: string;
  correctVersion: string;
  explanation: string;
}

export interface SpeakingFeedback {
  grammar: string;
  vocabulary: string;
  fluency: string;
  coherence: string;
  confidence: string;
  repetitionProblems: string;
  missingConnectors: string;
  pronunciationNotes: string;
}

export interface ImprovementPlan {
  whatWentWell: string;
  topProblems: string[];
  tomorrowFocus: string;
  sentencePatterns: string[];
  homework: string;
}

export interface AnalysisResult {
  originalTranscript: string;
  correctedVersion: string;
  mistakes: Mistake[];
  vocabularySuggestions: string[];
  connectorSuggestions: string[];
  sentenceStructureSuggestions?: string[];
  speakingFeedback: SpeakingFeedback;
  scores: SpeakingScores;
  improvementPlan: ImprovementPlan;
  generatedBy: "mock" | "backend" | "manual-prompt";
  createdAt: string;
}

export interface SpeakingRecord {
  id: string;
  createdAt: string;
  topic: Topic;
  media: RecordedMedia;
  transcript: string;
  correctedVersion: string;
  analysis: AnalysisResult;
  scores: SpeakingScores;
  syncStatus: SyncStatus;
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  kind: ChatMessageKind;
  text: string;
  audioUri?: string;
  transcript?: string;
  source: ChatMessageSource;
  createdAt: string;
}

export interface AppSettings {
  targetLevel: TopicLevel;
  backendBaseUrl: string;
}
