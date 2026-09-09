import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AnalysisResultView } from "@/components/AnalysisResultView";
import { AppButton } from "@/components/AppButton";
import { BeforeAfterComparisonCard } from "@/components/BeforeAfterComparisonCard";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { createAndShareSpeakingReportPdf } from "@/services/pdf/speakingReportPdf";
import { enrichAnalysisForProgress } from "@/services/progress/analysisEnrichmentService";
import {
  BeforeAfterComparison,
  buildLatestTopicComparison
} from "@/services/progress/beforeAfterService";
import {
  buildGrammarGroupFromTopic,
  getPracticeTypeFromTopic
} from "@/services/records/recordClassification";
import { AnalysisResult, RecordedMedia, SpeakingRecord, Topic } from "@/types/models";
import { AppColors, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { createId } from "@/utils/id";

interface AnalysisScreenProps {
  topic: Topic;
  media: RecordedMedia;
  transcript: string;
  analysisResult: AnalysisResult;
  records: SpeakingRecord[];
  onBack: () => void;
  onHome: () => void;
  onSaveRecord: (record: SpeakingRecord) => Promise<SpeakingRecord>;
}

export function AnalysisScreen({
  topic,
  media,
  transcript,
  analysisResult,
  records,
  onBack,
  onHome,
  onSaveRecord
}: AnalysisScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [savedRecord, setSavedRecord] = useState<SpeakingRecord | null>(null);
  const [comparison, setComparison] = useState<BeforeAfterComparison | null>(null);
  const [error, setError] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [isCreatingPdf, setIsCreatingPdf] = useState(false);
  const startedRef = useRef(false);

  const saveAnalysis = useCallback(async () => {
    try {
      const enrichedAnalysis = enrichAnalysisForProgress({
        analysis: analysisResult,
        transcript,
        media,
        topic
      });
      const record: SpeakingRecord = {
        id: createId("record"),
        createdAt: new Date().toISOString(),
        practiceType: getPracticeTypeFromTopic(topic),
        grammarGroup: buildGrammarGroupFromTopic(topic),
        topic,
        media,
        transcript,
        correctedVersion: enrichedAnalysis.correctedVersion,
        analysis: enrichedAnalysis,
        scores: enrichedAnalysis.scores,
        speakingAnalytics: enrichedAnalysis.speakingAnalytics,
        errorPatterns: enrichedAnalysis.errorPatterns,
        tags: enrichedAnalysis.progressTags,
        syncStatus: "local"
      };
      const saved = await onSaveRecord(record);
      setSavedRecord(saved);
      setComparison(buildLatestTopicComparison(saved, records));
    } catch {
      setError("Analysis was created, but the local record could not be saved.");
    }
  }, [analysisResult, media, onSaveRecord, records, topic, transcript]);

  const handleCreatePdf = useCallback(async () => {
    setPdfError("");
    setIsCreatingPdf(true);

    try {
      const reportUri = await createAndShareSpeakingReportPdf({
        topic,
        transcript,
        analysis: savedRecord?.analysis ?? analysisResult,
        recordId: savedRecord?.id
      });

      if (savedRecord) {
        const saved = await onSaveRecord({
          ...savedRecord,
          pdfReportUri: reportUri
        });
        setSavedRecord(saved);
      }
    } catch (pdfCreateError) {
      setPdfError(
        pdfCreateError instanceof Error
          ? pdfCreateError.message
          : "PDF report could not be created. Please try again."
      );
    } finally {
      setIsCreatingPdf(false);
    }
  }, [analysisResult, onSaveRecord, savedRecord, topic, transcript]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    void saveAnalysis();
  }, [saveAnalysis]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Analysis" subtitle="Feedback for this speaking practice" onBack={onBack} />

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      {pdfError ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{pdfError}</Text>
        </Card>
      ) : null}

      <AnalysisResultView analysis={analysisResult} />

      {comparison ? <BeforeAfterComparisonCard comparison={comparison} /> : null}

      <View style={styles.actions}>
        <AppButton
          label={savedRecord?.pdfReportUri ? "Open PDF Report" : "Create PDF Report"}
          onPress={handleCreatePdf}
          loading={isCreatingPdf}
        />
        {savedRecord ? (
          <AppButton label="Back to Home" onPress={onHome} />
        ) : null}
      </View>
    </ScrollView>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.screen,
      gap: spacing.md
    },
    errorCard: {
      borderColor: colors.danger
    },
    errorText: {
      ...typography.body,
      color: colors.danger,
      fontSize: 16,
      lineHeight: 22
    },
    actions: {
      gap: spacing.sm,
      paddingBottom: spacing.md
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
