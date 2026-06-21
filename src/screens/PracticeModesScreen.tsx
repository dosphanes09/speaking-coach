import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { AppColors, radius, spacing } from "@/theme/colors";
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
        visual={<PictureModeIcon colors={colors} />}
      />

      <ModeCard
        title="Listen & Choose the Picture"
        subtitle="Listen to an English description, select the matching picture, and review the vocabulary clues."
        badge="Listening"
        colors={colors}
        styles={styles}
        onPress={onListeningGame}
        visual={<ListeningModeIcon colors={colors} />}
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

function PictureModeIcon({ colors }: { colors: AppColors }): React.JSX.Element {
  return (
    <View style={[iconStyles.iconFrame, { borderColor: colors.primaryDark }]}>
      <View style={[iconStyles.sun, { backgroundColor: colors.secondary }]} />
      <View style={[iconStyles.mountain, { backgroundColor: colors.primary }]} />
      <View style={[iconStyles.mountainSmall, { backgroundColor: colors.accent }]} />
    </View>
  );
}

function ListeningModeIcon({ colors }: { colors: AppColors }): React.JSX.Element {
  return (
    <View style={iconStyles.listenWrap}>
      <View style={[iconStyles.speaker, { backgroundColor: colors.accent }]} />
      <View style={[iconStyles.soundOne, { borderColor: colors.primaryDark }]} />
      <View style={[iconStyles.soundTwo, { borderColor: colors.primaryDark }]} />
    </View>
  );
}

type PracticeModesStyles = ReturnType<typeof createStyles>;

const iconStyles = StyleSheet.create({
  iconFrame: {
    width: 74,
    height: 58,
    borderWidth: 3,
    borderRadius: radius.md,
    overflow: "hidden"
  },
  sun: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 14,
    height: 14,
    borderRadius: 7
  },
  mountain: {
    position: "absolute",
    left: 8,
    bottom: -8,
    width: 44,
    height: 44,
    transform: [{ rotate: "45deg" }]
  },
  mountainSmall: {
    position: "absolute",
    right: 6,
    bottom: -6,
    width: 34,
    height: 34,
    transform: [{ rotate: "45deg" }]
  },
  listenWrap: {
    width: 74,
    height: 58,
    alignItems: "center",
    justifyContent: "center"
  },
  speaker: {
    width: 28,
    height: 34,
    borderRadius: 8
  },
  soundOne: {
    position: "absolute",
    right: 16,
    width: 24,
    height: 34,
    borderRightWidth: 3,
    borderRadius: 18
  },
  soundTwo: {
    position: "absolute",
    right: 7,
    width: 38,
    height: 48,
    borderRightWidth: 3,
    borderRadius: 24
  }
});

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
      color: colors.primaryDark,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    modeTitle: {
      color: colors.ink,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "900"
    },
    modeSubtitle: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20
    }
  });
}
