import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { MediaPreview } from "@/components/MediaPreview";
import { AnalysisResult, AppSettings, RecordedMedia, Topic } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { analyzeSpeechWithBackend } from "@/services/backend/analyzeSpeechService";
import { getClientId } from "@/services/storage/clientIdentity";

interface TranscriptScreenProps {
  topic: Topic;
  media: RecordedMedia;
  settings: AppSettings;
  onBack: () => void;
  onOpenSettings: () => void;
  onContinue: (transcript: string, analysis: AnalysisResult) => void;
}

export function TranscriptScreen({
  topic,
  media,
  settings,
  onBack,
  onOpenSettings,
  onContinue
}: TranscriptScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  async function handleAnalyzeSpeech(): Promise<void> {
    if (isProcessing) {
      return;
    }

    const backendBaseUrl = settings.backendBaseUrl.trim();
    setError("");
    if (!backendBaseUrl) {
      setError("Backend API URL is not saved. Open Settings, enter your backend URL, tap Save, then retry.");
      return;
    }

    setIsProcessing(true);
    try {
      const clientId = await getClientId();
      const result = await analyzeSpeechWithBackend({
        backendBaseUrl,
        clientId,
        media,
        topic
      });
      setTranscript(result.transcript);
      setAnalysis(result.analysis);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Speech analysis failed.");
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    void handleAnalyzeSpeech();
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Header title="Secure Analysis" subtitle="Your backend is transcribing and analyzing the recording." onBack={onBack} />

        <MediaPreview media={media} />

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Backend Transcript</Text>
          {isProcessing ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.statusText}>
                Uploading recording to your backend and creating transcript securely...
              </Text>
            </View>
          ) : null}
          {!isProcessing && transcript ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          ) : null}
          {!isProcessing && !transcript ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.statusText}>
                {settings.backendBaseUrl.trim()
                  ? "Analysis did not complete. Check the message below, run Test Connection in Settings, then retry."
                  : "Backend API URL is not saved. Open Settings, enter your backend URL, tap Save, then retry."}
              </Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Card>

        <View style={styles.actions}>
          <AppButton
            label={transcript ? "Analyze Again" : "Retry Backend Analysis"}
            onPress={handleAnalyzeSpeech}
            loading={isProcessing}
            variant="secondary"
            icon="refresh-cw"
          />
          <AppButton label="Open Settings" onPress={onOpenSettings} variant="ghost" icon="settings" />
          <AppButton
            label="Show Feedback"
            onPress={() => {
              if (analysis) {
                onContinue(transcript.trim(), analysis);
              }
            }}
            disabled={!analysis || isProcessing}
            icon="arrow-right"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1
    },
    content: {
      padding: spacing.md,
      gap: spacing.md
    },
    card: {
      gap: spacing.sm
    },
    cardTitle: {
      ...typography.h2,
      color: colors.ink
    },
    transcriptBox: {
      minHeight: 180,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.sm,
      padding: spacing.md,
      backgroundColor: colors.background,
      justifyContent: "center"
    },
    transcriptText: {
      ...typography.bodyLarge,
      color: colors.ink
    },
    statusText: {
      ...typography.bodyLarge,
      color: colors.muted
    },
    error: {
      ...typography.bodyStrong,
      color: colors.danger,
      lineHeight: 20
    },
    actions: {
      gap: spacing.sm
    }
  });
}
