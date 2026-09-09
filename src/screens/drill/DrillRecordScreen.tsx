import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { proseWidth } from "@/theme/layout";
import { useThemeColors } from "@/theme/ThemeProvider";
import { RhetoricRecorderHandle, startRhetoricRecording } from "@/services/media/rhetoricRecorder";
import { drillKindLabels } from "@/data/drillPrompts";
import { DrillPrompt } from "@/types/drill";

interface DrillRecordScreenProps {
  prompt: DrillPrompt;
  onBack: () => void;
  onRecorded: (audioUri: string, mimeType: string, durationSeconds: number) => void;
}

type RecordStatus = "idle" | "starting" | "recording";

/**
 * One rep.
 *
 * Three differences from the rhetoric recorder, all of them deliberate:
 *
 * 1. Audio only. No camera prompt, no camera light — friction that would stop
 *    the third rep of the day from happening.
 * 2. The timer counts DOWN and stops itself. A drill has a fixed length; asking
 *    the speaker to decide when to stop turns a rep into a decision.
 * 3. No playback and no keeping. The recording goes straight to analysis and
 *    is discarded; a rep is not an artefact.
 */
export function DrillRecordScreen({ prompt, onBack, onRecorded }: DrillRecordScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [status, setStatus] = useState<RecordStatus>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(prompt.durationSeconds);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const handleRef = useRef<RhetoricRecorderHandle | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const stopInProgressRef = useRef(false);

  const stopRecording = useCallback(async () => {
    if (stopInProgressRef.current || !handleRef.current) {
      return;
    }
    stopInProgressRef.current = true;
    setIsBusy(true);

    try {
      const elapsed = startedAtRef.current
        ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        : 1;
      const recording = await handleRef.current.stop(Math.min(elapsed, prompt.durationSeconds + 15));
      handleRef.current = null;
      onRecorded(recording.audioUri, recording.mimeType, recording.durationSeconds);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Kayıt durdurulamadı.");
      setStatus("idle");
      setRemainingSeconds(prompt.durationSeconds);
    } finally {
      setIsBusy(false);
      stopInProgressRef.current = false;
      startedAtRef.current = null;
    }
  }, [onRecorded, prompt.durationSeconds]);

  useEffect(() => {
    if (status !== "recording") {
      return undefined;
    }

    // Driven from a timestamp rather than by decrementing a counter: a window
    // that gets throttled in the background would otherwise gain time.
    const timer = setInterval(() => {
      const elapsed = startedAtRef.current ? (Date.now() - startedAtRef.current) / 1000 : 0;
      const left = Math.max(0, prompt.durationSeconds - elapsed);
      setRemainingSeconds(Math.ceil(left));
      if (left <= 0) {
        void stopRecording();
      }
    }, 200);

    return () => clearInterval(timer);
  }, [prompt.durationSeconds, status, stopRecording]);

  // A recorder left running when the screen goes away would hold the microphone.
  useEffect(() => {
    return () => {
      void handleRef.current?.cancel();
      handleRef.current = null;
    };
  }, []);

  async function begin(): Promise<void> {
    if (status !== "idle" || isBusy) {
      return;
    }

    setError("");
    setStatus("starting");
    setIsBusy(true);

    try {
      handleRef.current = await startRhetoricRecording({ audioOnly: true });
      startedAtRef.current = Date.now();
      setRemainingSeconds(prompt.durationSeconds);
      setStatus("recording");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Kayıt başlatılamadı.");
      setStatus("idle");
    } finally {
      setIsBusy(false);
    }
  }

  const isUrgent = status === "recording" && remainingSeconds <= 10;

  return (
    <View style={styles.screen}>
      <Header
        title={drillKindLabels[prompt.kind]}
        subtitle={`${prompt.durationSeconds} saniye`}
        onBack={onBack}
        backLabel="Geri"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.taskCard}>
          <Text style={styles.taskTitle}>{prompt.title}</Text>
          <Text style={styles.taskInstruction}>{prompt.instruction}</Text>
        </Card>

        {/* The text stays visible while recording — this is a reading drill, not
            a memory test, and hiding it would measure the wrong thing. */}
        {prompt.text ? (
          <Card style={styles.textCard}>
            <Text style={styles.textLabel}>OKUYACAĞIN METİN</Text>
            <Text style={styles.readingText}>{prompt.text}</Text>
          </Card>
        ) : null}

        <Card style={[styles.timerCard, isUrgent && styles.timerCardUrgent]}>
          <Text style={[styles.timer, isUrgent && styles.timerUrgent]}>
            {formatClock(remainingSeconds)}
          </Text>
          <Text style={styles.timerLabel}>
            {status === "recording" ? "kayıt sürüyor" : "kalan süre"}
          </Text>
          {status === "recording" ? (
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.min(100, ((prompt.durationSeconds - remainingSeconds) / prompt.durationSeconds) * 100)}%` },
                  isUrgent && styles.fillUrgent
                ]}
              />
            </View>
          ) : null}
        </Card>

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        <View style={styles.actions}>
          {status === "idle" ? (
            <AppButton label="Kaydı başlat" onPress={begin} icon="mic" loading={isBusy} />
          ) : null}
          {status === "starting" ? <AppButton label="Hazırlanıyor…" onPress={() => undefined} loading /> : null}
          {status === "recording" ? (
            <AppButton
              label="Bitir"
              onPress={() => void stopRecording()}
              icon="square"
              variant="ghost"
              loading={isBusy}
            />
          ) : null}
        </View>

        <Text style={styles.footnote}>
          Süre dolunca kayıt kendiliğinden biter. Erken bitirirsen ölçüm yine yapılır.
        </Text>
      </ScrollView>
    </View>
  );
}

function formatClock(totalSeconds: number): string {
  const whole = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: spacing.screen
    },
    content: {
      paddingBottom: spacing.xl,
      gap: spacing.sm
    },
    taskCard: {
      gap: spacing.xs,
      backgroundColor: colors.primaryTint,
      borderColor: colors.primary
    },
    taskTitle: {
      ...typography.h2,
      color: colors.ink
    },
    taskInstruction: {
      ...typography.body,
      color: colors.muted
    },
    textCard: {
      gap: spacing.xs
    },
    textLabel: {
      ...typography.label,
      color: colors.muted
    },
    readingText: {
      ...typography.body,
      // Read start to finish, so capped tighter than the shell: past about
      // 90 characters per line the eye lands on the wrong line coming back.
      ...proseWidth,
      color: colors.ink,
      lineHeight: 26
    },
    timerCard: {
      alignItems: "center",
      gap: spacing.xs
    },
    timerCardUrgent: {
      backgroundColor: colors.warningTint,
      borderColor: colors.warning
    },
    timer: {
      ...typography.h1,
      fontSize: 44,
      color: colors.primaryDark
    },
    timerUrgent: {
      color: colors.warning
    },
    timerLabel: {
      ...typography.caption,
      color: colors.muted
    },
    track: {
      width: "100%",
      height: 6,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceMuted,
      overflow: "hidden"
    },
    fill: {
      height: "100%",
      backgroundColor: colors.primary
    },
    fillUrgent: {
      backgroundColor: colors.warning
    },
    errorCard: {
      backgroundColor: colors.dangerTint,
      borderColor: colors.danger
    },
    errorText: {
      ...typography.body,
      color: colors.ink
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.sm
    },
    footnote: {
      ...typography.caption,
      color: colors.muted
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
