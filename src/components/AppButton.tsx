import React from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { Icon, IconName } from "@/components/Icon";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
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
  const iconColor = isGhost ? colors.primaryDark : "#FFFFFF";

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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    base: {
      borderRadius: radius.lg,
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
      borderColor: colors.line,
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
      color: "#FFFFFF",
      fontSize: 16,
      textAlign: "center"
    },
    ghostLabel: {
      color: colors.primaryDark
    }
  });
}
