import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ErrorPattern } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Card } from "./Card";

interface ErrorPatternsCardProps {
  patterns: ErrorPattern[];
}

export function ErrorPatternsCard({ patterns }: ErrorPatternsCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const visiblePatterns = patterns.slice(0, 6);

  return (
    <Card style={styles.card}>
      {visiblePatterns.map((pattern) => (
        <View key={pattern.id} style={styles.pattern}>
          <View style={styles.header}>
            <Text style={styles.title}>{pattern.label}</Text>
            <Text style={[styles.badge, pattern.severity === "high" ? styles.highBadge : styles.defaultBadge]}>
              {pattern.severity}
            </Text>
          </View>
          <Text style={styles.meta}>
            {pattern.category}
            {pattern.isTurkishTransferError ? " / Turkish transfer" : ""}
          </Text>
          <Text style={styles.body}>{pattern.explanationTR}</Text>
          {pattern.exampleOriginal ? (
            <Text style={styles.example}>Original: {pattern.exampleOriginal}</Text>
          ) : null}
          {pattern.exampleCorrected ? (
            <Text style={styles.example}>Corrected: {pattern.exampleCorrected}</Text>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    gap: spacing.md
  },
  pattern: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  title: {
    ...typography.bodyStrong,
    flex: 1,
    color: colors.ink
  },
  badge: {
    ...typography.label,
    color: colors.onAccent,
    fontSize: 11,
    overflow: "hidden",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3
  },
  highBadge: {
    backgroundColor: colors.danger
  },
  defaultBadge: {
    backgroundColor: colors.warning
  },
  meta: {
    ...typography.label,
    color: colors.muted
  },
  body: {
    ...typography.body,
    color: colors.ink
  },
  example: {
    ...typography.body,
    color: colors.primaryDark
  }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
