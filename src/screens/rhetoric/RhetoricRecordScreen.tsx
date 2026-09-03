import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { CameraPreview } from "@/components/rhetoric/CameraPreview";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import {
  RhetoricRecorderHandle,
  isVideoRecordingSupported,
  startRhetoricRecording
} from "@/services/media/rhetoricRecorder";
import { RhetoricRecording, RhetoricTopic } from "@/types/rhetoric";

interface RhetoricRecordScreenProps {
  topic: RhetoricTopic;
  targetDurationSeconds: number;
  preparationNotes: string;
  onBack: () => void;
  onRecorded: (recording: RhetoricRecording) => void;
}

type RecordStatus = "idle" | "starting" | "recording" | "finished";

/** Hard stop, whatever the target: the backend refuses anything longer. */
const MAX_RECORDING_SECONDS = 300;

export function RhetoricRecordScreen({
  topic,
  targetDurationSeconds,
  preparationNotes,
  onBack,
  onRecorded
}: RhetoricRecordScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [status, setStatus] = useState<RecordStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [previewStream, setPreviewStream] = useState<unknown | null>(null);
  const [recording, setRecording] = useState<RhetoricRecording | null>(null);

  const handleRef = useRef<RhetoricRecorderHandle | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const stopInProgressRef = useRef(false);

  const hardLimit = Math.min(MAX_RECORDING_SECONDS, Math.max(targetDurationSeconds + 60, targetDurationSeconds));

  const stopRecording = useCallback(async () => {
    if (stopInProgressRef.current || !handleRef.current) {
      return;
    }
    stopInProgressRef.current = true;
    setIsBusy(true);

    try {
      const durationSeconds = startedAtRef.current
        ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        : 1;
      const result = await handleRef.current.stop(Math.min(durationSeconds, MAX_RECORDING_SECONDS));
      handleRef.current = null;
      setPreviewStream(null);
      setRecording(result);
      setElapsedSeconds(result.durationSeconds);
      setStatus("finished");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Kayıt durdurulamadı.");
      setStatus("idle");
    } finally {
      setIsBusy(false);
      stopInProgressRef.current = false;
      startedAtRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (status !== "recording") {
      return undefined;
    }

    const timer = setInterval(() => {
      const elapsed = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0;
      setElapsedSeconds(elapsed);
      if (elapsed >= hardLimit) {
        void stopRecording();
      }
    }, 250);

    return () => clearInterval(timer);
  }, [hardLimit, status, stopRecording]);

  // A recorder left running when the screen goes away would keep the camera
  // light on and hold the microphone.
  useEffect(() => {
    return () => {
      void handleRef.current?.cancel();
      handleRef.current = null;
    };
  }, []);

  async function beginRecording(): Promise<void> {
    if (status !== "idle" || isBusy) {
      return;
    }

    setError("");
    setIsBusy(true);
    setStatus("starting");

    try {
      const handle = await startRhetoricRecording();
      handleRef.current = handle;
      setPreviewStream(handle.previewStream);
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setStatus("recording");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Kayıt başlatılamadı.");
      setStatus("idle");
    } finally {
      setIsBusy(false);
    }
  }

  function discardAndRetry(): void {
    setRecording(null);
    setElapsedSeconds(0);
    setStatus("idle");
    setError("");
  }

  const remaining = Math.max(0, targetDurationSeconds - elapsedSeconds);
  const overTarget = elapsedSeconds > targetDurationSeconds;

  return (
    <View style={styles.screen}>
      <Header
        title="Kayıt"
        subtitle={isVideoRecordingSupported() ? "Kamera açık, ses ayrıca kaydediliyor" : "Ses kaydı"}
        onBack={onBack}
        backLabel="Geri"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.topicCard}>
          <Text style={styles.topicLabel}>KONU</Text>
          <Text style={styles.topicTitle}>{topic.title}</Text>
        </Card>

        {previewStream ? <CameraPreview stream={previewStream} /> : null}

        <Card style={[styles.timerCard, overTarget && styles.timerCardOver]}>
          <Text style={[styles.timer, overTarget && styles.timerOver]}>{formatClock(elapsedSeconds)}</Text>
          <Text style={styles.timerLabel}>
            {status === "recording"
              ? overTarget
                ? `hedefi ${formatClock(elapsedSeconds - targetDurationSeconds)} aştın`
                : `${formatClock(remaining)} kaldı`
              : `hedef ${formatClock(targetDurationSeconds)}`}
          </Text>
          {status === "recording" ? (
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Kayıtta</Text>
            </View>
          ) : null}
        </Card>

        {preparationNotes.trim() ? (
          <Card style={styles.notesCard}>
            <Text style={styles.notesLabel}>NOTLARIN</Text>
            <Text style={styles.notesBody}>{preparationNotes.trim()}</Text>
          </Card>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          {status === "idle" ? (
            <AppButton label="Kaydı başlat" onPress={beginRecording} loading={isBusy} icon="mic" />
          ) : null}
          {status === "starting" ? (
            <AppButton label="Kamera hazırlanıyor" onPress={() => undefined} loading disabled />
          ) : null}
          {status === "recording" ? (
            <AppButton label="Bitir" onPress={stopRecording} loading={isBusy} variant="danger" icon="square" />
          ) : null}
          {status === "finished" && recording ? (
            <>
              <AppButton label="Devam et" onPress={() => onRecorded(recording)} icon="arrow-right" />
              <AppButton label="Baştan çek" onPress={discardAndRetry} variant="ghost" icon="refresh-cw" />
            </>
          ) : null}
        </View>

        {status === "finished" && recording ? (
          <Text style={styles.savedNote}>
            {recording.hasVideo
              ? "Video bilgisayarında saklandı. Analize yalnızca ses gönderilecek."
              : "Ses kaydı alındı."}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: spacing.screen
    },
    content: {
      paddingBottom: spacing.xl,
      gap: spacing.sm
    },
    topicCard: {
      gap: spacing.xs,
      backgroundColor: colors.primaryTint,
      borderColor: colors.primary
    },
    topicLabel: {
      ...typography.label,
      color: colors.primaryDark
    },
    topicTitle: {
      ...typography.h2,
      color: colors.ink
    },
    timerCard: {
      alignItems: "center",
      gap: 2
    },
    timerCardOver: {
      borderColor: colors.warning,
      backgroundColor: colors.warningTint
    },
    timer: {
      fontSize: 52,
      lineHeight: 58,
      fontWeight: "800",
      color: colors.primaryDark
    },
    timerOver: {
      color: colors.warning
    },
    timerLabel: {
      ...typography.caption,
      color: colors.muted
    },
    liveRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.xs
    },
    liveDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.danger
    },
    liveText: {
      ...typography.bodyStrong,
      color: colors.danger
    },
    notesCard: {
      gap: spacing.xs,
      backgroundColor: colors.surfaceMuted
    },
    notesLabel: {
      ...typography.label,
      color: colors.muted
    },
    notesBody: {
      ...typography.bodyLarge,
      color: colors.ink
    },
    error: {
      ...typography.bodyStrong,
      color: colors.danger
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.md
    },
    savedNote: {
      ...typography.caption,
      color: colors.muted,
      textAlign: "center"
    }
  });
}
