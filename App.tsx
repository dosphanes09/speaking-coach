import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AppButton } from "@/components/AppButton";
import { GrammarSpeakingChallenge, getGrammarLevelContent } from "@/data/grammarRoadmap";
import { AppRoute } from "@/types/routes";
import {
  AppSettings,
  GrammarLevel,
  ListeningGameResult,
  PicturePrompt,
  SpeakingRecord,
  Topic
} from "@/types/models";
import { darkColors, lightColors, loveColors, spacing, ThemeMode } from "@/theme/colors";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { getDailyTopic } from "@/data/topics";
import { defaultSettings, loadSettings, saveSettings } from "@/services/storage/settingsRepository";
import { deleteRecord, listRecords, saveRecord } from "@/services/storage/recordsRepository";
import { listListeningResults, saveListeningResult } from "@/services/storage/listeningResultsRepository";
import { resetAllLocalProgress } from "@/services/storage/resetProgressService";
import { deleteMedia } from "@/services/media/mediaStorage";
import { deleteSpeakingReportPdf } from "@/services/pdf/speakingReportPdf";
import {
  buildGrammarGroupFromTopic,
  getGrammarRecordLevel,
  getPracticeTypeFromTopic,
  isGrammarPracticeRecord,
  isPictureDescriptionRecord
} from "@/services/records/recordClassification";
import { HomeScreen } from "@/screens/HomeScreen";
import { GrammarHomeScreen } from "@/screens/GrammarHomeScreen";
import { GrammarLevelScreen } from "@/screens/GrammarLevelScreen";
import { PracticeModesScreen } from "@/screens/PracticeModesScreen";
import { PictureDescriptionScreen } from "@/screens/PictureDescriptionScreen";
import { ListeningPictureGameScreen } from "@/screens/ListeningPictureGameScreen";
import { ThinkingScreen } from "@/screens/ThinkingScreen";
import { RecordingScreen } from "@/screens/RecordingScreen";
import { TranscriptScreen } from "@/screens/TranscriptScreen";
import { AnalysisScreen } from "@/screens/AnalysisScreen";
import { HistoryScreen } from "@/screens/HistoryScreen";
import { RecordDetailScreen } from "@/screens/RecordDetailScreen";
import { ProgressScreen } from "@/screens/ProgressScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { LearningScreen } from "@/screens/LearningScreen";
import { DailyLessonScreen } from "@/screens/DailyLessonScreen";
import { hideAndroidNavigationBar } from "@/services/device/androidImmersiveMode";
import { AppBottomBar } from "@/components/AppBottomBar";
import { syncStreakReminder } from "@/services/notifications/streakReminderService";
import { calculateStreak } from "@/services/streak/streakService";
import { getRecommendedRecordingSeconds } from "@/utils/practiceTiming";

export default function App(): React.JSX.Element {
  const [route, setRoute] = useState<AppRoute>({ name: "home" });
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [records, setRecords] = useState<SpeakingRecord[]>([]);
  const [listeningResults, setListeningResults] = useState<ListeningGameResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const themeColors = getThemeColors(settings.themeMode);
  const statusBarStyle = settings.themeMode === "light" ? "dark" : "light";
  const freeSpeakingRecords = useMemo(
    () => records.filter((record) => !isGrammarPracticeRecord(record) && !isPictureDescriptionRecord(record)),
    [records]
  );
  const grammarRecords = useMemo(
    () => records.filter(isGrammarPracticeRecord),
    [records]
  );
  const recentlyAskedTopicIds = useMemo(() => getRecentlyAskedTopicIds(freeSpeakingRecords), [freeSpeakingRecords]);
  const recentGrammarChallengeIdsByLevel = useMemo(
    () => getRecentGrammarChallengeIdsByLevel(grammarRecords),
    [grammarRecords]
  );
  const streakSummary = useMemo(() => calculateStreak(records), [records]);

  const activeTopic = useMemo(
    () => getDailyTopic(settings.targetLevel, new Date(), recentlyAskedTopicIds),
    [recentlyAskedTopicIds, settings.targetLevel]
  );

  const loadAppData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError("");

    try {
      const [loadedSettings, loadedRecords, loadedListeningResults] = await Promise.all([
        loadSettings(),
        listRecords(),
        listListeningResults()
      ]);
      setSettings(loadedSettings);
      setRecords(loadedRecords);
      setListeningResults(loadedListeningResults);
    } catch (caughtError) {
      setLoadError(caughtError instanceof Error ? caughtError.message : "App could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const cleanupNavigationBar = hideAndroidNavigationBar();

    void loadAppData();

    return cleanupNavigationBar;
  }, [loadAppData]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    void syncStreakReminder(records);
  }, [isLoading, records]);

  // Read via a ref (not the `route` state directly) so this subscribes once
  // instead of re-subscribing on every navigation, while still always acting
  // on the current screen. Without this, the Android hardware back button has
  // nothing to intercept and the OS default (exit the app) runs instead.
  const routeRef = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      const backRoute = getBackRoute(routeRef.current);
      if (!backRoute) {
        return false;
      }

      setRoute(backRoute);
      return true;
    });

    return () => subscription.remove();
  }, []);

  function goBack(): void {
    const backRoute = getBackRoute(route);
    if (backRoute) {
      setRoute(backRoute);
    }
  }

  async function handleSaveRecord(record: SpeakingRecord): Promise<SpeakingRecord> {
    const normalizedRecord: SpeakingRecord = {
      ...record,
      practiceType: record.practiceType ?? getPracticeTypeFromTopic(record.topic),
      grammarGroup: record.grammarGroup ?? buildGrammarGroupFromTopic(record.topic)
    };
    const nextRecords = await saveRecord(normalizedRecord);
    setRecords(nextRecords);
    return normalizedRecord;
  }

  async function handleDeleteRecord(record: SpeakingRecord): Promise<void> {
    await deleteMedia(record.media.uri);
    await deleteSpeakingReportPdf(record.pdfReportUri);
    const nextRecords = await deleteRecord(record.id);
    setRecords(nextRecords);
    setRoute({ name: "history" });
  }

  async function handleSaveListeningResult(result: ListeningGameResult): Promise<void> {
    const nextResults = await saveListeningResult(result);
    setListeningResults(nextResults);
  }

  async function handleSaveSettings(nextSettings: AppSettings): Promise<AppSettings> {
    const savedSettings = await saveSettings(nextSettings);
    setSettings(savedSettings);
    return savedSettings;
  }

  async function handleResetProgress(): Promise<AppSettings> {
    const result = await resetAllLocalProgress();
    setSettings(result.settings);
    setRecords([]);
    setListeningResults([]);
    return result.settings;
  }

  function startGrammarSpeakingPractice(level: GrammarLevel, challenge: GrammarSpeakingChallenge): void {
    const grammarTopic: Topic = {
      id: `grammar-${level.toLowerCase()}-${challenge.id}`,
      title: challenge.prompt,
      level,
      category: "education",
      grammarFocus: {
        cefrLevel: level,
        grammarTopic: challenge.grammarTopic,
        expectedStructures: challenge.expectedStructures,
        speakingPrompt: challenge.prompt
      }
    };

    setRoute({ name: "thinking", topic: grammarTopic });
  }

  function startPictureDescriptionPractice(prompt: PicturePrompt): void {
    const pictureTopic: Topic = {
      id: `picture-${prompt.id}`,
      title: `Describe the picture: ${prompt.title}`,
      level: prompt.level,
      category: "story",
      picturePromptContext: {
        mode: "picture_description",
        promptId: prompt.id,
        title: prompt.title,
        imageSource: prompt.imageSource,
        sceneDescriptionForAI: prompt.sceneDescriptionForAI,
        learnerInstructions: prompt.learnerInstructions,
        suggestedVocabulary: prompt.suggestedVocabulary,
        targetGrammar: prompt.targetGrammar,
        speakingQuestions: prompt.speakingQuestions,
        detailChecklist: prompt.detailChecklist,
        possibleInferences: prompt.possibleInferences,
        commonMistakes: prompt.commonMistakes,
        sampleAnswer: prompt.sampleAnswer
      }
    };

    setRoute({ name: "thinking", topic: pictureTopic });
  }

  function renderHome(): React.JSX.Element {
    return (
      <HomeScreen
        records={freeSpeakingRecords}
        streakSummary={streakSummary}
        onStartThinking={() => setRoute({ name: "thinking", topic: activeTopic })}
        onDailyLesson={() => setRoute({ name: "dailyLesson" })}
        onChat={() => setRoute({ name: "chat" })}
        onLearning={() => setRoute({ name: "learning" })}
        onPracticeModes={() => setRoute({ name: "practiceModes" })}
        onHistory={() => setRoute({ name: "history" })}
        onProgress={() => setRoute({ name: "progress" })}
        onSettings={() => setRoute({ name: "settings" })}
      />
    );
  }

  function renderRoute(): React.JSX.Element {
    switch (route.name) {
      case "home":
        return renderHome();
      case "chat":
        return (
          <ChatScreen
            settings={settings}
            onBack={goBack}
          />
        );
      case "learning":
        return (
          <LearningScreen
            onBack={goBack}
            onGrammarRoadmap={() => setRoute({ name: "grammarHome" })}
          />
        );
      case "dailyLesson":
        return (
          <DailyLessonScreen
            settings={settings}
            onBack={goBack}
            // A lesson speaking task enters the same thinking -> recording -> analysis flow as
            // every other practice, so it is scored, saved and charted like the rest.
            onStartSpeakingTask={(topic) => setRoute({ name: "thinking", topic })}
          />
        );
      case "grammarHome":
        return (
          <GrammarHomeScreen
            grammarRecords={grammarRecords}
            onBack={goBack}
            onSelectLevel={(level) => setRoute({ name: "grammarLevel", level })}
          />
        );
      case "grammarLevel":
        return (
          <GrammarLevelScreen
            levelContent={getGrammarLevelContent(route.level)}
            recentChallengeIds={recentGrammarChallengeIdsByLevel[route.level]}
            levelRecords={grammarRecords.filter((record) => getGrammarRecordLevel(record) === route.level)}
            onBack={goBack}
            onStartChallenge={(challenge) => startGrammarSpeakingPractice(route.level, challenge)}
          />
        );
      case "practiceModes":
        return (
          <PracticeModesScreen
            onBack={goBack}
            onPictureDescription={() => setRoute({ name: "pictureDescription" })}
            onListeningGame={() => setRoute({ name: "listeningPictureGame" })}
          />
        );
      case "pictureDescription":
        return (
          <PictureDescriptionScreen
            targetLevel={settings.targetLevel}
            onBack={goBack}
            onStartPrompt={startPictureDescriptionPractice}
          />
        );
      case "listeningPictureGame":
        return (
          <ListeningPictureGameScreen
            targetLevel={settings.targetLevel}
            onBack={goBack}
            onSaveResult={handleSaveListeningResult}
            onDescribePicture={startPictureDescriptionPractice}
          />
        );
      case "thinking":
        return (
          <ThinkingScreen
            topic={route.topic}
            initialNotes={route.thinkingNotes}
            initialRecordingType={route.recordingType}
            onBack={goBack}
            onStartRecording={(thinkingNotes, recordingType) =>
              setRoute({ name: "recording", topic: route.topic, thinkingNotes, recordingType, autoStart: true })
            }
          />
        );
      case "recording":
        return (
          <RecordingScreen
            topic={route.topic}
            thinkingNotes={route.thinkingNotes}
            initialRecordingType={route.recordingType}
            autoStart={route.autoStart === true}
            recordingLimitSeconds={getRecommendedRecordingSeconds(route.topic)}
            onBack={goBack}
            onRecorded={(media) =>
              setRoute({ name: "transcript", topic: route.topic, media, thinkingNotes: route.thinkingNotes })
            }
          />
        );
      case "transcript":
        return (
          <TranscriptScreen
            topic={route.topic}
            media={route.media}
            settings={settings}
            onBack={goBack}
            onOpenSettings={() => setRoute({ name: "settings", returnTo: route })}
            onContinue={(transcript, analysisResult) =>
              setRoute({ name: "analysis", topic: route.topic, media: route.media, transcript, analysisResult })
            }
          />
        );
      case "analysis":
        return (
          <AnalysisScreen
            topic={route.topic}
            media={route.media}
            transcript={route.transcript}
            analysisResult={route.analysisResult}
            records={records}
            onBack={goBack}
            onHome={() => setRoute({ name: "home" })}
            onSaveRecord={handleSaveRecord}
          />
        );
      case "history":
        return (
          <HistoryScreen
            records={records}
            listeningResults={listeningResults}
            onBack={goBack}
            onSelectRecord={(record) => setRoute({ name: "recordDetail", record })}
          />
        );
      case "recordDetail":
        return (
          <RecordDetailScreen
            record={route.record}
            allRecords={records}
            onBack={goBack}
            onDelete={handleDeleteRecord}
            onUpdateRecord={handleSaveRecord}
            onRetryTopic={(topic) => setRoute({ name: "thinking", topic })}
            onSelectRecord={(record) => setRoute({ name: "recordDetail", record })}
          />
        );
      case "progress":
        return <ProgressScreen records={freeSpeakingRecords} onBack={goBack} />;
      case "settings":
        return (
          <SettingsScreen
            settings={settings}
            onBack={goBack}
            onSave={handleSaveSettings}
            onResetProgress={handleResetProgress}
          />
        );
      default:
        return renderHome();
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemeProvider mode={settings.themeMode}>
          <StatusBar style={statusBarStyle} hidden={Platform.OS === "android"} />
          <View style={[styles.loadingScreen, { backgroundColor: themeColors.background }]}>
            <Text style={[styles.loadingText, { color: themeColors.ink }]}>
              Loading Daily Speaking Coach...
            </Text>
          </View>
        </ThemeProvider>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemeProvider mode={settings.themeMode}>
          <StatusBar style={statusBarStyle} hidden={Platform.OS === "android"} />
          <View style={[styles.loadingScreen, { backgroundColor: themeColors.background }]}>
          <Text style={[styles.errorText, { color: themeColors.danger }]}>{loadError}</Text>
          <AppButton label="Try Again" onPress={() => void loadAppData()} />
          </View>
        </ThemeProvider>
      </SafeAreaView>
    );
  }

  return (
    <ThemeProvider mode={settings.themeMode}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <StatusBar style={statusBarStyle} hidden={Platform.OS === "android"} />
        <View style={styles.content}>{renderRoute()}</View>
        <AppBottomBar
          canGoBack={getBackRoute(route) !== null}
          isHome={route.name === "home"}
          onBack={goBack}
          onHome={() => setRoute({ name: "home" })}
          onSettings={() => setRoute({ name: "settings" })}
        />
      </SafeAreaView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // Leaves breathing room at the top on Android so a pulled-down
    // notification shade overlaps empty space instead of the app's own
    // header content.
    paddingTop: Platform.OS === "android" ? spacing.lg : 0
  },
  content: {
    flex: 1
  },
  loadingScreen: {
    flex: 1,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  errorText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center"
  }
});

/**
 * Where "back" goes for each screen. Used both by the Header back button
 * (via `goBack`) and the Android hardware back button, so the two can never
 * drift out of sync. Returning `null` means there is nowhere to go back to —
 * only "home" does this, letting the hardware back button fall through to
 * the OS default (exit the app) exactly where a user would expect that.
 */
function getBackRoute(route: AppRoute): AppRoute | null {
  switch (route.name) {
    case "home":
      return null;
    case "chat":
    case "learning":
    case "dailyLesson":
    case "practiceModes":
    case "thinking":
    case "history":
    case "progress":
      return { name: "home" };
    case "grammarHome":
      return { name: "learning" };
    case "grammarLevel":
      return { name: "grammarHome" };
    case "pictureDescription":
    case "listeningPictureGame":
      return { name: "practiceModes" };
    case "recording":
      return {
        name: "thinking",
        topic: route.topic,
        thinkingNotes: route.thinkingNotes,
        recordingType: route.recordingType
      };
    case "transcript":
      return {
        name: "recording",
        topic: route.topic,
        thinkingNotes: route.thinkingNotes ?? "",
        recordingType: route.media.type
      };
    case "analysis":
      return { name: "transcript", topic: route.topic, media: route.media };
    case "recordDetail":
      return { name: "history" };
    case "settings":
      return route.returnTo ?? { name: "home" };
    default:
      return { name: "home" };
  }
}

function getRecentlyAskedTopicIds(records: SpeakingRecord[], days = 14): string[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return records
    .filter((record) => Date.parse(record.createdAt) >= cutoff)
    .map((record) => record.topic.id);
}

function getRecentGrammarChallengeIdsByLevel(records: SpeakingRecord[]): Record<GrammarLevel, string[]> {
  const result: Record<GrammarLevel, string[]> = {
    A1: [],
    A2: [],
    B1: [],
    B2: [],
    C1: [],
    C2: []
  };

  for (const topicId of getRecentlyAskedTopicIds(records)) {
    const match = /^grammar-(a1|a2|b1|b2|c1|c2)-(.+)$/i.exec(topicId);
    if (!match) {
      continue;
    }

    const level = match[1]!.toUpperCase() as GrammarLevel;
    result[level].push(match[2]!);
  }

  return result;
}

function getThemeColors(themeMode: ThemeMode) {
  if (themeMode === "dark") {
    return darkColors;
  }
  if (themeMode === "love") {
    return loveColors;
  }
  return lightColors;
}
