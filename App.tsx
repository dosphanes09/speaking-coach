import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AppButton } from "@/components/AppButton";
import { AppRoute } from "@/types/routes";
import { AppSettings, SpeakingRecord, Topic } from "@/types/models";
import { colors, spacing } from "@/theme/colors";
import { getDailyTopic, getRandomTopic } from "@/data/topics";
import { defaultSettings, loadSettings, saveSettings } from "@/services/storage/settingsRepository";
import { deleteRecord, listRecords, saveRecord } from "@/services/storage/recordsRepository";
import { deleteMedia } from "@/services/media/mediaStorage";
import { HomeScreen } from "@/screens/HomeScreen";
import { ThinkingScreen } from "@/screens/ThinkingScreen";
import { RecordingScreen } from "@/screens/RecordingScreen";
import { TranscriptScreen } from "@/screens/TranscriptScreen";
import { AnalysisScreen } from "@/screens/AnalysisScreen";
import { HistoryScreen } from "@/screens/HistoryScreen";
import { RecordDetailScreen } from "@/screens/RecordDetailScreen";
import { ProgressScreen } from "@/screens/ProgressScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { ChatScreen } from "@/screens/ChatScreen";

export default function App(): React.JSX.Element {
  const [route, setRoute] = useState<AppRoute>({ name: "home" });
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [records, setRecords] = useState<SpeakingRecord[]>([]);
  const [topicOverride, setTopicOverride] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const activeTopic = useMemo(
    () => topicOverride ?? getDailyTopic(settings.targetLevel),
    [settings.targetLevel, topicOverride]
  );

  useEffect(() => {
    async function boot(): Promise<void> {
      try {
        const [loadedSettings, loadedRecords] = await Promise.all([
          loadSettings(),
          listRecords()
        ]);
        setSettings(loadedSettings);
        setRecords(loadedRecords);
      } catch (caughtError) {
        setLoadError(caughtError instanceof Error ? caughtError.message : "App could not be loaded.");
      } finally {
        setIsLoading(false);
      }
    }

    void boot();
  }, []);

  async function handleSaveRecord(record: SpeakingRecord): Promise<void> {
    const nextRecords = await saveRecord(record);
    setRecords(nextRecords);
  }

  async function handleDeleteRecord(record: SpeakingRecord): Promise<void> {
    await deleteMedia(record.media.uri);
    const nextRecords = await deleteRecord(record.id);
    setRecords(nextRecords);
    setRoute({ name: "history" });
  }

  async function handleSaveSettings(nextSettings: AppSettings): Promise<AppSettings> {
    const savedSettings = await saveSettings(nextSettings);
    setSettings(savedSettings);
    setTopicOverride(null);
    return savedSettings;
  }

  function showNewTopic(): void {
    setTopicOverride(getRandomTopic(settings.targetLevel, activeTopic.id));
  }

  function renderHome(): React.JSX.Element {
    return (
      <HomeScreen
        topic={activeTopic}
        records={records}
        onStartThinking={() => setRoute({ name: "thinking", topic: activeTopic })}
        onNewTopic={showNewTopic}
        onChat={() => setRoute({ name: "chat" })}
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
            onBack={() => setRoute({ name: "home" })}
          />
        );
      case "thinking":
        return (
          <ThinkingScreen
            topic={route.topic}
            onBack={() => setRoute({ name: "home" })}
            onStartRecording={() => setRoute({ name: "recording", topic: route.topic })}
          />
        );
      case "recording":
        return (
          <RecordingScreen
            topic={route.topic}
            onBack={() => setRoute({ name: "thinking", topic: route.topic })}
            onRecorded={(media) => setRoute({ name: "transcript", topic: route.topic, media })}
          />
        );
      case "transcript":
        return (
          <TranscriptScreen
            topic={route.topic}
            media={route.media}
            settings={settings}
            onBack={() => setRoute({ name: "recording", topic: route.topic })}
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
            onBack={() => setRoute({ name: "transcript", topic: route.topic, media: route.media })}
            onHome={() => setRoute({ name: "home" })}
            onSaveRecord={handleSaveRecord}
          />
        );
      case "history":
        return (
          <HistoryScreen
            records={records}
            onBack={() => setRoute({ name: "home" })}
            onSelectRecord={(record) => setRoute({ name: "recordDetail", record })}
          />
        );
      case "recordDetail":
        return (
          <RecordDetailScreen
            record={route.record}
            onBack={() => setRoute({ name: "history" })}
            onDelete={handleDeleteRecord}
          />
        );
      case "progress":
        return <ProgressScreen records={records} onBack={() => setRoute({ name: "home" })} />;
      case "settings":
        return (
          <SettingsScreen
            settings={settings}
            onBack={() => setRoute(route.returnTo ?? { name: "home" })}
            onSave={handleSaveSettings}
          />
        );
      default:
        return renderHome();
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingText}>Daily Speaking Coach yukleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingScreen}>
          <Text style={styles.errorText}>{loadError}</Text>
          <AppButton label="Tekrar Dene" onPress={() => setLoadError("")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {renderRoute()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  loadingScreen: {
    flex: 1,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md
  },
  loadingText: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center"
  }
});
