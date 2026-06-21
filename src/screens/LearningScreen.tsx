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
    padding: spacing.md,
    gap: spacing.md
  },
  heroCard: {
    gap: spacing.sm
  },
  kicker: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
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
    fontWeight: "900"
  },
  smallLabel: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700"
  }
  });
}
