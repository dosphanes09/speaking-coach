import { AnalysisResult, GrammarLevel, RecordedMedia, SpeakingRecord, Topic } from "./models";

export type MainRoute =
  | { name: "home" }
  | { name: "chat" }
  | { name: "learning" }
  | { name: "grammarHome" }
  | { name: "grammarLevel"; level: GrammarLevel }
  | { name: "practiceModes" }
  | { name: "pictureDescription" }
  | { name: "listeningPictureGame" }
  | { name: "thinking"; topic: Topic; thinkingNotes?: string }
  | { name: "recording"; topic: Topic; thinkingNotes: string }
  | { name: "transcript"; topic: Topic; media: RecordedMedia; thinkingNotes?: string }
  | { name: "analysis"; topic: Topic; media: RecordedMedia; transcript: string; analysisResult: AnalysisResult }
  | { name: "history" }
  | { name: "recordDetail"; record: SpeakingRecord }
  | { name: "progress" };

export type AppRoute = MainRoute | { name: "settings"; returnTo?: MainRoute };
