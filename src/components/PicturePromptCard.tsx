import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { PictureSceneIllustration } from "@/components/PictureSceneIllustration";
import { PicturePrompt } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

interface PicturePromptCardProps {
  prompt: PicturePrompt;
}

export function PicturePromptCard({ prompt }: PicturePromptCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.level}>{prompt.level}</Text>
          <Text style={styles.title}>{prompt.title}</Text>
        </View>
      </View>

      <PictureSceneIllustration imageKey={prompt.imageSource} height={320} />

      <View style={styles.observeBox}>
        <Text style={styles.observeTitle}>Observe carefully</Text>
        <Text style={styles.observeText}>
          Look at the foreground, background, actions, objects, mood, and clues before you record.
        </Text>
      </View>

      <GuideBlock title="Speaking guide" items={prompt.learnerInstructions} styles={styles} />
      <GuideBlock title="Questions" items={prompt.speakingQuestions} styles={styles} />
      <GuideBlock title="Detail checklist" items={prompt.detailChecklist} styles={styles} />
      <GuideBlock title="Possible inferences" items={prompt.possibleInferences} styles={styles} />
      <GuideBlock title="Common mistakes to avoid" items={prompt.commonMistakes} styles={styles} />

      <View style={styles.chipSection}>
        <Text style={styles.sectionTitle}>Vocabulary</Text>
        <View style={styles.chipRow}>
          {prompt.suggestedVocabulary.map((item) => (
            <Text key={item} style={styles.chip}>
              {item}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.chipSection}>
        <Text style={styles.sectionTitle}>Target grammar</Text>
        <View style={styles.chipRow}>
          {prompt.targetGrammar.map((item) => (
            <Text key={item} style={styles.chip}>
              {item}
            </Text>
          ))}
        </View>
      </View>
    </Card>
  );
}

function GuideBlock({
  title,
  items,
  styles
}: {
  title: string;
  items: string[];
  styles: PicturePromptCardStyles;
}): React.JSX.Element {
  return (
    <View style={styles.guideBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.bullet}>
          - {item}
        </Text>
      ))}
    </View>
  );
}

type PicturePromptCardStyles = ReturnType<typeof createStyles>;

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      gap: spacing.md
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md
    },
    level: {
      ...typography.label,
      color: colors.primaryDark
    },
    title: {
      ...typography.display,
      color: colors.ink
    },
    guideBlock: {
      gap: spacing.xs
    },
    observeBox: {
      gap: spacing.xs,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      paddingLeft: spacing.sm
    },
    observeTitle: {
      ...typography.h2,
      color: colors.ink
    },
    observeText: {
      ...typography.body,
      color: colors.muted
    },
    sectionTitle: {
      ...typography.h2,
      color: colors.ink
    },
    bullet: {
      ...typography.body,
      color: colors.muted
    },
    chipSection: {
      gap: spacing.sm
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    chip: {
      ...typography.bodyStrong,
      overflow: "hidden",
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceMuted,
      color: colors.primaryDark,
      fontSize: 13,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
