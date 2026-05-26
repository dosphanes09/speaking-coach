import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SpeakingRecord } from "@/types/models";
import { colors, spacing } from "@/theme/colors";
import { formatReadableDate } from "@/utils/date";

interface HistoryScreenProps {
  records: SpeakingRecord[];
  onBack: () => void;
  onSelectRecord: (record: SpeakingRecord) => void;
}

export function HistoryScreen({
  records,
  onBack,
  onSelectRecord
}: HistoryScreenProps): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="History" subtitle="Your saved speaking practices" onBack={onBack} />

      {records.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Henüz kayıt yok.</Text>
        </Card>
      ) : null}

      <View style={styles.list}>
        {records.map((record) => (
          <Pressable key={record.id} accessibilityRole="button" onPress={() => onSelectRecord(record)}>
            <Card style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordDate}>{formatReadableDate(record.createdAt)}</Text>
                <Text style={styles.score}>{record.scores.overall.toFixed(1)}</Text>
              </View>
              <Text style={styles.topic}>{record.topic.title}</Text>
              <Text style={styles.meta}>
                {record.media.type} · {record.media.durationSeconds}s · {record.analysis.generatedBy}
              </Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md
  },
  list: {
    gap: spacing.sm
  },
  emptyText: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22
  },
  recordCard: {
    gap: spacing.sm
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  },
  recordDate: {
    color: colors.muted,
    fontWeight: "700"
  },
  score: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "900"
  },
  topic: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800"
  },
  meta: {
    color: colors.muted
  }
});
