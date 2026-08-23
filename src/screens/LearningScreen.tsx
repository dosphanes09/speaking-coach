import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { AppColors, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

interface LearningScreenProps {
  onBack: () => void;
  onGrammarRoadmap: () => void;
  onDailyLesson: () => void;
}

export function LearningScreen({
  onBack,
  onGrammarRoadmap,
  onDailyLesson
}: LearningScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Learning" subtitle="Grammar lessons and guided speaking tasks" onBack={onBack} />

      <Card style={styles.heroCard}>
        <Text style={styles.kicker}>Daily Lesson</Text>
        <Text style={styles.title}>A lesson written for you today</Text>
        <Text style={styles.body}>
          Tell it what you did today and it writes one complete lesson around that: a reading text, the
          vocabulary and pronunciation from it, one grammar focus, exercises with an answer key, and three
          speaking tasks you record right here.
        </Text>
        <AppButton label="Open Daily Lesson" icon="book-open" onPress={onDailyLesson} />
      </Card>

      <Card style={styles.heroCard}>
        <Text style={styles.kicker}>Grammar Roadmap</Text>
        <Text style={styles.title}>A1-C2 tense practice</Text>
        <Text style={styles.body}>
          Learn each tense with structure, common mistakes, speaking patterns, and level-based speaking prompts.
        </Text>
        <AppButton label="Open Grammar Roadmap" variant="ghost" onPress={onGrammarRoadmap} />
      </Card>

      <View style={styles.grid}>
        <Card style={styles.smallCard}>
          <Text style={styles.smallValue}>6</Text>
          <Text style={styles.smallLabel}>CEFR levels</Text>
        </Card>
        <Card style={styles.smallCard}>
          <Text style={styles.smallValue}>Daily</Text>
          <Text style={styles.smallLabel}>personalised lesson</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md
  },
  heroCard: {
    gap: spacing.sm
  },
  kicker: {
    ...typography.label,
    color: colors.primaryDark
  },
  title: {
    ...typography.display,
    color: colors.ink
  },
  body: {
    ...typography.bodyLarge,
    color: colors.muted
  },
  grid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  smallCard: {
    flex: 1,
    minHeight: 92,
    justifyContent: "center"
  },
  smallValue: {
    ...typography.h1,
    color: colors.ink
  },
  smallLabel: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "700"
  }
  });
}
