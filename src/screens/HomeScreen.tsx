import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SpeakingRecord } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors, useThemeMode } from "@/theme/ThemeProvider";
import { formatReadableDate } from "@/utils/date";
import { formatScore100, normalizeScores } from "@/services/progress/scoreUtils";
import { StreakSummary } from "@/services/streak/streakService";

interface HomeScreenProps {
  records: SpeakingRecord[];
  streakSummary: StreakSummary;
  onStartThinking: () => void;
  onOpenDrawer: () => void;
}

export function HomeScreen({
  records,
  streakSummary,
  onStartThinking,
  onOpenDrawer
}: HomeScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const themeMode = useThemeMode();
  const styles = createStyles(colors);
  const isLoveMode = themeMode === "love";
  const latestRecord = records[0];
  const latestOverallScore = latestRecord ? normalizeScores(latestRecord.scores).overall : 0;

  return (
    <View style={styles.screen}>
      <Header title="Daily Speaking Coach" onMenuPress={onOpenDrawer} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoveMode ? (
          <View style={styles.loveBanner}>
            <Text style={styles.loveBannerIcon}>❤️</Text>
            <Text style={styles.loveBannerText}>Her pratik biraz daha sevgiyle, biraz daha güvenle.</Text>
          </View>
        ) : null}

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

        <Card style={styles.practiceCard}>
          <Text style={styles.practiceEyebrow}>Speaking practice</Text>
          <Text style={styles.practiceTitle}>Hazırlan, konuş, geri bildirim al.</Text>
          <Text style={styles.practiceHelp}>
            Konu içeride seçilir ve analiz için kullanılır. Hazırlık süresi bitince kayıt otomatik başlar.
          </Text>
          <AppButton label="Pratiğe Başla" onPress={onStartThinking} icon="→" />
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
            <Text style={styles.latestTopic}>Son konuşma kaydın hazır.</Text>
            <Text style={styles.latestMeta}>{formatReadableDate(latestRecord.createdAt)}</Text>
          </Card>
        ) : null}

        <Text style={styles.signature}>
          {isLoveMode ? "made by seni çok seven Yağız ❤️" : "made by Yağız"}
        </Text>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: spacing.screen
    },
    content: {
      gap: spacing.md,
      paddingBottom: spacing.xl
    },
    loveBanner: {
      minHeight: 48,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    loveBannerIcon: {
      fontSize: 18
    },
    loveBannerText: {
      flex: 1,
      color: colors.primaryDark,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "600"
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
      fontSize: 14,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    streakValue: {
      color: colors.ink,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "800"
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
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "700",
      textAlign: "center"
    },
    streakHelp: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 22
    },
    practiceCard: {
      gap: spacing.md
    },
    practiceEyebrow: {
      color: colors.primaryDark,
      fontSize: 14,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    practiceTitle: {
      color: colors.ink,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "800"
    },
    practiceHelp: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 23,
      fontWeight: "400"
    },
    grid: {
      flexDirection: "row",
      gap: spacing.sm
    },
    statCard: {
      flex: 1,
      minHeight: 88,
      justifyContent: "center"
    },
    statValue: {
      color: colors.ink,
      fontSize: 24,
      fontWeight: "800"
    },
    statLabel: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "600"
    },
    latestCard: {
      gap: spacing.xs
    },
    latestTitle: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    latestTopic: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: "700"
    },
    latestMeta: {
      color: colors.muted
    },
    signature: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: "600",
      textAlign: "center",
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs
    }
  });
}
