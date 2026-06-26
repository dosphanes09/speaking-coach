import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Topic } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      gap: spacing.sm,
      backgroundColor: colors.surface
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    eyebrow: {
      flex: 1,
      color: colors.primaryDark,
      fontSize: 14,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    badge: {
      overflow: "hidden",
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceMuted,
      color: colors.primaryDark,
      fontSize: 14,
      fontWeight: "700",
      paddingHorizontal: spacing.sm,
      paddingVertical: 4
    },
    question: {
      color: colors.ink,
      fontSize: 22,
      lineHeight: 29,
      fontWeight: "800"
    },
    helper: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "400"
    }
  });
}
