import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors, useThemeMode } from "@/theme/ThemeProvider";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onMenuPress?: () => void;
  rightLabel?: string;
  rightIcon?: string;
  onRightPress?: () => void;
}

export function Header({
  title,
  subtitle,
  onBack,
  onMenuPress,
  rightLabel,
  rightIcon,
  onRightPress
}: HeaderProps): React.JSX.Element {
  const colors = useThemeColors();
  const themeMode = useThemeMode();
  const styles = createStyles(colors);
  const resolvedRightIcon = rightIcon ?? resolveActionIcon(rightLabel);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            hitSlop={4}
            style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
          >
            <Text style={styles.navIcon}>‹</Text>
            <Text style={styles.navText}>Back</Text>
          </Pressable>
        ) : onMenuPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Menüyü aç"
            onPress={onMenuPress}
            hitSlop={4}
            style={({ pressed }) => [styles.navButton, styles.menuButton, pressed && styles.navButtonPressed]}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>
        ) : (
          <View style={styles.navPlaceholder} />
        )}

        {rightLabel && onRightPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightLabel}
            onPress={onRightPress}
            hitSlop={4}
            style={({ pressed }) => [styles.navButton, styles.rightButton, pressed && styles.navButtonPressed]}
          >
            {resolvedRightIcon ? <Text style={styles.rightIcon}>{resolvedRightIcon}</Text> : null}
            <Text style={styles.rightText}>{rightLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.navPlaceholder} />
        )}
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {themeMode === "love" ? <Text style={styles.titleHeart}>♥</Text> : null}
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function resolveActionIcon(label?: string): string | undefined {
  const normalizedLabel = label?.toLowerCase();
  if (normalizedLabel === "settings") {
    return "⚙";
  }
  if (normalizedLabel === "clear") {
    return "×";
  }
  return undefined;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      gap: spacing.xs
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: 44
    },
    navButton: {
      minHeight: 44,
      minWidth: 84,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      gap: spacing.xs,
      shadowColor: "#000000",
      shadowOpacity: 0.02,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 0
    },
    navButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.985 }]
    },
    navIcon: {
      color: colors.primaryDark,
      fontSize: 24,
      lineHeight: 24,
      fontWeight: "700"
    },
    navText: {
      color: colors.primaryDark,
      fontSize: 14,
      fontWeight: "700"
    },
    rightButton: {
      minWidth: 96
    },
    menuButton: {
      minWidth: 48,
      width: 48,
      paddingHorizontal: 0
    },
    menuIcon: {
      color: colors.primaryDark,
      fontSize: 22,
      lineHeight: 24,
      fontWeight: "800"
    },
    rightIcon: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: "700"
    },
    rightText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: "700"
    },
    navPlaceholder: {
      minWidth: 84
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs
    },
    title: {
      flexShrink: 1,
      color: colors.ink,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "800"
    },
    titleHeart: {
      color: colors.accent,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "700"
    },
    subtitle: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "400"
    }
  });
}
