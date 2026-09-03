import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, IconName } from "@/components/Icon";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors, useThemeMode } from "@/theme/ThemeProvider";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Text on the back button. The rhetoric module's UI is Turkish. */
  backLabel?: string;
  rightLabel?: string;
  rightIcon?: IconName;
  onRightPress?: () => void;
}

export function Header({
  title,
  subtitle,
  onBack,
  backLabel = "Back",
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
            accessibilityLabel={backLabel}
            onPress={onBack}
            hitSlop={4}
            style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
          >
            <Icon name="chevron-left" size={18} color={colors.primaryDark} />
            <Text style={styles.navText}>{backLabel}</Text>
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
            {resolvedRightIcon ? <Icon name={resolvedRightIcon} size={16} color={colors.accent} /> : null}
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

function resolveActionIcon(label?: string): IconName | undefined {
  const normalizedLabel = label?.toLowerCase();
  if (normalizedLabel === "settings") {
    return "settings";
  }
  if (normalizedLabel === "clear") {
    return "x";
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
    navText: {
      ...typography.bodyStrong,
      color: colors.primaryDark
    },
    rightButton: {
      minWidth: 96
    },
    rightText: {
      ...typography.bodyStrong,
      color: colors.accent
    },
    navPlaceholder: {
      minWidth: 88
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs
    },
    title: {
      ...typography.display,
      flexShrink: 1,
      color: colors.ink
    },
    titleHeart: {
      color: colors.accent,
      fontSize: 21,
      lineHeight: 28,
      fontWeight: "900"
    },
    subtitle: {
      ...typography.bodyLarge,
      color: colors.muted
    }
  });
}
