import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SpeakingAnalytics, WordFrequency } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Card } from "./Card";

interface SpeakingAnalyticsCardProps {
  analytics: SpeakingAnalytics;
}

export function SpeakingAnalyticsCard({ analytics }: SpeakingAnalyticsCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Card style={styles.card}>
      <View style={styles.grid}>
        <Metric colors={colors} label="CEFR" value={analytics.estimatedCEFRLevel} />
        <Metric colors={colors} label="Time Used" value={formatTimeUsage(analytics)} />
        <Metric colors={colors} label="WPM" value={formatNumber(analytics.wordsPerMinute)} />
        <Metric colors={colors} label="Words" value={formatNumber(analytics.transcriptWordCount)} />
        <Metric colors={colors} label="Avg Sentence" value={formatNumber(analytics.averageSentenceLength)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Clarity Notes</Text>
        <Text style={styles.body}>{analytics.clarityNotesTR}</Text>
      </View>

      <FrequencyList colors={colors} title="Filler Words" items={analytics.fillerWords} emptyText="Filler word yakalanmadı." />
      <FrequencyList colors={colors} title="Repeated Words" items={analytics.repeatedWords} emptyText="Belirgin tekrar eden kelime yok." />
    </Card>
  );
}

function Metric({ colors, label, value }: { colors: AppColors; label: string; value: string }): React.JSX.Element {
  const styles = createStyles(colors);

  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function FrequencyList({
  colors,
  title,
  items,
  emptyText
}: {
  colors: AppColors;
  title: string;
  items: WordFrequency[];
  emptyText: string;
}): React.JSX.Element {
  const styles = createStyles(colors);
  const visibleItems = items.slice(0, 6);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{title}</Text>
      {visibleItems.length === 0 ? (
        <Text style={styles.body}>{emptyText}</Text>
      ) : (
        <View style={styles.pillRow}>
          {visibleItems.map((item) => (
            <Text key={`${item.word}-${item.count}`} style={styles.pill}>
              {item.word} x{item.count}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function formatTimeUsage(analytics: SpeakingAnalytics): string {
  const usedSeconds = Math.max(0, Math.round(analytics.responseDurationSeconds || 0));
  const availableSeconds = Math.max(usedSeconds, Math.round(analytics.availableDurationSeconds || 0));

  if (availableSeconds > usedSeconds) {
    return `${usedSeconds}/${availableSeconds}s`;
  }

  return usedSeconds > 0 ? `${usedSeconds}s` : "-";
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      gap: spacing.md
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    metric: {
      width: "48%",
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing.sm,
      gap: spacing.xs
    },
    metricValue: {
      color: colors.ink,
      fontSize: 20,
      fontWeight: "800"
    },
    metricLabel: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    section: {
      gap: spacing.xs
    },
    label: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    body: {
      color: colors.ink,
      fontSize: 16,
      lineHeight: 23
    },
    pillRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    pill: {
      overflow: "hidden",
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      color: colors.primaryDark,
      fontSize: 14,
      fontWeight: "700",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs
    }
  });
}
