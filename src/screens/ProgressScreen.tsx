import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { DimensionValue } from "react-native";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { MonthlyScoreCharts } from "@/components/MonthlyScoreCharts";
import { SpeakingRecord } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { calculateProgress, ProgressScoreBreakdown } from "@/services/progress/progressService";
import { RepeatedMistake } from "@/services/progress/repeatedMistakeService";

interface ProgressScreenProps {
  records: SpeakingRecord[];
  onBack: () => void;
}

export function ProgressScreen({ records, onBack }: ProgressScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [showCharts, setShowCharts] = useState(false);
  const progress = calculateProgress(records);
  const getBarHeight = (score: number): DimensionValue =>
    `${Math.max(0, Math.min(100, score))}%` as DimensionValue;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Progress" subtitle="Weekly and monthly speaking development" onBack={onBack} />

      <View style={styles.grid}>
        <StatCard label="Total Talks" value={String(progress.totalConversations)} styles={styles} />
        <StatCard label="Speaking Time" value={formatDuration(progress.totalDurationSeconds)} styles={styles} />
      </View>

      <View style={styles.grid}>
        <StatCard label="Average" value={formatScore(progress.overallAverage)} styles={styles} />
        <StatCard label="This Week" value={formatScore(progress.weeklyAverage)} styles={styles} />
      </View>

      <View style={styles.grid}>
        <StatCard label="This Month" value={formatScore(progress.monthlyAverage)} styles={styles} />
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, progress.trend >= 0 ? styles.positive : styles.negative]}>
            {records.length > 1 ? formatDelta(progress.trend) : "-"}
          </Text>
          <Text style={styles.statLabel}>All Trend</Text>
        </Card>
      </View>

      <Card style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Score Breakdown</Text>
        {progress.scoreBreakdown.map((item) => (
          <ScoreBreakdownRow key={item.metric} item={item} styles={styles} />
        ))}
      </Card>

      <Card style={styles.chartCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showCharts }}
          onPress={() => setShowCharts((current) => !current)}
          style={styles.expandHeader}
        >
          <View style={styles.expandTitleBlock}>
            <Text style={styles.sectionTitle}>Charts</Text>
            <Text style={styles.expandSubtitle}>Daily progress within the month for each score type</Text>
          </View>
          <Text style={styles.expandAction}>{showCharts ? "Close" : "Open"}</Text>
        </Pressable>
        {showCharts ? <MonthlyScoreCharts records={records} /> : null}
      </Card>

      <Card style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Last Scores</Text>
        {progress.chart.length === 0 ? (
          <Text style={styles.emptyText}>At least one record is needed for the chart.</Text>
        ) : (
          <View style={styles.chart}>
            {progress.chart.map((point) => (
              <View key={point.id} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: getBarHeight(point.score) }]} />
                </View>
                <Text style={styles.barScore}>{formatScore(point.score)}</Text>
                <Text style={styles.barLabel}>{point.label}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card style={styles.problemCard}>
        <Text style={styles.sectionTitle}>Most Repeated Problems</Text>
        {progress.topProblems.length === 0 ? (
          <Text style={styles.emptyText}>Repeated mistakes will appear here after more analyses.</Text>
        ) : (
          progress.topProblems.map((problem) => (
            <Text key={problem} style={styles.problem}>
              {problem}
            </Text>
          ))
        )}
      </Card>

      <Card style={styles.problemCard}>
        <Text style={styles.sectionTitle}>Repeated Mistake Patterns</Text>
        {progress.repeatedMistakes.length === 0 ? (
          <Text style={styles.emptyText}>At least two similar analyses are needed to detect a repeated mistake pattern.</Text>
        ) : (
          progress.repeatedMistakes.slice(0, 3).map((mistake) => (
            <RepeatedMistakeItem key={mistake.id} mistake={mistake} styles={styles} />
          ))
        )}
      </Card>

      <Card style={styles.problemCard}>
        <Text style={styles.sectionTitle}>Turkish Transfer Watch</Text>
        {progress.turkishTransferMistakes.length === 0 ? (
          <Text style={styles.emptyText}>No repeated mistakes from Turkish-thinking transfer have been detected yet.</Text>
        ) : (
          progress.turkishTransferMistakes.slice(0, 3).map((mistake) => (
            <RepeatedMistakeItem key={mistake.id} mistake={mistake} styles={styles} />
          ))
        )}
      </Card>
    </ScrollView>
  );
}

type ProgressStyles = ReturnType<typeof createStyles>;

function StatCard({
  label,
  value,
  styles
}: {
  label: string;
  value: string;
  styles: ProgressStyles;
}): React.JSX.Element {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function ScoreBreakdownRow({
  item,
  styles
}: {
  item: ProgressScoreBreakdown;
  styles: ProgressStyles;
}): React.JSX.Element {
  const width = `${Math.max(0, Math.min(100, item.average))}%` as DimensionValue;

  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownHeader}>
        <Text style={styles.problemTitle}>{item.label}</Text>
        <Text style={styles.breakdownMeta}>
          Avg {formatScore(item.average)} / Latest {formatScore(item.latest)}
        </Text>
      </View>
      <View style={styles.breakdownTrack}>
        <View style={[styles.breakdownFill, { width }]} />
      </View>
      <Text style={[styles.trendText, item.trend >= 0 ? styles.positive : styles.negative]}>
        Trend {formatDelta(item.trend)}
      </Text>
    </View>
  );
}

function RepeatedMistakeItem({
  mistake,
  styles
}: {
  mistake: RepeatedMistake;
  styles: ProgressStyles;
}): React.JSX.Element {
  return (
    <View style={styles.repeatedItem}>
      <View style={styles.repeatedHeader}>
        <Text style={styles.problemTitle}>{mistake.label}</Text>
        <Text style={styles.badge}>{mistake.count}x</Text>
      </View>
      <Text style={styles.metaText}>Last seen: {formatDate(mistake.lastSeenAt)}</Text>
      <Text style={styles.problem}>{mistake.explanationTR}</Text>
      {mistake.exampleOriginal ? (
        <Text style={styles.exampleText}>Original: {mistake.exampleOriginal}</Text>
      ) : null}
      {mistake.exampleCorrected ? (
        <Text style={styles.exampleText}>Corrected: {mistake.exampleCorrected}</Text>
      ) : null}
      <Text style={styles.exerciseText}>Mini exercise: {mistake.suggestedExercise}</Text>
    </View>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short"
  });
}

function formatScore(value: number): string {
  return value > 0 ? value.toFixed(0) : "-";
}

function formatDelta(value: number): string {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : ""}${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}`;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return "-";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}m`;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.md,
      gap: spacing.md
    },
    grid: {
      flexDirection: "row",
      gap: spacing.sm
    },
    statCard: {
      flex: 1,
      minHeight: 96,
      justifyContent: "center"
    },
    statValue: {
      ...typography.display,
      color: colors.ink
    },
    statLabel: {
      ...typography.bodyStrong,
      color: colors.muted
    },
    positive: {
      color: colors.success
    },
    negative: {
      color: colors.danger
    },
    chartCard: {
      gap: spacing.md
    },
    sectionTitle: {
      ...typography.h2,
      color: colors.ink
    },
    expandHeader: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md
    },
    expandTitleBlock: {
      flex: 1,
      gap: spacing.xs
    },
    expandSubtitle: {
      ...typography.caption,
      color: colors.muted
    },
    expandAction: {
      ...typography.bodyStrong,
      color: colors.accent
    },
    chart: {
      height: 160,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.sm
    },
    barColumn: {
      flex: 1,
      alignItems: "center",
      gap: spacing.xs
    },
    barTrack: {
      width: "100%",
      height: 132,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      justifyContent: "flex-end",
      overflow: "hidden"
    },
    barFill: {
      backgroundColor: colors.primary,
      borderTopLeftRadius: radius.sm,
      borderTopRightRadius: radius.sm
    },
    barLabel: {
      ...typography.caption,
      color: colors.muted,
      fontWeight: "700"
    },
    barScore: {
      ...typography.caption,
      color: colors.ink,
      fontSize: 11,
      fontWeight: "800"
    },
    breakdownRow: {
      gap: spacing.xs,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.line
    },
    breakdownHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.sm
    },
    breakdownMeta: {
      ...typography.caption,
      color: colors.muted
    },
    breakdownTrack: {
      height: 8,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      overflow: "hidden"
    },
    breakdownFill: {
      height: 8,
      backgroundColor: colors.accent
    },
    trendText: {
      ...typography.bodyStrong,
      fontSize: 13
    },
    problemCard: {
      gap: spacing.sm
    },
    repeatedItem: {
      gap: spacing.xs,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.line
    },
    repeatedHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.sm
    },
    problemTitle: {
      ...typography.bodyStrong,
      flex: 1,
      color: colors.ink,
      fontSize: 15,
      lineHeight: 21
    },
    badge: {
      ...typography.label,
      minWidth: 40,
      borderRadius: radius.sm,
      backgroundColor: colors.warning,
      color: "#FFFFFF",
      fontSize: 13,
      overflow: "hidden",
      paddingHorizontal: spacing.xs,
      paddingVertical: 3,
      textAlign: "center"
    },
    metaText: {
      ...typography.caption,
      color: colors.muted
    },
    problem: {
      ...typography.bodyLarge,
      color: colors.ink
    },
    exampleText: {
      ...typography.body,
      color: colors.ink
    },
    exerciseText: {
      ...typography.body,
      color: colors.primaryDark,
      fontWeight: "700"
    },
    emptyText: {
      ...typography.bodyLarge,
      color: colors.muted
    }
  });
}
