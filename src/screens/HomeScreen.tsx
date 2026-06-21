import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SpeakingRecord, Topic } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatReadableDate } from "@/utils/date";
import { formatScore100, normalizeScores } from "@/services/progress/scoreUtils";
import { StreakSummary } from "@/services/streak/streakService";

interface HomeScreenProps {
  topic: Topic;
  records: SpeakingRecord[];
  streakSummary: StreakSummary;
  onStartThinking: () => void;
  onNewTopic: () => void;
  onChat: () => void;
  onLearning: () => void;
  onPracticeModes: () => void;
  onHistory: () => void;
  onProgress: () => void;
  onSettings: () => void;
}

export function HomeScreen({
  topic,
  records,
  streakSummary,
  onStartThinking,
  onNewTopic,
  onChat,
  onLearning,
  onPracticeModes,
  onHistory,
  onProgress,
  onSettings
}: HomeScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const latestRecord = records[0];
  const latestOverallScore = latestRecord ? normalizeScores(latestRecord.scores).overall : 0;

  return (
    <View style={styles.screen}>
      <Header title="Daily Speaking Coach" rightLabel="Settings" onRightPress={onSettings} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.quickActions}>
          <HomeShortcut
            label="Kayıtlar"
            accessibilityLabel="Geçmiş kayıtlarım"
            onPress={onHistory}
            colors={colors}
            icon={<NotebookIcon colors={colors} />}
          />
          <HomeShortcut
            label="Gelişim"
            accessibilityLabel="Gelişimim"
            onPress={onProgress}
            colors={colors}
            icon={<RisingBarsIcon colors={colors} />}
          />
        </View>

        <Card style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <View>
              <Text style={styles.streakLabel}>Streak</Text>
              <Text style={styles.streakValue}>{streakSummary.currentStreakDays} gün</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>{streakSummary.statusLabelTR}</Text>
            </View>
          </View>
          <Text style={styles.streakHelp}>{streakSummary.helperTextTR}</Text>
        </Card>

        <Card style={styles.topicCard}>
          <View style={styles.topicMetaRow}>
            <Text style={styles.meta}>{topic.level}</Text>
            <Text style={styles.meta}>{topic.category}</Text>
          </View>
          <Text style={styles.topicTitle}>{topic.title}</Text>
          <View style={styles.actions}>
            <AppButton label="Düşünmeye Başla" onPress={onStartThinking} />
            <AppButton label="Yeni Konu" onPress={onNewTopic} variant="ghost" />
          </View>
        </Card>

        <View style={styles.grid}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{records.length}</Text>
            <Text style={styles.statLabel}>Kayıt</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>
              {latestRecord ? formatScore100(latestOverallScore) : "-"}
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
          <AppButton label="Anlık Sohbet" onPress={onChat} variant="secondary" />
          <AppButton label="Grammer Pratiği" onPress={onLearning} variant="ghost" />
          <AppButton label="Practice Modes" onPress={onPracticeModes} variant="ghost" />
        </View>

        <Text style={styles.signature}>Made by Yağız</Text>
      </ScrollView>
    </View>
  );
}

function HomeShortcut({
  label,
  accessibilityLabel,
  onPress,
  colors,
  icon
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  colors: AppColors;
  icon: React.ReactNode;
}): React.JSX.Element {
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.shortcut, pressed ? styles.shortcutPressed : null]}
    >
      <View style={styles.shortcutIconWrap}>{icon}</View>
      <Text style={styles.shortcutText}>{label}</Text>
    </Pressable>
  );
}

function NotebookIcon({ colors }: { colors: AppColors }): React.JSX.Element {
  const styles = createStyles(colors);

  return (
    <View style={styles.notebook}>
      <View style={styles.notebookSpine} />
      <View style={styles.notebookLine} />
      <View style={[styles.notebookLine, styles.notebookLineShort]} />
    </View>
  );
}

function RisingBarsIcon({ colors }: { colors: AppColors }): React.JSX.Element {
  const styles = createStyles(colors);

  return (
    <View style={styles.chartIcon}>
      <View style={[styles.chartBar, styles.chartBarOne]} />
      <View style={[styles.chartBar, styles.chartBarTwo]} />
      <View style={[styles.chartBar, styles.chartBarThree]} />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: spacing.md
    },
    content: {
      gap: spacing.md,
      paddingBottom: spacing.lg
    },
    quickActions: {
      flexDirection: "row",
      gap: spacing.sm
    },
    shortcut: {
      flex: 1,
      minHeight: 64,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm
    },
    shortcutPressed: {
      opacity: 0.82,
      transform: [{ scale: 0.99 }]
    },
    shortcutIconWrap: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted
    },
    shortcutText: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: "900"
    },
    streakCard: {
      gap: spacing.sm
    },
    streakHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.sm
    },
    streakLabel: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    streakValue: {
      color: colors.ink,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "900"
    },
    streakBadge: {
      maxWidth: "48%",
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs
    },
    streakBadgeText: {
      color: colors.primaryDark,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "900",
      textAlign: "center"
    },
    streakHelp: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20
    },
    notebook: {
      width: 21,
      height: 25,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.primaryDark,
      backgroundColor: colors.surface,
      paddingLeft: 7,
      paddingTop: 7,
      gap: 4
    },
    notebookSpine: {
      position: "absolute",
      left: 4,
      top: 3,
      bottom: 3,
      width: 2,
      borderRadius: 1,
      backgroundColor: colors.primaryDark
    },
    notebookLine: {
      width: 9,
      height: 2,
      borderRadius: 1,
      backgroundColor: colors.primaryDark
    },
    notebookLineShort: {
      width: 6
    },
    chartIcon: {
      width: 24,
      height: 24,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 3
    },
    chartBar: {
      width: 5,
      borderRadius: 3,
      backgroundColor: colors.primaryDark
    },
    chartBarOne: {
      height: 9,
      opacity: 0.65
    },
    chartBarTwo: {
      height: 15,
      opacity: 0.82
    },
    chartBarThree: {
      height: 22
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
    },
    signature: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs
    }
  });
}
