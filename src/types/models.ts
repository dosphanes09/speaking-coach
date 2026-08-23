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
  | "dailyLesson"
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

/**
 * Everything the daily lesson generator knows about the learner. Interests, weak points and
 * context grow over time from the learner's own sessions (see learnerProfileRepository), and
 * they are the difference between a generic lesson and one that feels written for them.
 */
export interface LearnerProfile {
  level: TopicLevel;
  nativeLanguage: string;
  interests: string[];
  goal: string;
  weakPoints: string[];
  context: string[];
  updatedAt: string;
}

/**
 * One narrow direction the lesson could take, offered before the lesson is written. A bare
 * "Batman" becomes four specific choices, so the learner steers the lesson to what they were
 * actually curious about instead of getting a general overview.
 */
export interface LessonAngle {
  /** Short, in English — this becomes the lesson's direction. */
  title: string;
  /** One sentence in the learner's own language, so choosing takes no effort. */
  description: string;
}

/** The four CEFR levels the lesson generator is calibrated for. */
export const LESSON_LEVELS = ["A2", "B1", "B2", "C1"] as const;

export type LessonLevel = (typeof LESSON_LEVELS)[number];

export interface LessonVocabularyItem {
  word: string;
  pos: string;
  definition: string;
  translation: string;
  example: string;
}

export interface LessonPronunciationWord {
  word: string;
  respelling: string;
  stress: string;
  l1Error: string;
}

export interface LessonCollocation {
  phrase: string;
  meaning: string;
  register: string;
}

/**
 * Part 1 of a lesson: the topic and the text everything else is built from. Shown to the
 * learner as soon as it arrives, while part 2 is still generating.
 */
export interface DailyLessonCore {
  topicSlug: string;
  title: string;
  subtitle: string;
  level: string;
  estimatedMinutes: number;
  warmUp: string[];
  reading: {
    /** Target words are wrapped in **double asterisks**; parseMarkedText renders them. */
    text: string;
    wordCount: number;
  };
  vocabulary: LessonVocabularyItem[];
  pronunciation: {
    words: LessonPronunciationWord[];
    shadowing: string[];
  };
  collocations: LessonCollocation[];
}

export interface LessonGrammarFormRow {
  type: string;
  pattern: string;
  example: string;
}

export interface LessonGrammarUsage {
  context: string;
  explanation: string;
  example: string;
}

export interface LessonGrammarError {
  wrong: string;
  right: string;
  why: string;
}

export interface LessonGrammar {
  structure: string;
  coreIdea: string;
  form: LessonGrammarFormRow[];
  usage: LessonGrammarUsage[];
  commonErrors: LessonGrammarError[];
}

export interface LessonComprehensionQuestion {
  question: string;
  type: "open" | "mcq";
  options: string[];
}

export interface LessonMatchingPair {
  left: string;
  right: string;
}

export interface LessonGrammarGapFillItem {
  sentence: string;
  verb: string;
}

export interface LessonTransformationItem {
  prompt: string;
  cue: string;
}

export interface LessonExercises {
  comprehension: LessonComprehensionQuestion[];
  matching: LessonMatchingPair[];
  gapFillVocab: {
    wordBank: string[];
    items: string[];
  };
  grammarPractice: {
    gapFill: LessonGrammarGapFillItem[];
    transformation: LessonTransformationItem[];
  };
  errorCorrection: string[];
}

export interface LessonSpeakingTask {
  number: number;
  duration: string;
  instruction: string;
  targetPhrases: string[];
  /** What the recorded attempt is scored against; fed into the existing speech analysis. */
  assess: {
    vocabulary: string[];
    grammar: string;
  };
  /** Only filled in for the roleplay task; empty strings on the others. */
  roleplay: {
    scenario: string;
    learnerRole: string;
    appRole: string;
    goals: string[];
  };
}

export interface LessonAnswerKey {
  comprehension: Array<{ answer: string; note: string }>;
  gapFillVocab: string[];
  grammarPractice: {
    gapFill: string[];
    transformation: string[];
  };
  errorCorrection: Array<{ corrected: string; note: string }>;
}

/** Part 2 of a lesson: everything derived from the finished reading text. */
export interface DailyLessonPractice {
  grammar: LessonGrammar;
  exercises: LessonExercises;
  speakingTasks: LessonSpeakingTask[];
  followUpQuestions: string[];
  answerKey: LessonAnswerKey;
  profileQuestion: string;
}

export interface DailyLesson {
  id: string;
  /** YYYY-MM-DD, so one lesson per calendar day is generated and then reused. */
  dateKey: string;
  createdAt: string;
  level: TopicLevel;
  todayContext: string;
  /** The direction the learner picked; absent when they let the app choose. */
  angle?: LessonAngle;
  core: DailyLessonCore;
  practice?: DailyLessonPractice;
  /** Verification findings the backend could not fix; shown honestly instead of hidden. */
  warnings: string[];
  /** The learner's own answer to the lesson's profile question, once they give one. */
  profileAnswer?: string;
}
