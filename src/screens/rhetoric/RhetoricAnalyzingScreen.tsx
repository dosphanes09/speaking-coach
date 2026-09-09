import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { AppColors, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { getConfiguredBackendBaseUrl } from "@/config/backendConfig";
import { getClientId } from "@/services/storage/clientIdentity";
import { analyzeRhetoricWithBackend } from "@/services/backend/rhetoricService";
import { createId } from "@/utils/id";
import {
  RhetoricMode,
  RhetoricRecord,
  RhetoricRecording,
  RhetoricSelfAssessment,
  RhetoricTopic
} from "@/types/rhetoric";

interface RhetoricAnalyzingScreenProps {
  topic: RhetoricTopic;
  mode: RhetoricMode;
  targetDurationSeconds: number;
  preparationNotes: string;
  recording: RhetoricRecording;
  selfAssessment: RhetoricSelfAssessment;
  retakeOfRecordId?: string;
  onBack: () => void;
  onComplete: (record: RhetoricRecord) => void;
}

/** What the wait actually consists of, so a long pause does not look like a hang. */
const STAGES = [
  "Kayıt yükleniyor",
  "Konuşma yazıya dökülüyor",
  "Ses dinleniyor: duraklamalar, tonlama, dolgu sesleri",
  "İçerik ve yapı değerlendiriliyor",
  "Geri bildirim hazırlanıyor"
];

export function RhetoricAnalyzingScreen({
  topic,
  mode,
  targetDurationSeconds,
  preparationNotes,
  recording,
  selfAssessment,
  retakeOfRecordId,
  onBack,
  onComplete
}: RhetoricAnalyzingScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    // A five minute recording takes a while to analyse. The stage list advances
    // on a timer because the backend reports no progress; it is an honest
    // description of the steps, not a fake progress bar tied to nothing.
    const timer = setInterval(() => {
      setStageIndex((current) => Math.min(STAGES.length - 1, current + 1));
    }, 9000);
    return () => clearInterval(timer);
  }, [attempt]);

  useEffect(() => {
    // The stage list stops advancing after the last stage, so on a slow run the
    // screen would sit unchanged for a minute and read as frozen. A ticking
    // count is not progress, but it is proof that something is still running.
    setElapsedSeconds(0);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    let cancelled = false;

    void (async () => {
      try {
        const clientId = await getClientId();
        const { analysis } = await analyzeRhetoricWithBackend({
          backendBaseUrl: getConfiguredBackendBaseUrl(),
          clientId,
          topic,
          mode,
          recording,
          targetDurationSeconds,
          preparationNotes
        });

        if (cancelled) {
          return;
        }

        onComplete({
          id: createId("hitabet"),
          createdAt: new Date().toISOString(),
          topic,
          mode,
          targetDurationSeconds,
          preparationNotes,
          recording,
          analysis,
          selfAssessment,
          retakeOfRecordId
        });
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Analiz tamamlanamadı.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    attempt,
    mode,
    onComplete,
    preparationNotes,
    recording,
    selfAssessment,
    targetDurationSeconds,
    topic,
    retakeOfRecordId
  ]);

  function retry(): void {
    setError("");
    setStageIndex(0);
    startedRef.current = false;
    setAttempt((current) => current + 1);
  }

  return (
    <View style={styles.screen}>
      <Header title="Analiz" subtitle={topic.title} onBack={onBack} backLabel="Geri" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Analiz tamamlanamadı</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Text style={styles.errorNote}>
              Kaydın cihazında duruyor, kaybolmadı. Tekrar deneyebilirsin.
            </Text>
            <AppButton label="Tekrar dene" onPress={retry} icon="refresh-cw" />
          </Card>
        ) : (
          <Card style={styles.progressCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stage}>{STAGES[stageIndex]}</Text>
            <Text style={styles.elapsed}>
              {formatElapsed(elapsedSeconds)}
              {elapsedSeconds > 120 ? " · beş dakikalık bir kayıt için normal" : ""}
            </Text>
            <View style={styles.stageList}>
              {STAGES.map((stage, index) => (
                <Text
                  key={stage}
                  style={[
                    styles.stageItem,
                    index < stageIndex && styles.stageItemDone,
                    index === stageIndex && styles.stageItemActive
                  ]}
                >
                  {index < stageIndex ? "✓ " : index === stageIndex ? "› " : "  "}
                  {stage}
                </Text>
              ))}
            </View>
            <Text style={styles.wait}>
              Beş dakikalık bir kaydın incelenmesi bir dakikayı bulabilir. Uygulamayı kapatma.
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} dk ${seconds} sn` : `${seconds} saniye`;
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
    progressCard: {
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.lg
    },
    elapsed: {
      ...typography.caption,
      color: colors.muted
    },
    stage: {
      ...typography.h2,
      color: colors.ink,
      textAlign: "center"
    },
    stageList: {
      alignSelf: "stretch",
      gap: 4
    },
    stageItem: {
      ...typography.body,
      color: colors.muted,
      opacity: 0.55
    },
    stageItemDone: {
      color: colors.success,
      opacity: 1
    },
    stageItemActive: {
      color: colors.primaryDark,
      opacity: 1,
      fontWeight: "700"
    },
    wait: {
      ...typography.caption,
      color: colors.muted,
      textAlign: "center"
    },
    errorCard: {
      gap: spacing.sm,
      borderColor: colors.danger,
      backgroundColor: colors.dangerTint
    },
    errorTitle: {
      ...typography.h2,
      color: colors.ink
    },
    errorBody: {
      ...typography.body,
      color: colors.ink
    },
    errorNote: {
      ...typography.caption,
      color: colors.muted
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
