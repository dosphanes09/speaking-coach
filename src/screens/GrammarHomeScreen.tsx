import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { grammarRoadmap } from "@/data/grammarRoadmap";
import { getGrammarRecordLevel } from "@/services/records/recordClassification";
import { formatScore100, normalizeScores } from "@/services/progress/scoreUtils";
import { GrammarLevel, SpeakingRecord } from "@/types/models";
import { AppColors, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

interface GrammarHomeScreenProps {
  grammarRecords: SpeakingRecord[];
  onBack: () => void;
  onSelectLevel: (level: GrammarLevel) => void;
}

export function GrammarHomeScreen({
  grammarRecords,
  onBack,
  onSelectLevel
}: GrammarHomeScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Grammar Roadmap" subtitle="A1-C2 tense practice for speaking" onBack={onBack} />

      <View style={styles.grid}>
        {grammarRoadmap.map((level) => {
          const levelRecords = grammarRecords.filter((record) => getGrammarRecordLevel(record) === level.level);
          const averageScore = averageOverallScore(levelRecords);

          return (
            <Pressable
              key={level.level}
              accessibilityRole="button"
              onPress={() => onSelectLevel(level.level)}
              style={styles.levelPressable}
            >
              <Card style={styles.levelCard}>
                <Text style={styles.level}>{level.level}</Text>
                <Text style={styles.title}>{level.title}</Text>
                <Text style={styles.summary}>{level.summary}</Text>
                <Text style={styles.meta}>
                  {level.topics.length} topics / {level.speakingChallenges.length} challenges
                </Text>
                <Text style={styles.scoreMeta}>
                  {levelRecords.length} records / Average {levelRecords.length ? formatScore100(averageScore) : "-"}
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
      padding: spacing.md,
      gap: spacing.md
    },
    grid: {
      gap: spacing.sm
    },
    levelPressable: {
      width: "100%"
    },
    levelCard: {
      gap: spacing.sm
    },
    level: {
      ...typography.display,
      color: colors.primaryDark
    },
    title: {
      ...typography.h2,
      color: colors.ink
    },
    summary: {
      ...typography.bodyLarge,
      color: colors.muted
    },
    meta: {
      ...typography.label,
      color: colors.accent
    },
    scoreMeta: {
      ...typography.bodyStrong,
      color: colors.primaryDark
    }
  });
}
