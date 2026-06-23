import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightLabel?: string;
  rightIcon?: string;
  onRightPress?: () => void;
}

export function Header({
  title,
  subtitle,
  onBack,
  rightLabel,
  rightIcon,
  onRightPress
}: HeaderProps): React.JSX.Element {
  const colors = useThemeColors();
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
      <Text style={styles.title}>{title}</Text>
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
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
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
      minWidth: 88,
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
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1
    },
    navButtonPressed: {
      opacity: 0.86,
      transform: [{ scale: 0.985 }]
    },
    navIcon: {
      color: colors.primaryDark,
      fontSize: 24,
      lineHeight: 24,
      fontWeight: "900"
    },
    navText: {
      color: colors.primaryDark,
      fontSize: 15,
      fontWeight: "800"
    },
    rightButton: {
      minWidth: 96
    },
    rightIcon: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: "900"
    },
    rightText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: "800"
    },
    navPlaceholder: {
      minWidth: 88
    },
    title: {
      color: colors.ink,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "800"
    },
    subtitle: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 22
    }
  });
}
