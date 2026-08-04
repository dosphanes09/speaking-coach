export type TopicLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type GrammarLevel = TopicLevel;

export type ThemeMode = "light" | "dark" | "love";

export type RecordingType = "audio" | "video";

export type SyncStatus = "local" | "pending" | "synced";

export type PracticeType =
  | "general"
  | "grammar"
  | "picture_description"
  | "listening_picture_match";

export type ChatMessageRole = "user" | "assistant";

export type ChatMessageKind = "text" | "audio";

export type ChatMessageSource = "typed" | "voice" | "mock" | "backend";

export type ScoreMetric =
  | "grammar"
  | "vocabulary"
  | "fluency"
  | "pronunciation"
  | "coherence"
  | "naturalness"
  | "overall";

export type ProgressTag =
  | "interview"
  | "daily-conversation"
  | "erasmus"
  | "business"
  | "grammar"
  | "fluency"
  | "pronunciation"
  | "vocabulary";

export type ErrorPatternCategory =
  | "grammar"
  | "vocabulary"
  | "fluency"
  | "pronunciation"
  | "coherence"
  | "naturalness"
  | "turkish-transfer"
  | "other";

export type ErrorPatternSeverity = "low" | "medium" | "high";

export type PictureImageKey =
  | "a1-kitchen-breakfast"
  | "a1-classroom-help"
  | "a1-bedroom-desk"
  | "a1-street-bus-stop"
  | "a2-cafe-reading-red-bag"
  | "a2-cafe-phone-blue-bag"
  | "a2-cafe-laptop-green-backpack"
  | "a2-cafe-friends-counter"
  | "b1-train-missed-platform"
  | "b1-hotel-reception-problem"
  | "b1-lost-luggage-carousel"
  | "b2-remote-work-home"
  | "b2-office-meeting-chart"
  | "c1-airport-delay-phone"
  | "c1-ai-workplace-review"
  | "c2-climate-policy-meeting";

export type RouteName =
  | "home"
  | "chat"
  | "learning"
  | "grammarHome"
  | "grammarLevel"
  | "practiceModes"
  | "pictureDescription"
  | "listeningPictureGame"
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
  grammarFocus?: GrammarFocus;
  picturePromptContext?: PicturePromptContext;
}

export interface GrammarFocus {
  cefrLevel: GrammarLevel;
  grammarTopic: string;
  expectedStructures: string[];
  speakingPrompt: string;
}

export interface PicturePrompt {
  id: string;
  level: TopicLevel;
  title: string;
  imageSource: PictureImageKey;
  sceneDescriptionForAI: string;
  learnerInstructions: string[];
  suggestedVocabulary: string[];
  targetGrammar: string[];
  speakingQuestions: string[];
  detailChecklist: string[];
  possibleInferences: string[];
  commonMistakes: string[];
  sampleAnswer: string;
}

export interface PicturePromptContext {
  mode: "picture_description";
  promptId: string;
  title: string;
  imageSource: PictureImageKey;
  sceneDescriptionForAI: string;
  learnerInstructions: string[];
  suggestedVocabulary: string[];
  targetGrammar: string[];
  speakingQuestions: string[];
  detailChecklist: string[];
  possibleInferences: string[];
  commonMistakes: string[];
  sampleAnswer: string;
}

export interface ListeningGameItem {
  id: string;
  level: TopicLevel;
  correctPictureId: string;
  optionPictureIds: string[];
  audioText: string;
  transcript: string;
  keyDetails: string[];
  distractorExplanation: string[];
  vocabulary: string[];
  explanation: string;
  targetGrammar: string[];
}

export interface ListeningGameResult {
  id: string;
  createdAt: string;
  practiceType: "listening_picture_match";
  level: TopicLevel;
  itemId: string;
  correctPictureId: string;
  selectedPictureId: string;
  isCorrect: boolean;
  score: number;
  transcript: string;
  keyDetails: string[];
  distractorExplanation: string[];
  vocabulary: string[];
  explanation: string;
  targetGrammar: string[];
}

export interface RecordedMedia {
  uri: string;
  type: RecordingType;
  durationSeconds: number;
  expectedDurationSeconds?: number;
  mimeType: string;
}

export interface SpeakingScores {
  grammar: number;
  vocabulary: number;
  fluency: number;
  pronunciation?: number;
  coherence: number;
  naturalness?: number;
  overall: number;
}

export interface WordFrequency {
  word: string;
  count: number;
}

export interface SpeakingAnalytics {
  estimatedCEFRLevel: string;
  wordsPerMinute: number;
  fillerWords: WordFrequency[];
  repeatedWords: WordFrequency[];
  averageSentenceLength: number;
  transcriptWordCount: number;
  responseDurationSeconds: number;
  availableDurationSeconds?: number;
  clarityNotesTR: string;
}

export interface ErrorPattern {
  id: string;
  category: ErrorPatternCategory;
  label: string;
  explanationTR: string;
  exampleOriginal: string;
  exampleCorrected: string;
  severity: ErrorPatternSeverity;
  isTurkishTransferError: boolean;
}

export interface Mistake {
  id: string;
  originalSentence: string;
  problem: string;
  correctVersion: string;
  explanation: string;
  /**
   * Structured classification of this individual mistake, filled in directly by the
   * backend model so errorPatterns[] can be derived mechanically from mistakes[] instead
   * of being independently (and inconsistently) re-classified on the client.
   * Optional for backward compatibility with records analyzed before this field existed.
   */
  category?: ErrorPatternCategory;
  severity?: ErrorPatternSeverity;
  isTurkishTransferError?: boolean;
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

export interface GrammarFocusFeedback {
  expectedGrammarUsed: string;
  missedGrammarOpportunities: string[];
  tenseAccuracy: string;
  betterSentenceAlternatives: string[];
  levelAppropriateSuggestions: string[];
  /**
   * Whether the learner actually used the targeted grammar structure in this attempt.
   * "not_applicable" means no grammar focus was targeted (e.g. general/picture-description
   * practice). Optional for backward compatibility with records analyzed before this field
   * existed; scoring treats a missing value the same as "not_applicable" (no penalty).
   */
  targetStructureUsage?: "not_applicable" | "not_used" | "used_with_errors" | "used_correctly";
}

export type TopicRelevanceLevel = "off_topic" | "partially_relevant" | "fully_relevant";

export interface TopicRelevance {
  addressedTopic: TopicRelevanceLevel;
  explanation: string;
}

export interface ImprovementPlan {
  whatWentWell: string;
  topProblems: string[];
  tomorrowFocus: string;
  sentencePatterns: string[];
  homework: string;
}

export interface PersonalizedExercise {
  title: string;
  goal: string;
  instructions: string;
  examples: string[];
}

export interface DailyStudyPlan {
  focusAreas: string[];
  grammarTask: string;
  vocabularyTask: string;
  pronunciationFluencyTask: string;
  retrySpeakingPrompt: string;
  estimatedDurationMinutes: number;
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
  speakingAnalytics?: SpeakingAnalytics;
  errorPatterns?: ErrorPattern[];
  progressTags?: ProgressTag[];
  repeatedMistakeCandidates?: ErrorPattern[];
  grammarFocusFeedback?: GrammarFocusFeedback;
  /**
   * Independent judgment of whether the learner actually addressed the assigned topic/prompt,
   * separate from grammar/fluency quality. Optional for backward compatibility with records
   * analyzed before this field existed; scoring treats a missing value as "fully_relevant"
   * (no penalty).
   */
  topicRelevance?: TopicRelevance;
  improvementPlan: ImprovementPlan;
  personalizedExercises?: PersonalizedExercise[];
  dailyStudyPlan?: DailyStudyPlan;
  generatedBy: "mock" | "backend" | "manual-prompt";
  createdAt: string;
  /**
   * Which analysis path actually produced this result: "audio" means the model listened to
   * the real recording directly; "transcript" means it analyzed text only (either because
   * audio analysis is disabled, no audio was available, or it was attempted and failed).
   * Always present on records analyzed by the backend after this field was introduced;
   * optional/absent for older stored records analyzed before it existed.
   */
  analysisSource?: "audio" | "transcript";
  /**
   * True only when the backend actually attempted direct audio-based analysis and it
   * failed, so it fell back to the transcript-only path. Absent/false means either
   * audio analysis was not attempted (disabled, or no audio available) or it succeeded.
   */
  audioAnalysisFallback?: boolean;
}

export interface SpeakingRecord {
  id: string;
  createdAt: string;
  practiceType?: PracticeType;
  grammarGroup?: {
    level: GrammarLevel;
    grammarTopic: string;
    challengeId?: string;
  };
  topic: Topic;
  media: RecordedMedia;
  transcript: string;
  correctedVersion: string;
  analysis: AnalysisResult;
  scores: SpeakingScores;
  speakingAnalytics?: SpeakingAnalytics;
  errorPatterns?: ErrorPattern[];
  tags?: ProgressTag[];
  pdfReportUri?: string;
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
  themeMode: ThemeMode;
}
