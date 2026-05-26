import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SpeakingRecord, Topic } from "@/types/models";
import { colors, spacing } from "@/theme/colors";
import { formatReadableDate } from "@/utils/date";

interface HomeScreenProps {
  topic: Topic;
  records: SpeakingRecord[];
  onStartThinking: () => void;
  onNewTopic: () => void;
  onChat: () => void;
  onHistory: () => void;
  onProgress: () => void;
  onSettings: () => void;
}

export function HomeScreen({
  topic,
  records,
  onStartThinking,
  onNewTopic,
  onChat,
  onHistory,
  onProgress,
  onSettings
}: HomeScreenProps): React.JSX.Element {
  const latestRecord = records[0];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header
        title="Daily Speaking Coach"
        subtitle="One topic. One minute. Visible progress."
        rightLabel="Settings"
        onRightPress={onSettings}
      />

      <Card style={styles.topicCard}>
        <View style={styles.topicMetaRow}>
          <Text style={styles.meta}>{topic.level}</Text>
          <Text style={styles.meta}>{topic.category}</Text>
        </View>
        <Text style={styles.topicTitle}>{topic.title}</Text>
        <View style={styles.actions}>
          <AppButton label="Dusunmeye Basla" onPress={onStartThinking} />
          <AppButton label="Yeni Konu" onPress={onNewTopic} variant="ghost" />
        </View>
      </Card>

      <Card style={styles.chatCard}>
        <Text style={styles.latestTitle}>Instant Practice</Text>
        <Text style={styles.latestTopic}>Written and voice chat</Text>
        <Text style={styles.latestMeta}>Short replies, correction, and follow-up questions.</Text>
        <AppButton label="Anlik Sohbet" onPress={onChat} variant="secondary" />
      </Card>

      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{records.length}</Text>
          <Text style={styles.statLabel}>Kayit</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>
            {latestRecord ? latestRecord.scores.overall.toFixed(1) : "-"}
          </Text>
          <Text style={styles.statLabel}>Son Skor</Text>
        </Card>
      </View>

      {latestRecord ? (
        <Card style={styles.latestCard}>
          <Text style={styles.latestTitle}>Son Pratik</Text>
          <Text style={styles.latestTopic}>{latestRecord.topic.title}</Text>
          <Text style={styles.latestMeta}>{formatReadableDate(latestRecord.createdAt)}</Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <AppButton label="Gecmis Kayitlarim" onPress={onHistory} variant="secondary" />
        <AppButton label="Gelisimim" onPress={onProgress} variant="ghost" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md
  },
  topicCard: {
    gap: spacing.md
  },
  topicMetaRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  meta: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  topicTitle: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900"
  },
  actions: {
    gap: spacing.sm
  },
  chatCard: {
    gap: spacing.sm
  },
  grid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  statCard: {
    flex: 1,
    minHeight: 92,
    justifyContent: "center"
  },
  statValue: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.muted,
    fontWeight: "700"
  },
  latestCard: {
    gap: spacing.xs
  },
  latestTitle: {
    color: colors.muted,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  latestTopic: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  latestMeta: {
    color: colors.muted
  }
});
