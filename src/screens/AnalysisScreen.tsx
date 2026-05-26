import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AnalysisResultView } from "@/components/AnalysisResultView";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { AnalysisResult, RecordedMedia, SpeakingRecord, Topic } from "@/types/models";
import { colors, spacing } from "@/theme/colors";
import { createId } from "@/utils/id";

interface AnalysisScreenProps {
  topic: Topic;
  media: RecordedMedia;
  transcript: string;
  analysisResult: AnalysisResult;
  onBack: () => void;
  onHome: () => void;
  onSaveRecord: (record: SpeakingRecord) => Promise<void>;
}

export function AnalysisScreen({
  topic,
  media,
  transcript,
  analysisResult,
  onBack,
  onHome,
  onSaveRecord
}: AnalysisScreenProps): React.JSX.Element {
  const [savedRecord, setSavedRecord] = useState<SpeakingRecord | null>(null);
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  const saveAnalysis = useCallback(async () => {
    try {
      const record: SpeakingRecord = {
        id: createId("record"),
        createdAt: new Date().toISOString(),
        topic,
        media,
        transcript,
        correctedVersion: analysisResult.correctedVersion,
        analysis: analysisResult,
        scores: analysisResult.scores,
        syncStatus: "local"
      };
      await onSaveRecord(record);
      setSavedRecord(record);
    } catch {
      setError("Analysis was created, but the local record could not be saved.");
    }
  }, [analysisResult, media, onSaveRecord, topic, transcript]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    void saveAnalysis();
  }, [saveAnalysis]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Analysis" subtitle={topic.title} onBack={onBack} />

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <AnalysisResultView analysis={analysisResult} />

      {savedRecord ? (
        <View style={styles.actions}>
          <AppButton label="Ana Sayfaya Don" onPress={onHome} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md
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
