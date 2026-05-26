import { AnalysisResult, RecordedMedia, SpeakingRecord, Topic } from "./models";

export type MainRoute =
  | { name: "home" }
  | { name: "chat" }
  | { name: "thinking"; topic: Topic }
  | { name: "recording"; topic: Topic }
  | { name: "transcript"; topic: Topic; media: RecordedMedia }
  | { name: "analysis"; topic: Topic; media: RecordedMedia; transcript: string; analysisResult: AnalysisResult }
  | { name: "history" }
  | { name: "recordDetail"; record: SpeakingRecord }
  | { name: "progress" };

export type AppRoute = MainRoute | { name: "settings"; returnTo?: MainRoute };
