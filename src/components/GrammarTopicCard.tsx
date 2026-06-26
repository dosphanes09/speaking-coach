import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { GrammarSpeakingChallenge, GrammarTopic } from "@/data/grammarRoadmap";
import { GrammarLevel } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";

interface GrammarTopicCardProps {
  level: GrammarLevel;
  topic: GrammarTopic;
  onStartChallenge: (challenge: GrammarSpeakingChallenge) => void;
}

export function GrammarTopicCard({
  level,
  topic,
  onStartChallenge
}: GrammarTopicCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [isOpen, setIsOpen] = useState(false);
  const miniChallenge: GrammarSpeakingChallenge = {
    id: `${topic.id}-mini`,
    prompt: topic.miniChallenge,
    grammarTopic: topic.title,
    expectedStructures: [topic.title, topic.structure, ...topic.speakingPatterns.slice(0, 2)]
  };

  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen((current) => !current)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <View style={styles.headerCopy}>
          <Text style={styles.level}>{level}</Text>
          <Text style={styles.title}>{topic.title}</Text>
          <Text style={styles.coreFeeling}>{topic.coreFeeling}</Text>
        </View>
        <Text style={styles.toggle}>{isOpen ? "Hide" : "Open"}</Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.details}>
          <InfoBlock colors={colors} label="Structure" value={topic.structure} />
          <ListBlock colors={colors} label="Usage" items={topic.usage} />
          <ListBlock colors={colors} label="Examples" items={topic.examples} />
          <View style={styles.section}>
            <Text style={styles.label}>Common Mistakes</Text>
            {topic.commonMistakes.map((mistake) => (
              <View key={`${mistake.wrong}-${mistake.correct}`} style={styles.mistake}>
                <Text style={styles.wrong}>Wrong: {mistake.wrong}</Text>
                <Text style={styles.correct}>Correct: {mistake.correct}</Text>
              </View>
            ))}
          </View>
          <ListBlock colors={colors} label="Speaking Patterns" items={topic.speakingPatterns} />
          <View style={styles.section}>
            <Text style={styles.label}>Mini Challenge</Text>
            <Text style={styles.body}>{topic.miniChallenge}</Text>
            <AppButton
              label="Start Speaking Practice"
              onPress={() => onStartChallenge(miniChallenge)}
              variant="secondary"
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function InfoBlock({
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
    <View style={styles.section}>
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
}): React.JSX.Element {
  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.listItem}>
          {item}
        </Text>
      ))}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      gap: spacing.sm
    },
    header: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }]
    },
    headerCopy: {
      flex: 1,
      gap: spacing.xs
    },
    level: {
      color: colors.primaryDark,
      fontSize: 14,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    title: {
      color: colors.ink,
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 26
    },
    coreFeeling: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 23
    },
    toggle: {
      overflow: "hidden",
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      color: colors.primaryDark,
      fontSize: 14,
      fontWeight: "700",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs
    },
    details: {
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      paddingTop: spacing.md
    },
    section: {
      gap: spacing.xs
    },
    label: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    body: {
      color: colors.ink,
      fontSize: 16,
      lineHeight: 23
    },
    listItem: {
      color: colors.ink,
      fontSize: 16,
      lineHeight: 23
    },
    mistake: {
      gap: spacing.xs
    },
    wrong: {
      color: colors.danger,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "600"
    },
    correct: {
      color: colors.success,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "600"
    }
  });
}
