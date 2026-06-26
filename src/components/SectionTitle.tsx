import React from "react";
import { StyleSheet, Text } from "react-native";
import { AppColors, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";

export function SectionTitle({ children }: { children: string }): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return <Text style={styles.title}>{children}</Text>;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    title: {
      color: colors.ink,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "800",
      marginTop: spacing.sm
    }
  });
}
