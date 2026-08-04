import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { GrammarTopicCard } from "@/components/GrammarTopicCard";
import { Header } from "@/components/Header";
import { SectionTitle } from "@/components/SectionTitle";
import { SpeakingChallengeCard } from "@/components/SpeakingChallengeCard";
import { GrammarLevelContent, GrammarSpeakingChallenge } from "@/data/grammarRoadmap";
import { SpeakingRecord } from "@/types/models";
import { formatScore100, normalizeScores } from "@/services/progress/scoreUtils";
import { AppColors, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

interface GrammarLevelScreenProps {
  levelContent: GrammarLevelContent;
  recentChallengeIds?: string[];
  levelRecords: SpeakingRecord[];
  onBack: () => void;
  onStartChallenge: (challenge: GrammarSpeakingChallenge) => void;
}

export function GrammarLevelScreen({
  levelContent,
  recentChallengeIds = [],
  levelRecords,
  onBack,
  onStartChallenge
}: GrammarLevelScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [activeChallenge, setActiveChallenge] = useState<GrammarSpeakingChallenge>(
    () => pickRandomChallenge(levelContent.speakingChallenges, undefined, recentChallengeIds)
  );

  useEffect(() => {
    setActiveChallenge(pickRandomChallenge(levelContent.speakingChallenges, undefined, recentChallengeIds));
  }, [levelContent, recentChallengeIds]);

  function showNewQuestion(): void {
    setActiveChallenge((current) =>
      pickRandomChallenge(levelContent.speakingChallenges, current.id, recentChallengeIds)
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header
        title={`${levelContent.level} Grammar`}
        subtitle={levelContent.title}
        onBack={onBack}
      />

      <Card style={styles.summaryCard}>
        <Text style={styles.summary}>{levelContent.summary}</Text>
        <Text style={styles.meta}>
          {levelContent.topics.length} tense topics / {levelContent.speakingChallenges.length} speaking challenges
        </Text>
        <Text style={styles.scoreMeta}>
          {levelRecords.length} records / Average {levelRecords.length ? formatScore100(averageOverallScore(levelRecords)) : "-"}
        </Text>
      </Card>

      <SectionTitle>Tense Topics</SectionTitle>
      <View style={styles.stack}>
        {levelContent.topics.map((topic) => (
          <GrammarTopicCard
            key={topic.id}
            level={levelContent.level}
            topic={topic}
            onStartChallenge={onStartChallenge}
          />
        ))}
      </View>

      <SectionTitle>Level Speaking Challenges</SectionTitle>
      <Card style={styles.challengeIntroCard}>
        <Text style={styles.challengeIntroTitle}>Random speaking question</Text>
        <Text style={styles.challengeIntroText}>
          Practice one level-appropriate question at a time. Change the question whenever you want.
        </Text>
      </Card>
      <SpeakingChallengeCard challenge={activeChallenge} onStart={onStartChallenge} />
      <AppButton label="New Question" onPress={showNewQuestion} variant="ghost" />
    </ScrollView>
  );
}

function averageOverallScore(records: SpeakingRecord[]): number {
  if (records.length === 0) {
    return 0;
  }

  return records.reduce((sum, record) => sum + normalizeScores(record.scores).overall, 0) / records.length;
}

function pickRandomChallenge(
  challenges: GrammarSpeakingChallenge[],
  currentId?: string,
  recentChallengeIds: string[] = []
): GrammarSpeakingChallenge {
  if (challenges.length === 0) {
    return {
      id: "fallback-speaking-challenge",
      prompt: "Talk about what you learned in this grammar level.",
      grammarTopic: "General grammar review",
      expectedStructures: ["target tense", "clear examples", "connectors"]
    };
  }

  const blockedIds = new Set([currentId, ...recentChallengeIds].filter(Boolean));
  const freshChallenges = challenges.filter((challenge) => !blockedIds.has(challenge.id));
  const availableChallenges =
    freshChallenges.length > 0
      ? freshChallenges
      : challenges.length > 1
        ? challenges.filter((challenge) => challenge.id !== currentId)
        : challenges;
  const randomIndex = Math.floor(Math.random() * availableChallenges.length);

  return availableChallenges[randomIndex] ?? challenges[0]!;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  summaryCard: {
    gap: spacing.sm
  },
  summary: {
    ...typography.bodyLarge,
    color: colors.ink
  },
  meta: {
    ...typography.label,
    color: colors.primaryDark
  },
  scoreMeta: {
    ...typography.bodyStrong,
    color: colors.accent
  },
  stack: {
    gap: spacing.sm
  },
  challengeIntroCard: {
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted
  },
  challengeIntroTitle: {
    ...typography.h2,
    color: colors.ink
  },
  challengeIntroText: {
    ...typography.body,
    color: colors.muted
  }
  });
}
