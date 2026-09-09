import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { AppColors, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
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
import { DrillHomeScreen } from "@/screens/drill/DrillHomeScreen";
import { DrillRecordScreen } from "@/screens/drill/DrillRecordScreen";
import { DrillAnalyzingScreen } from "@/screens/drill/DrillAnalyzingScreen";
import { DrillResultScreen } from "@/screens/drill/DrillResultScreen";
import { DrillHistoryScreen } from "@/screens/drill/DrillHistoryScreen";
import {
  deleteRhetoricRecord,
  listRhetoricRecords,
  saveRhetoricRecord
} from "@/services/storage/rhetoricRepository";
import { deleteMedia } from "@/services/media/mediaStorage";
import { deleteRhetoricPdf } from "@/services/pdf/rhetoricReportPdf";
import { findRetakeSource } from "@/services/rhetoric/rhetoricStats";
import { computeDrillStats } from "@/services/rhetoric/drillStats";
import { listDrillRecords, saveDrillRecord } from "@/services/storage/drillRepository";
import { pickDrillPrompt } from "@/data/drillPrompts";
import { getRecentDrillPromptIds } from "@/services/storage/drillRepository";
import { DrillRecord, DrillRoute } from "@/types/drill";
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
  // The drills live inside this module but on their own stack: they share the
  // Turkish interface and nothing else — not the record type, not the scale,
  // not the history. A single route union would have merged two unrelated flows.
  const [drillRoute, setDrillRoute] = useState<DrillRoute | null>(null);
  const [drillRecords, setDrillRecords] = useState<DrillRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadRecords = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [rhetoric, drills] = await Promise.all([listRhetoricRecords(), listDrillRecords()]);
      setRecords(rhetoric);
      setDrillRecords(drills);
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

  const drillRouteRef = useRef(drillRoute);
  drillRouteRef.current = drillRoute;

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      // The drill stack is on top when it is open, so it gets the button first.
      if (drillRouteRef.current) {
        setDrillRoute(getDrillBackRoute(drillRouteRef.current));
        return true;
      }

      const backRoute = getBackRoute(routeRef.current);
      if (!backRoute) {
        return false;
      }
      setRoute(backRoute);
      return true;
    });

    return () => subscription.remove();
  }, []);

  async function handleDrillComplete(record: DrillRecord): Promise<void> {
    const nextRecords = await saveDrillRecord(record);
    setDrillRecords(nextRecords);
    setDrillRoute({ name: "result", record });
  }

  function startDrill(kind?: DrillRecord["prompt"]["kind"]): void {
    setDrillRoute({
      name: "record",
      prompt: pickDrillPrompt({ kind, recentPromptIds: getRecentDrillPromptIds(drillRecords) })
    });
  }

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

  // Rendered before the rhetoric switch because the drill stack sits on top of
  // whatever screen opened it, and returning from it lands back there.
  if (drillRoute) {
    switch (drillRoute.name) {
      case "home":
        return (
          <DrillHomeScreen
            records={drillRecords}
            onBack={() => setDrillRoute(null)}
            onStart={(prompt) => setDrillRoute({ name: "record", prompt })}
            onHistory={() => setDrillRoute({ name: "history" })}
          />
        );

      case "record":
        return (
          <DrillRecordScreen
            prompt={drillRoute.prompt}
            onBack={() => setDrillRoute({ name: "home" })}
            onRecorded={(audioUri, mimeType, durationSeconds) =>
              setDrillRoute({
                name: "analyzing",
                prompt: drillRoute.prompt,
                audioUri,
                mimeType,
                durationSeconds
              })
            }
          />
        );

      case "analyzing":
        return (
          <DrillAnalyzingScreen
            prompt={drillRoute.prompt}
            audioUri={drillRoute.audioUri}
            mimeType={drillRoute.mimeType}
            durationSeconds={drillRoute.durationSeconds}
            onBack={() => setDrillRoute({ name: "home" })}
            onComplete={(record) => void handleDrillComplete(record)}
          />
        );

      case "history":
        return <DrillHistoryScreen records={drillRecords} onBack={() => setDrillRoute({ name: "home" })} />;

      case "result":
        return (
          <DrillResultScreen
            record={drillRoute.record}
            repsToday={computeDrillStats(drillRecords).repsToday}
            onAgain={() => setDrillRoute({ name: "record", prompt: drillRoute.record.prompt })}
            onAnother={() => startDrill(drillRoute.record.prompt.kind)}
            onHome={() => setDrillRoute({ name: "home" })}
          />
        );

      default:
        return (
          <DrillHomeScreen
            records={drillRecords}
            onBack={() => setDrillRoute(null)}
            onStart={(prompt) => setDrillRoute({ name: "record", prompt })}
            onHistory={() => setDrillRoute({ name: "history" })}
          />
        );
    }
  }

  switch (route.name) {
    case "home":
      return (
        <RhetoricHomeScreen
          records={records}
          onStartPrepared={() => setRoute({ name: "topic", mode: "prepared" })}
          onStartImpromptu={() => setRoute({ name: "topic", mode: "impromptu" })}
          onDrills={() => setDrillRoute({ name: "home" })}
          drillRepsToday={computeDrillStats(drillRecords).repsToday}
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
          onDrills={() => setDrillRoute({ name: "home" })}
          drillRepsToday={computeDrillStats(drillRecords).repsToday}
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
/**
 * Back within the drill stack. Returning null closes it entirely and lands on
 * whatever rhetoric screen was underneath.
 */
function getDrillBackRoute(route: DrillRoute): DrillRoute | null {
  switch (route.name) {
    case "home":
      return null;
    case "record":
    case "analyzing":
    case "result":
    case "history":
      return { name: "home" };
    default:
      return null;
  }
}

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

function buildStyles(colors: AppColors) {
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

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
