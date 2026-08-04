import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icon";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

interface PracticeModesScreenProps {
  onBack: () => void;
  onPictureDescription: () => void;
  onListeningGame: () => void;
}

export function PracticeModesScreen({
  onBack,
  onPictureDescription,
  onListeningGame
}: PracticeModesScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header title="Practice Modes" subtitle="Choose a focused speaking or listening practice." onBack={onBack} />

      <ModeCard
        title="Describe a Picture"
        subtitle="Look at a local picture prompt, prepare your ideas, record your answer, and get targeted feedback."
        badge="Speaking"
        colors={colors}
        styles={styles}
        onPress={onPictureDescription}
        visual={<Icon name="image" size={36} color={colors.primaryDark} />}
      />

      <ModeCard
        title="Listen & Choose the Picture"
        subtitle="Listen to an English description, select the matching picture, and review the vocabulary clues."
        badge="Listening"
        colors={colors}
        styles={styles}
        onPress={onListeningGame}
        visual={<Icon name="headphones" size={36} color={colors.accent} />}
      />
    </ScrollView>
  );
}

function ModeCard({
  title,
  subtitle,
  badge,
  visual,
  onPress,
  styles
}: {
  title: string;
  subtitle: string;
  badge: string;
  visual: React.ReactNode;
  colors: AppColors;
  styles: PracticeModesStyles;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.modeCard}>
        <View style={styles.modeVisual}>{visual}</View>
        <View style={styles.modeText}>
          <Text style={styles.badge}>{badge}</Text>
          <Text style={styles.modeTitle}>{title}</Text>
          <Text style={styles.modeSubtitle}>{subtitle}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

type PracticeModesStyles = ReturnType<typeof createStyles>;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.md,
      gap: spacing.md
    },
    pressed: {
      opacity: 0.86,
      transform: [{ scale: 0.99 }]
    },
    modeCard: {
      flexDirection: "row",
      gap: spacing.md,
      alignItems: "center"
    },
    modeVisual: {
      width: 88,
      minHeight: 88,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center"
    },
    modeText: {
      flex: 1,
      gap: spacing.xs
    },
    badge: {
      ...typography.label,
      color: colors.primaryDark
    },
    modeTitle: {
      ...typography.h1,
      color: colors.ink
    },
    modeSubtitle: {
      ...typography.body,
      color: colors.muted
    }
  });
}
