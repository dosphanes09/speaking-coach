import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { AppColors, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";

interface LearningScreenProps {
  onBack: () => void;
  onGrammarRoadmap: () => void;
}

export function LearningScreen({
  onBack,
  onGrammarRoadmap
}: LearningScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Learning" subtitle="Grammar lessons and guided speaking tasks" onBack={onBack} />

      <Card style={styles.heroCard}>
        <Text style={styles.kicker}>Grammar Roadmap</Text>
        <Text style={styles.title}>A1-C2 tense practice</Text>
        <Text style={styles.body}>
          Learn each tense with structure, common mistakes, speaking patterns, and level-based speaking prompts.
        </Text>
        <AppButton label="Open Grammar Roadmap" onPress={onGrammarRoadmap} />
      </Card>

      <View style={styles.grid}>
        <Card style={styles.smallCard}>
          <Text style={styles.smallValue}>6</Text>
          <Text style={styles.smallLabel}>CEFR levels</Text>
        </Card>
        <Card style={styles.smallCard}>
          <Text style={styles.smallValue}>Tense</Text>
          <Text style={styles.smallLabel}>focused roadmap</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  content: {
    padding: spacing.screen,
    gap: spacing.md
  },
  heroCard: {
    gap: spacing.sm
  },
  kicker: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800"
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23
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
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800"
  },
  smallLabel: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600"
  }
  });
}
