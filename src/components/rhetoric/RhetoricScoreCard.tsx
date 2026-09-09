import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { DimensionValue } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { RhetoricScores } from "@/types/rhetoric";

interface RhetoricScoreCardProps {
  scores: RhetoricScores;
  /** Shown next to the model's score so the two can be compared directly. */
  selfScore?: number;
  /** Voice scoring needs the recording; without it the row is marked unreliable. */
  measuredFromAudio: boolean;
}

const DIMENSIONS: Array<{ key: keyof RhetoricScores; label: string; audioOnly: boolean }> = [
  { key: "content", label: "İçerik ve argüman", audioOnly: false },
  { key: "structure", label: "Yapı ve akış", audioOnly: false },
  { key: "fluency", label: "Akıcılık ve tempo", audioOnly: true },
  { key: "language", label: "Dil ve üslup", audioOnly: false },
  { key: "impact", label: "Etki ve anlatıcılık", audioOnly: false },
  { key: "voice", label: "Ses kullanımı", audioOnly: true }
];

export function RhetoricScoreCard({
  scores,
  selfScore,
  measuredFromAudio
}: RhetoricScoreCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  // The self assessment is on a 1-10 scale; the model's is 0-100.
  const selfOnHundred = typeof selfScore === "number" ? selfScore * 10 : null;
  const gap = selfOnHundred === null ? null : selfOnHundred - scores.overall;

  return (
    <View style={styles.container}>
      <View style={styles.overallRow}>
        <View>
          <Text style={styles.overallLabel}>Genel</Text>
          <Text style={styles.overallValue}>{scores.overall}</Text>
        </View>
        {selfOnHundred !== null ? (
          <View style={styles.selfBox}>
            <Text style={styles.selfLabel}>Senin puanın</Text>
            <Text style={styles.selfValue}>{selfScore}/10</Text>
            <Text style={[styles.selfGap, { color: gapColor(gap ?? 0, colors) }]}>{describeGap(gap ?? 0)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.rows}>
        {DIMENSIONS.map((dimension) => {
          const value = scores[dimension.key];
          const unreliable = !measuredFromAudio && dimension.audioOnly;

          return (
            <View key={dimension.key} style={[styles.row, unreliable && styles.rowUnreliable]}>
              <View style={styles.rowHead}>
                <Text style={styles.rowLabel}>
                  {dimension.label}
                  {unreliable ? " (sesten ölçülemedi)" : ""}
                </Text>
                <Text style={[styles.rowValue, { color: scoreColor(value, colors) }]}>{value}</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.max(0, Math.min(100, value))}%` as DimensionValue,
                      backgroundColor: scoreColor(value, colors)
                    }
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function scoreColor(value: number, colors: AppColors): string {
  if (value >= 80) {
    return colors.success;
  }
  if (value >= 65) {
    return colors.primary;
  }
  if (value >= 50) {
    return colors.warning;
  }
  return colors.danger;
}

function gapColor(gap: number, colors: AppColors): string {
  return Math.abs(gap) <= 8 ? colors.success : colors.warning;
}

/**
 * The gap itself is the lesson. Consistently rating yourself above the model
 * points at blind spots; consistently below points at confidence. Both are
 * worth naming instead of hiding behind a number.
 */
function describeGap(gap: number): string {
  const rounded = Math.round(gap);
  if (Math.abs(rounded) <= 8) {
    return "Kendini iyi tanıyorsun";
  }
  return rounded > 0 ? `${rounded} puan iyimser` : `${Math.abs(rounded)} puan sert`;
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.md
    },
    overallRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.md
    },
    overallLabel: {
      ...typography.label,
      color: colors.muted
    },
    overallValue: {
      fontSize: 48,
      lineHeight: 54,
      fontWeight: "800",
      color: colors.primaryDark
    },
    selfBox: {
      alignItems: "flex-end",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      gap: 2
    },
    selfLabel: {
      ...typography.label,
      color: colors.muted
    },
    selfValue: {
      ...typography.h2,
      color: colors.ink
    },
    selfGap: {
      ...typography.caption
    },
    rows: {
      gap: spacing.sm
    },
    row: {
      gap: 4
    },
    rowUnreliable: {
      opacity: 0.55
    },
    rowHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.sm
    },
    rowLabel: {
      ...typography.body,
      color: colors.ink,
      flexShrink: 1
    },
    rowValue: {
      ...typography.bodyStrong
    },
    track: {
      height: 8,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceMuted,
      overflow: "hidden"
    },
    fill: {
      height: 8
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
