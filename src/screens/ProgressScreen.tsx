import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { DimensionValue } from "react-native";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SpeakingRecord } from "@/types/models";
import { colors, radius, spacing } from "@/theme/colors";
import { calculateProgress } from "@/services/progress/progressService";

interface ProgressScreenProps {
  records: SpeakingRecord[];
  onBack: () => void;
}

export function ProgressScreen({ records, onBack }: ProgressScreenProps): React.JSX.Element {
  const progress = calculateProgress(records);
  const getBarHeight = (score: number): DimensionValue =>
    `${Math.max(0, Math.min(10, score)) * 10}%` as DimensionValue;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Progress" subtitle="Weekly and monthly speaking development" onBack={onBack} />

      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{progress.overallAverage ? progress.overallAverage.toFixed(1) : "-"}</Text>
          <Text style={styles.statLabel}>Average</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{progress.weeklyAverage ? progress.weeklyAverage.toFixed(1) : "-"}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{progress.monthlyAverage ? progress.monthlyAverage.toFixed(1) : "-"}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{records.length > 1 ? progress.trend.toFixed(1) : "-"}</Text>
          <Text style={styles.statLabel}>Trend</Text>
        </Card>
      </View>

      <Card style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Last Scores</Text>
        {progress.chart.length === 0 ? (
          <Text style={styles.emptyText}>Grafik için en az bir kayıt gerekiyor.</Text>
        ) : (
          <View style={styles.chart}>
            {progress.chart.map((point) => (
              <View key={point.id} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: getBarHeight(point.score) }]} />
                </View>
                <Text style={styles.barLabel}>{point.label}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card style={styles.problemCard}>
        <Text style={styles.sectionTitle}>Most Repeated Problems</Text>
        {progress.topProblems.length === 0 ? (
          <Text style={styles.emptyText}>Daha fazla analizden sonra tekrar eden hatalar burada görünecek.</Text>
        ) : (
          progress.topProblems.map((problem) => (
            <Text key={problem} style={styles.problem}>
              {problem}
            </Text>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.muted,
    fontWeight: "700"
  },
  chartCard: {
    gap: spacing.md
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
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
    color: colors.muted,
    fontWeight: "700"
  },
  problemCard: {
    gap: spacing.sm
  },
  problem: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 22
  }
});
