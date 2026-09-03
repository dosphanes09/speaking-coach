import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { AppColors, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { RhetoricHomeScreen } from "@/screens/rhetoric/RhetoricHomeScreen";
import { RhetoricTopicScreen } from "@/screens/rhetoric/RhetoricTopicScreen";
import { RhetoricPrepareScreen } from "@/screens/rhetoric/RhetoricPrepareScreen";
import { RhetoricRecordScreen } from "@/screens/rhetoric/RhetoricRecordScreen";
import { RhetoricSelfScoreScreen } from "@/screens/rhetoric/RhetoricSelfScoreScreen";
import { RhetoricAnalyzingScreen } from "@/screens/rhetoric/RhetoricAnalyzingScreen";
import { RhetoricResultScreen } from "@/screens/rhetoric/RhetoricResultScreen";
import { RhetoricHistoryScreen } from "@/screens/rhetoric/RhetoricHistoryScreen";
import { RhetoricProgressScreen } from "@/screens/rhetoric/RhetoricProgressScreen";
import {
  deleteRhetoricRecord,
  listRhetoricRecords,
  saveRhetoricRecord
} from "@/services/storage/rhetoricRepository";
import { deleteMedia } from "@/services/media/mediaStorage";
import { deleteRhetoricPdf } from "@/services/pdf/rhetoricReportPdf";
import { findRetakeSource } from "@/services/rhetoric/rhetoricStats";
import { RhetoricRecord, RhetoricRoute } from "@/types/rhetoric";

interface RhetoricAppProps {
  onSwitchModule: () => void;
}

/**
 * The Turkish rhetoric module's own navigation tree.
 *
 * Kept in its own component rather than folded into App.tsx's switch: the two
 * modules share no screens, no record type and no scoring scale, so a single
 * combined router would only be a longer switch statement with two unrelated
 * halves. This way the English path is literally untouched by anything here.
 */
export function RhetoricApp({ onSwitchModule }: RhetoricAppProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [route, setRoute] = useState<RhetoricRoute>({ name: "home" });
  const [records, setRecords] = useState<RhetoricRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadRecords = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError("");
    try {
      setRecords(await listRhetoricRecords());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Kayıtlar yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  // Read through a ref so the hardware back button subscribes once instead of
  // re-subscribing on every navigation, while still acting on the current screen.
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

  async function handleAnalysisComplete(record: RhetoricRecord): Promise<void> {
    const nextRecords = await saveRhetoricRecord(record);
    setRecords(nextRecords);
    setRoute({ name: "result", record });
  }

  async function handleDelete(record: RhetoricRecord): Promise<void> {
    // Both files, and the exported report if there is one. Leaving media behind
    // would quietly fill the app's data folder with recordings nothing points at.
    await deleteMedia(record.recording.uri);
    if (record.recording.audioUri !== record.recording.uri) {
      await deleteMedia(record.recording.audioUri);
    }
    await deleteRhetoricPdf(record.pdfReportUri);

    const nextRecords = await deleteRhetoricRecord(record.id);
    setRecords(nextRecords);
    setRoute({ name: "history" });
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>Hitabet modülü yükleniyor…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{loadError}</Text>
        <AppButton label="Tekrar dene" onPress={() => void loadRecords()} />
      </View>
    );
  }

  switch (route.name) {
    case "home":
      return (
        <RhetoricHomeScreen
          records={records}
          onStartPrepared={() => setRoute({ name: "topic", mode: "prepared" })}
          onStartImpromptu={() => setRoute({ name: "topic", mode: "impromptu" })}
          onHistory={() => setRoute({ name: "history" })}
          onProgress={() => setRoute({ name: "progress" })}
          onSwitchModule={onSwitchModule}
        />
      );

    case "topic":
      return (
        <RhetoricTopicScreen
          mode={route.mode}
          records={records}
          retakeOf={route.retakeOf}
          onBack={goBack}
          onStart={(topic, targetDurationSeconds) =>
            setRoute({
              name: "prepare",
              topic,
              mode: route.mode,
              targetDurationSeconds,
              retakeOf: route.retakeOf
            })
          }
        />
      );

    case "prepare":
      return (
        <RhetoricPrepareScreen
          topic={route.topic}
          mode={route.mode}
          targetDurationSeconds={route.targetDurationSeconds}
          onBack={goBack}
          onReady={(preparationNotes) =>
            setRoute({
              name: "record",
              topic: route.topic,
              mode: route.mode,
              targetDurationSeconds: route.targetDurationSeconds,
              preparationNotes,
              retakeOf: route.retakeOf
            })
          }
        />
      );

    case "record":
      return (
        <RhetoricRecordScreen
          topic={route.topic}
          targetDurationSeconds={route.targetDurationSeconds}
          preparationNotes={route.preparationNotes}
          onBack={goBack}
          onRecorded={(recording) =>
            setRoute({
              name: "selfScore",
              topic: route.topic,
              mode: route.mode,
              targetDurationSeconds: route.targetDurationSeconds,
              preparationNotes: route.preparationNotes,
              recording,
              retakeOf: route.retakeOf
            })
          }
        />
      );

    case "selfScore":
      return (
        <RhetoricSelfScoreScreen
          topic={route.topic}
          recording={route.recording}
          onBack={goBack}
          onSubmit={(selfAssessment) =>
            setRoute({
              name: "analyzing",
              topic: route.topic,
              mode: route.mode,
              targetDurationSeconds: route.targetDurationSeconds,
              preparationNotes: route.preparationNotes,
              recording: route.recording,
              selfAssessment,
              retakeOf: route.retakeOf
            })
          }
        />
      );

    case "analyzing":
      return (
        <RhetoricAnalyzingScreen
          topic={route.topic}
          mode={route.mode}
          targetDurationSeconds={route.targetDurationSeconds}
          preparationNotes={route.preparationNotes}
          recording={route.recording}
          selfAssessment={route.selfAssessment}
          retakeOfRecordId={route.retakeOf?.id}
          onBack={goBack}
          onComplete={(record) => void handleAnalysisComplete(record)}
        />
      );

    case "result":
      return (
        <RhetoricResultScreen
          record={route.record}
          previousAttempt={findRetakeSource(route.record, records)}
          isSaved
          onBack={() => setRoute({ name: "home" })}
          onHome={() => setRoute({ name: "home" })}
          onRetakeTopic={() =>
            setRoute({ name: "topic", mode: route.record.mode, retakeOf: route.record })
          }
        />
      );

    case "detail":
      return (
        <RhetoricResultScreen
          record={route.record}
          previousAttempt={findRetakeSource(route.record, records)}
          isSaved
          onBack={() => setRoute({ name: "history" })}
          onHome={() => setRoute({ name: "home" })}
          onRetakeTopic={() =>
            setRoute({ name: "topic", mode: route.record.mode, retakeOf: route.record })
          }
          onDelete={() => void handleDelete(route.record)}
        />
      );

    case "history":
      return (
        <RhetoricHistoryScreen
          records={records}
          onBack={goBack}
          onSelect={(record) => setRoute({ name: "detail", record })}
        />
      );

    case "progress":
      return <RhetoricProgressScreen records={records} onBack={goBack} />;

    default:
      return (
        <RhetoricHomeScreen
          records={records}
          onStartPrepared={() => setRoute({ name: "topic", mode: "prepared" })}
          onStartImpromptu={() => setRoute({ name: "topic", mode: "impromptu" })}
          onHistory={() => setRoute({ name: "history" })}
          onProgress={() => setRoute({ name: "progress" })}
          onSwitchModule={onSwitchModule}
        />
      );
  }
}

/**
 * Where "back" goes from each screen. Returning null means there is nowhere to
 * go, which lets the Android hardware back button fall through to the OS.
 *
 * Note that "analyzing" goes back to "selfScore" rather than to the recording:
 * the recording is already made, and sending the speaker back to re-record it
 * after a failed upload would throw away work they cannot get back.
 */
function getBackRoute(route: RhetoricRoute): RhetoricRoute | null {
  switch (route.name) {
    case "home":
      return null;
    case "topic":
    case "history":
    case "progress":
      return { name: "home" };
    case "prepare":
      return { name: "topic", mode: route.mode, retakeOf: route.retakeOf };
    case "record":
      return {
        name: "prepare",
        topic: route.topic,
        mode: route.mode,
        targetDurationSeconds: route.targetDurationSeconds,
        retakeOf: route.retakeOf
      };
    case "selfScore":
      return {
        name: "record",
        topic: route.topic,
        mode: route.mode,
        targetDurationSeconds: route.targetDurationSeconds,
        preparationNotes: route.preparationNotes,
        retakeOf: route.retakeOf
      };
    case "analyzing":
      return {
        name: "selfScore",
        topic: route.topic,
        mode: route.mode,
        targetDurationSeconds: route.targetDurationSeconds,
        preparationNotes: route.preparationNotes,
        recording: route.recording,
        retakeOf: route.retakeOf
      };
    case "result":
      return { name: "home" };
    case "detail":
      return { name: "history" };
    default:
      return { name: "home" };
  }
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.md,
      gap: spacing.md
    },
    centeredText: {
      ...typography.h2,
      color: colors.ink,
      textAlign: "center"
    },
    errorText: {
      ...typography.body,
      color: colors.danger,
      textAlign: "center"
    }
  });
}
