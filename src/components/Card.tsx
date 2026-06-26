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
      padding: spacing.card,
      shadowColor: "#000000",
      shadowOpacity: 0.025,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 0
    }
  });
}
