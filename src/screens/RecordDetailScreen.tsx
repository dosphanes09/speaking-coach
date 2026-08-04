import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AnalysisResultView } from "@/components/AnalysisResultView";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { MediaPreview } from "@/components/MediaPreview";
import {
  createAndShareSpeakingReportPdf,
  isSpeakingReportPdfAvailable,
  shareSpeakingReportPdf
} from "@/services/pdf/speakingReportPdf";
import { findTopicAttempts } from "@/services/progress/beforeAfterService";
import { formatScore100, normalizeScores } from "@/services/progress/scoreUtils";
import { isGrammarPracticeRecord } from "@/services/records/recordClassification";
import { SpeakingRecord, Topic } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatReadableDate } from "@/utils/date";

interface RecordDetailScreenProps {
  record: SpeakingRecord;
  allRecords: SpeakingRecord[];
  onBack: () => void;
  onDelete: (record: SpeakingRecord) => void;
  onUpdateRecord: (record: SpeakingRecord) => Promise<SpeakingRecord>;
  onRetryTopic: (topic: Topic) => void;
  onSelectRecord: (record: SpeakingRecord) => void;
}

export function RecordDetailScreen({
  record,
  allRecords,
  onBack,
  onDelete,
  onUpdateRecord,
  onRetryTopic,
  onSelectRecord
}: RecordDetailScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [currentRecord, setCurrentRecord] = useState(record);
  const [pdfError, setPdfError] = useState("");
  const [isCreatingPdf, setIsCreatingPdf] = useState(false);
  const isGrammarRecord = isGrammarPracticeRecord(currentRecord);
  const otherAttempts = findTopicAttempts(currentRecord, allRecords);

  async function handlePdfReport(): Promise<void> {
    setPdfError("");
    setIsCreatingPdf(true);

    try {
      const existingPdfAvailable = await isSpeakingReportPdfAvailable(currentRecord.pdfReportUri);

      if (existingPdfAvailable && currentRecord.pdfReportUri) {
        await shareSpeakingReportPdf(currentRecord.pdfReportUri);
        return;
      }

      const reportUri = await createAndShareSpeakingReportPdf({
        topic: currentRecord.topic,
        transcript: currentRecord.transcript,
        analysis: currentRecord.analysis,
        recordId: currentRecord.id
      });
      const saved = await onUpdateRecord({
        ...currentRecord,
        pdfReportUri: reportUri
      });
      setCurrentRecord(saved);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "PDF report could not be created.");
    } finally {
      setIsCreatingPdf(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Practice Detail" subtitle={currentRecord.topic.title} onBack={onBack} />

      <Card style={styles.metaCard}>
        <Text style={styles.date}>{formatReadableDate(currentRecord.createdAt)}</Text>
        <Text style={styles.meta}>
          {currentRecord.topic.level} / {currentRecord.media.type} / {currentRecord.media.durationSeconds}s
        </Text>
        <Text style={styles.meta}>
          {isGrammarRecord ? "Grammar Practice" : "General Speaking"} / PDF:{" "}
          {currentRecord.pdfReportUri ? "Ready" : "Not created yet"}
        </Text>
      </Card>

      {pdfError ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{pdfError}</Text>
        </Card>
      ) : null}

      <MediaPreview media={currentRecord.media} />
      <AnalysisResultView analysis={currentRecord.analysis} />

      <Card style={styles.retryCard}>
        <Text style={styles.retryTitle}>Want to see if the feedback helped?</Text>
        <Text style={styles.retryBody}>
          Answer this exact same question again. Your new attempt is saved as a separate record, so you can compare
          scores and feedback side by side and track your progress on this specific question over time.
        </Text>
        <AppButton
          label="Retry This Question"
          icon="refresh-cw"
          variant="secondary"
          onPress={() => onRetryTopic(currentRecord.topic)}
        />
      </Card>

      {otherAttempts.length > 0 ? (
        <View style={styles.attemptsSection}>
          <Text style={styles.attemptsTitle}>
            Other Attempts of This Question ({otherAttempts.length})
          </Text>
          <View style={styles.attemptsList}>
            {otherAttempts.map((attempt) => (
              <Pressable
                key={attempt.id}
                accessibilityRole="button"
                onPress={() => onSelectRecord(attempt)}
              >
                <Card style={styles.attemptCard}>
                  <Text style={styles.attemptDate}>{formatReadableDate(attempt.createdAt)}</Text>
                  <Text style={styles.attemptScore}>{formatScore100(normalizeScores(attempt.scores).overall)}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <AppButton
          label={currentRecord.pdfReportUri ? "Open PDF Report" : "Create and Save PDF"}
          onPress={handlePdfReport}
          loading={isCreatingPdf}
        />
        <AppButton label="Delete Record" onPress={() => onDelete(currentRecord)} variant="danger" />
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.md,
      gap: spacing.md
    },
    metaCard: {
      gap: spacing.xs
    },
    date: {
      ...typography.h2,
      color: colors.ink
    },
    meta: {
      ...typography.bodyStrong,
      color: colors.muted
    },
    errorCard: {
      borderColor: colors.danger
    },
    errorText: {
      ...typography.body,
      color: colors.danger,
      lineHeight: 21
    },
    retryCard: {
      gap: spacing.sm,
      backgroundColor: colors.accentTint,
      borderColor: colors.accent
    },
    retryTitle: {
      ...typography.h2,
      color: colors.ink
    },
    retryBody: {
      ...typography.body,
      color: colors.muted,
      lineHeight: 20
    },
    attemptsSection: {
      gap: spacing.sm
    },
    attemptsTitle: {
      ...typography.h2,
      color: colors.ink
    },
    attemptsList: {
      gap: spacing.xs
    },
    attemptCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderRadius: radius.md
    },
    attemptDate: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    attemptScore: {
      ...typography.h2,
      color: colors.primaryDark
    },
    actions: {
      gap: spacing.sm,
      paddingBottom: spacing.md
    }
  });
}
