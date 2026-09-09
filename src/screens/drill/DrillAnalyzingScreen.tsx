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
import { runDrillWithBackend } from "@/services/backend/drillService";
import { deleteMedia } from "@/services/media/mediaStorage";
import { createId } from "@/utils/id";
import { drillKindLabels } from "@/data/drillPrompts";
import { DrillPrompt, DrillRecord } from "@/types/drill";

interface DrillAnalyzingScreenProps {
  prompt: DrillPrompt;
  audioUri: string;
  mimeType: string;
  durationSeconds: number;
  onBack: () => void;
  onComplete: (record: DrillRecord) => void;
}

/**
 * Uploads a rep and waits.
 *
 * Two behaviours differ from the rhetoric equivalent:
 *
 * 1. The recording is deleted as soon as the analysis returns. A rep is not an
 *    artefact, and five a day would otherwise fill the disk with audio nobody
 *    plays back.
 * 2. A failure keeps the file so "try again" is a real option, and says so —
 *    but the retry re-uploads rather than asking for another recording.
 */
export function DrillAnalyzingScreen({
  prompt,
  audioUri,
  mimeType,
  durationSeconds,
  onBack,
  onComplete
}: DrillAnalyzingScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (startedRef.current) {
      return undefined;
    }
    startedRef.current = true;

    void (async () => {
      try {
        const clientId = await getClientId();
        const result = await runDrillWithBackend({
          backendBaseUrl: getConfiguredBackendBaseUrl(),
          clientId,
          prompt,
          audioUri,
          mimeType,
          durationSeconds
        });

        if (cancelled) {
          return;
        }

        // The rep is scored; the audio has no further use.
        await deleteMedia(audioUri).catch(() => undefined);

        onComplete({
          id: createId("egzersiz"),
          createdAt: new Date().toISOString(),
          prompt,
          durationSeconds,
          result
        });
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Egzersiz değerlendirilemedi.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt, audioUri, durationSeconds, mimeType, onComplete, prompt]);

  function retry(): void {
    setError("");
    startedRef.current = false;
    setAttempt((current) => current + 1);
  }

  return (
    <View style={styles.screen}>
      <Header title="Değerlendiriliyor" subtitle={drillKindLabels[prompt.kind]} onBack={onBack} backLabel="Geri" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Değerlendirilemedi</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Text style={styles.errorNote}>Kaydın duruyor, tekrar gönderilebilir.</Text>
            <AppButton label="Tekrar dene" onPress={retry} icon="refresh-cw" />
          </Card>
        ) : (
          <Card style={styles.workingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.workingText}>Kayıt ölçülüyor ve dinleniyor…</Text>
            <Text style={styles.workingHint}>Genelde 10-20 saniye sürer.</Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
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
    workingCard: {
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xl
    },
    workingText: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    workingHint: {
      ...typography.caption,
      color: colors.muted
    },
    errorCard: {
      gap: spacing.sm,
      backgroundColor: colors.dangerTint,
      borderColor: colors.danger
    },
    errorTitle: {
      ...typography.bodyStrong,
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
