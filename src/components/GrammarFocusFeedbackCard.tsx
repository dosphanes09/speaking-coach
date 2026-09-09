import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GrammarFocusFeedback } from "@/types/models";
import { AppColors, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Card } from "./Card";

interface GrammarFocusFeedbackCardProps {
  feedback: GrammarFocusFeedback;
}

export function GrammarFocusFeedbackCard({
  feedback
}: GrammarFocusFeedbackCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Card style={styles.card}>
      <FeedbackBlock colors={colors} label="Expected grammar used?" value={feedback.expectedGrammarUsed} />
      <FeedbackBlock colors={colors} label="Tense accuracy" value={feedback.tenseAccuracy} />
      <ListBlock colors={colors} label="Missed grammar opportunities" items={feedback.missedGrammarOpportunities} />
      <ListBlock colors={colors} label="Better sentence alternatives" items={feedback.betterSentenceAlternatives} />
      <ListBlock colors={colors} label="Level-appropriate suggestions" items={feedback.levelAppropriateSuggestions} />
    </Card>
  );
}

function FeedbackBlock({
  colors,
  label,
  value
}: {
  colors: AppColors;
  label: string;
  value: string;
}): React.JSX.Element {
  const styles = createStyles(colors);

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
}

function ListBlock({
  colors,
  label,
  items
}: {
  colors: AppColors;
  label: string;
  items: string[];
}): React.JSX.Element | null {
  const styles = createStyles(colors);

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.listItem}>
          {item}
        </Text>
      ))}
    </View>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    gap: spacing.sm
  },
  block: {
    gap: spacing.xs
  },
  label: {
    ...typography.label,
    color: colors.muted
  },
  body: {
    ...typography.bodyLarge,
    color: colors.ink
  },
  listItem: {
    ...typography.bodyLarge,
    color: colors.ink
  }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
