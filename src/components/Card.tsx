import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { useThemeColors } from "@/theme/ThemeProvider";

export function Card({ children, style, ...rest }: ViewProps): React.JSX.Element {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);

  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    shadowColor: "#000000",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1
  }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
