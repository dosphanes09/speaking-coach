import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PictureSceneIllustration } from "@/components/PictureSceneIllustration";
import { PicturePrompt } from "@/types/models";
import { AppColors, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

interface PictureChoiceGridProps {
  options: PicturePrompt[];
  selectedPictureId?: string;
  correctPictureId?: string;
  showResult?: boolean;
  onSelect: (pictureId: string) => void;
}

export function PictureChoiceGrid({
  options,
  selectedPictureId,
  correctPictureId,
  showResult = false,
  onSelect
}: PictureChoiceGridProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.grid}>
      {options.map((option) => {
        const selected = selectedPictureId === option.id;
        const correct = showResult && correctPictureId === option.id;
        const wrong = showResult && selected && correctPictureId !== option.id;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            disabled={showResult}
            onPress={() => onSelect(option.id)}
            style={({ pressed }) => [styles.choice, pressed && !showResult ? styles.pressed : null]}
          >
            <PictureSceneIllustration
              imageKey={option.imageSource}
              height={150}
              selected={selected && !showResult}
              correct={correct}
              wrong={wrong}
            />
            <Text style={styles.choiceTitle}>{option.title}</Text>
            <Text style={styles.choiceLevel}>{option.level}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    choice: {
      flexBasis: "47.5%",
      flexGrow: 1,
      gap: spacing.xs
    },
    pressed: {
      opacity: 0.82,
      transform: [{ scale: 0.99 }]
    },
    choiceTitle: {
      ...typography.bodyStrong,
      color: colors.ink,
      fontSize: 14
    },
    choiceLevel: {
      ...typography.caption,
      color: colors.muted
    }
  });
}
