import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Header } from "@/components/Header";
import { PicturePromptCard } from "@/components/PicturePromptCard";
import { SegmentedControl } from "@/components/SegmentedControl";
import { getRandomPicturePrompt, PICTURE_LEVELS } from "@/data/picturePrompts";
import { PicturePrompt, TopicLevel } from "@/types/models";
import { AppColors, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

interface PictureDescriptionScreenProps {
  targetLevel: TopicLevel;
  onBack: () => void;
  onStartPrompt: (prompt: PicturePrompt) => void;
}

export function PictureDescriptionScreen({
  targetLevel,
  onBack,
  onStartPrompt
}: PictureDescriptionScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [level, setLevel] = useState<TopicLevel>(targetLevel);
  const [prompt, setPrompt] = useState<PicturePrompt>(() => getRandomPicturePrompt(targetLevel));

  useEffect(() => {
    setPrompt(getRandomPicturePrompt(level));
  }, [level]);

  function showAnotherPicture(): void {
    setPrompt(getRandomPicturePrompt(level, prompt.id));
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header
        title="Describe a Picture"
        subtitle="Use the guide, then record your English description."
        onBack={onBack}
      />

      <View style={styles.levelBlock}>
        <Text style={styles.label}>Level</Text>
        <SegmentedControl options={PICTURE_LEVELS} value={level} onChange={setLevel} />
      </View>

      <PicturePromptCard prompt={prompt} />

      <View style={styles.actions}>
        <AppButton label="Start Speaking Practice" onPress={() => onStartPrompt(prompt)} />
        <AppButton label="Change Picture" onPress={showAnotherPicture} variant="ghost" />
      </View>
    </ScrollView>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.md,
      gap: spacing.md,
      paddingBottom: spacing.lg
    },
    levelBlock: {
      gap: spacing.sm
    },
    label: {
      ...typography.label,
      color: colors.muted
    },
    actions: {
      gap: spacing.sm
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
