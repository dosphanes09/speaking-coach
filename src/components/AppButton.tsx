import React from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "regular" | "compact";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
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
  const usesDarkLabel = variant === "ghost" || variant === "secondary";

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
      {loading ? <ActivityIndicator color={usesDarkLabel ? colors.primaryDark : "#FFFFFF"} /> : null}
      {!loading && icon ? (
        <Text style={[styles.icon, usesDarkLabel && styles.subtleLabel]}>{icon}</Text>
      ) : null}
      <Text style={[styles.label, usesDarkLabel && styles.subtleLabel]}>{label}</Text>
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
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1
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
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.line
    },
    ghost: {
      backgroundColor: colors.surface,
      borderColor: colors.line,
      shadowOpacity: 0.02,
      elevation: 0
    },
    danger: {
      backgroundColor: colors.danger,
      borderColor: colors.danger
    },
    disabled: {
      opacity: 0.5
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.985 }]
    },
    label: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.1,
      textAlign: "center"
    },
    icon: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700"
    },
    subtleLabel: {
      color: colors.primaryDark
    }
  });
}
