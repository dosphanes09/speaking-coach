import React from "react";
import { StyleSheet, Text } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { GrammarSpeakingChallenge } from "@/data/grammarRoadmap";
import { AppColors, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

interface SpeakingChallengeCardProps {
  challenge: GrammarSpeakingChallenge;
  onStart: (challenge: GrammarSpeakingChallenge) => void;
}

export function SpeakingChallengeCard({
  challenge,
  onStart
}: SpeakingChallengeCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Card style={styles.card}>
      <Text style={styles.prompt}>{challenge.prompt}</Text>
      <Text style={styles.meta}>{challenge.grammarTopic}</Text>
      <Text style={styles.expected}>{challenge.expectedStructures.join(" / ")}</Text>
      <AppButton label="Start Speaking Practice" onPress={() => onStart(challenge)} variant="secondary" />
    </Card>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    gap: spacing.sm
  },
  prompt: {
    ...typography.h2,
    color: colors.ink
  },
  meta: {
    ...typography.label,
    color: colors.primaryDark
  },
  expected: {
    ...typography.caption,
    color: colors.muted
  }
  });
}
