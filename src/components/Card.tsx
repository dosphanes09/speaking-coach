import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1
  }
  });
}
