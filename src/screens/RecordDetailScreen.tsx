import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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
import { isGrammarPracticeRecord } from "@/services/records/recordClassification";
import { SpeakingRecord } from "@/types/models";
import { AppColors, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatReadableDate } from "@/utils/date";

interface RecordDetailScreenProps {
  record: SpeakingRecord;
  onBack: () => void;
  onDelete: (record: SpeakingRecord) => void;
  onUpdateRecord: (record: SpeakingRecord) => Promise<SpeakingRecord>;
}

export function RecordDetailScreen({
  record,
  onBack,
  onDelete,
  onUpdateRecord
}: RecordDetailScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [currentRecord, setCurrentRecord] = useState(record);
  const [pdfError, setPdfError] = useState("");
  const [isCreatingPdf, setIsCreatingPdf] = useState(false);
  const isGrammarRecord = isGrammarPracticeRecord(currentRecord);

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
      setPdfError(error instanceof Error ? error.message : "PDF raporu oluşturulamadı.");
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
          {currentRecord.pdfReportUri ? "Hazır" : "Henüz oluşturulmadı"}
        </Text>
      </Card>

      {pdfError ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{pdfError}</Text>
        </Card>
      ) : null}

      <MediaPreview media={currentRecord.media} />
      <AnalysisResultView analysis={currentRecord.analysis} />

      <View style={styles.actions}>
        <AppButton
          label={currentRecord.pdfReportUri ? "PDF Raporunu Aç" : "PDF Oluştur ve Kaydet"}
          onPress={handlePdfReport}
          loading={isCreatingPdf}
        />
        <AppButton label="Kaydı Sil" onPress={() => onDelete(currentRecord)} variant="danger" />
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
      color: colors.ink,
      fontSize: 18,
      fontWeight: "800"
    },
    meta: {
      color: colors.muted,
      fontWeight: "700"
    },
    errorCard: {
      borderColor: colors.danger
    },
    errorText: {
      color: colors.danger,
      lineHeight: 21
    },
    actions: {
      gap: spacing.sm,
      paddingBottom: spacing.md
    }
  });
}
