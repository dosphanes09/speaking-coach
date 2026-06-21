import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SCORE_LABELS } from "@/services/progress/scoreUtils";
import { BeforeAfterComparison } from "@/services/progress/beforeAfterService";
import { colors, radius, spacing } from "@/theme/colors";
import { Card } from "./Card";

interface BeforeAfterComparisonCardProps {
  comparison: BeforeAfterComparison;
}

export function BeforeAfterComparisonCard({
  comparison
}: BeforeAfterComparisonCardProps): React.JSX.Element {
  const visibleScores = comparison.scoreChanges;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Before / After</Text>
          <Text style={styles.subtitle}>Ayni konuya verdigin onceki cevapla karsilastirma</Text>
        </View>
        <Text style={styles.date}>{formatDate(comparison.beforeRecord.createdAt)}</Text>
      </View>

      <View style={styles.scoreGrid}>
        {visibleScores.map((score) => (
          <View key={score.metric} style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>{SCORE_LABELS[score.metric]}</Text>
            <Text style={[styles.delta, score.delta >= 0 ? styles.positive : styles.negative]}>
              {formatDelta(score.delta)}
            </Text>
            <Text style={styles.scoreMeta}>
              {formatScore(score.before)} {"->"} {formatScore(score.after)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.insightGrid}>
        <InsightLine
          label="Error patterns"
          value={`${comparison.beforeErrorPatternCount} -> ${comparison.afterErrorPatternCount}`}
          delta={comparison.errorPatternDelta}
          lowerIsBetter
        />
        <InsightLine
          label="Transcript length"
          value={`${comparison.beforeTranscriptWordCount} -> ${comparison.afterTranscriptWordCount} words`}
          delta={comparison.transcriptWordCountDelta}
        />
        <InsightLine
          label="Words per minute"
          value={`${formatNumber(comparison.beforeWordsPerMinute)} -> ${formatNumber(
            comparison.afterWordsPerMinute
          )} WPM`}
          delta={comparison.wordsPerMinuteDelta}
        />
      </View>
    </Card>
  );
}

function InsightLine({
  label,
  value,
  delta,
  lowerIsBetter = false
}: {
  label: string;
  value: string;
  delta: number;
  lowerIsBetter?: boolean;
}): React.JSX.Element {
  const isPositive = lowerIsBetter ? delta <= 0 : delta >= 0;

  return (
    <View style={styles.insightLine}>
      <View style={styles.insightCopy}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <Text style={styles.insightValue}>{value}</Text>
      </View>
      <Text style={[styles.delta, isPositive ? styles.positive : styles.negative]}>
        {formatDelta(delta)}
      </Text>
    </View>
  );
}

function formatDelta(value: number): string {
  if (value === 0) {
    return "0";
  }

  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

function formatScore(value: number): string {
  return value.toFixed(0);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "onceki deneme";
  }

  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short"
  });
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs
  },
  date: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  scoreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  scoreItem: {
    width: "48%",
    minHeight: 88,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    gap: spacing.xs
  },
  scoreLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  delta: {
    fontSize: 18,
    fontWeight: "900"
  },
  positive: {
    color: colors.success
  },
  negative: {
    color: colors.danger
  },
  scoreMeta: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  insightGrid: {
    gap: spacing.sm
  },
  insightLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm
  },
  insightCopy: {
    flex: 1,
    gap: spacing.xs
  },
  insightValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700"
  }
});
