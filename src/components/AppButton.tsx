import React from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { Icon, IconName } from "@/components/Icon";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { BUTTON_MAX_WIDTH } from "@/theme/layout";
import { useThemeColors } from "@/theme/ThemeProvider";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "regular" | "compact";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  label,
  onPress,
  variant = "primary",
  size = "regular",
  icon,
  disabled = false,
  loading = false,
  accessibilityLabel,
  style
}: AppButtonProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const isDisabled = disabled || loading;
  const isGhost = variant === "ghost";
  const iconColor = isGhost ? colors.primaryDark : colors.onAccent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style
      ]}
    >
      {loading ? <ActivityIndicator color={iconColor} /> : null}
      {!loading && icon ? <Icon name={icon} size={17} color={iconColor} /> : null}
      <Text style={[styles.label, isGhost && styles.ghostLabel]}>{label}</Text>
    </Pressable>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    base: {
      borderRadius: radius.lg,
      // A full-bleed button is right on a phone, where it fills a 350pt row and
      // sits under the thumb. Stretched to 630pt on desktop the same button
      // becomes a wide bar with a small label marooned in the middle, and it
      // stops reading as something you click. Capping the width and centring it
      // keeps the phone behaviour intact — the cap is above any phone width —
      // while giving the desktop a button-shaped button.
      maxWidth: BUTTON_MAX_WIDTH,
      width: "100%",
      alignSelf: "center",
      paddingHorizontal: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing.sm,
      borderWidth: 1,
      shadowColor: "#000000",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2
    },
    regular: {
      minHeight: 52,
      paddingVertical: spacing.sm
    },
    compact: {
      minHeight: 44,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md
    },
    primary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    secondary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    ghost: {
      backgroundColor: colors.surface,
      // A ghost button has no fill, so its outline is the only thing saying it
      // is a button — that is exactly the case WCAG asks 3:1 of.
      borderColor: colors.lineStrong,
      shadowOpacity: 0.04,
      elevation: 1
    },
    danger: {
      backgroundColor: colors.danger,
      borderColor: colors.danger
    },
    disabled: {
      opacity: 0.5
    },
    pressed: {
      opacity: 0.88,
      transform: [{ scale: 0.985 }]
    },
    label: {
      ...typography.bodyStrong,
      color: colors.onAccent,
      fontSize: 16,
      textAlign: "center"
    },
    ghostLabel: {
      color: colors.primaryDark
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
