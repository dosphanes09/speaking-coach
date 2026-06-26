import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { grammarRoadmap } from "@/data/grammarRoadmap";
import { getGrammarRecordLevel } from "@/services/records/recordClassification";
import { formatScore100, normalizeScores } from "@/services/progress/scoreUtils";
import { GrammarLevel, SpeakingRecord } from "@/types/models";
import { AppColors, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";

interface GrammarHomeScreenProps {
  grammarRecords: SpeakingRecord[];
  onBack: () => void;
  onOpenDrawer?: () => void;
  onSelectLevel: (level: GrammarLevel) => void;
}

export function GrammarHomeScreen({
  grammarRecords,
  onBack,
  onOpenDrawer,
  onSelectLevel
}: GrammarHomeScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header
        title="Grammar Roadmap"
        subtitle="A1-C2 tense practice for speaking"
        onBack={onOpenDrawer ? undefined : onBack}
        onMenuPress={onOpenDrawer}
      />

      <View style={styles.grid}>
        {grammarRoadmap.map((level) => {
          const levelRecords = grammarRecords.filter((record) => getGrammarRecordLevel(record) === level.level);
          const averageScore = averageOverallScore(levelRecords);

          return (
            <Pressable
              key={level.level}
              accessibilityRole="button"
              onPress={() => onSelectLevel(level.level)}
              style={({ pressed }) => [styles.levelPressable, pressed && styles.pressed]}
            >
              <Card style={styles.levelCard}>
                <Text style={styles.level}>{level.level}</Text>
                <Text style={styles.title}>{level.title}</Text>
                <Text style={styles.summary}>{level.summary}</Text>
                <Text style={styles.meta}>
                  {level.topics.length} topics / {level.speakingChallenges.length} challenges
                </Text>
                <Text style={styles.scoreMeta}>
                  {levelRecords.length} kayıt / Ortalama {levelRecords.length ? formatScore100(averageScore) : "-"}
                </Text>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function averageOverallScore(records: SpeakingRecord[]): number {
  if (records.length === 0) {
    return 0;
  }

  return records.reduce((sum, record) => sum + normalizeScores(record.scores).overall, 0) / records.length;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.screen,
      gap: spacing.md
    },
    grid: {
      gap: spacing.sm
    },
    levelPressable: {
      width: "100%"
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }]
    },
    levelCard: {
      gap: spacing.sm
    },
    level: {
      color: colors.primaryDark,
      fontSize: 24,
      fontWeight: "800"
    },
    title: {
      color: colors.ink,
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 24
    },
    summary: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 23
    },
    meta: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    scoreMeta: {
      color: colors.primaryDark,
      fontSize: 14,
      fontWeight: "700"
    }
  });
}
