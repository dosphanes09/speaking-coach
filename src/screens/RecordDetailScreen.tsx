import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AnalysisResultView } from "@/components/AnalysisResultView";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { MediaPreview } from "@/components/MediaPreview";
import { SpeakingRecord } from "@/types/models";
import { colors, spacing } from "@/theme/colors";
import { formatReadableDate } from "@/utils/date";

interface RecordDetailScreenProps {
  record: SpeakingRecord;
  onBack: () => void;
  onDelete: (record: SpeakingRecord) => void;
}

export function RecordDetailScreen({
  record,
  onBack,
  onDelete
}: RecordDetailScreenProps): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Practice Detail" subtitle={record.topic.title} onBack={onBack} />

      <Card style={styles.metaCard}>
        <Text style={styles.date}>{formatReadableDate(record.createdAt)}</Text>
        <Text style={styles.meta}>
          {record.topic.level} · {record.media.type} · {record.media.durationSeconds}s
        </Text>
      </Card>

      <MediaPreview media={record.media} />
      <AnalysisResultView analysis={record.analysis} />

      <View style={styles.actions}>
        <AppButton label="Kaydı Sil" onPress={() => onDelete(record)} variant="danger" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  actions: {
    paddingBottom: spacing.md
  }
});
