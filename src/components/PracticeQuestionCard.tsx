import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Topic } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Card } from "./Card";

interface PracticeQuestionCardProps {
  topic: Topic;
  phase: "thinking" | "recording";
}

export function PracticeQuestionCard({ topic, phase }: PracticeQuestionCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const contextLabel = getContextLabel(topic);
  const helperText = getHelperText(topic, phase);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>{phase === "thinking" ? "Your speaking question" : "Keep answering this question"}</Text>
        <Text style={styles.badge}>{contextLabel}</Text>
      </View>
      <Text style={styles.question}>{getQuestionText(topic)}</Text>
      <Text style={styles.helper}>{helperText}</Text>
    </Card>
  );
}

function getQuestionText(topic: Topic): string {
  if (topic.grammarFocus?.speakingPrompt) {
    return topic.grammarFocus.speakingPrompt;
  }

  if (topic.picturePromptContext) {
    return topic.title;
  }

  return topic.title;
}

function getContextLabel(topic: Topic): string {
  if (topic.grammarFocus) {
    return `${topic.grammarFocus.cefrLevel} Grammar`;
  }

  if (topic.picturePromptContext) {
    return `${topic.level} Picture`;
  }

  return `${topic.level} Speaking`;
}

function getHelperText(topic: Topic, phase: PracticeQuestionCardProps["phase"]): string {
  if (topic.picturePromptContext) {
    return phase === "thinking"
      ? "Prepare details from the picture: what you see, what may be happening, and one inference."
      : "Describe the picture with details, reasons, and one possible inference.";
  }

  if (topic.grammarFocus) {
    const structures = topic.grammarFocus.expectedStructures.slice(0, 3).join(", ");
    return structures
      ? `Try to use: ${structures}.`
      : "Answer naturally while using the target grammar.";
  }

  return phase === "thinking"
    ? "Prepare a main idea, one reason, and one example."
    : "Keep speaking until the timer ends. Add reasons, examples, and details.";
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      gap: spacing.sm,
      backgroundColor: colors.surfaceMuted
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    eyebrow: {
      ...typography.label,
      flex: 1,
      color: colors.primaryDark
    },
    badge: {
      ...typography.label,
      overflow: "hidden",
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      color: colors.primaryDark,
      fontSize: 12,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4
    },
    question: {
      ...typography.display,
      color: colors.ink
    },
    helper: {
      ...typography.body,
      color: colors.muted,
      fontWeight: "700"
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
