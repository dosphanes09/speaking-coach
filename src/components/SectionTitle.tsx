import React from "react";
import { StyleSheet, Text } from "react-native";
import { AppColors, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

export function SectionTitle({ children }: { children: string }): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return <Text style={styles.title}>{children}</Text>;
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
  title: {
    ...typography.h2,
    color: colors.ink,
    marginTop: spacing.sm
  }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
