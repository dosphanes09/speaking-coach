import React from "react";
import { StyleSheet, Text } from "react-native";
import { colors, spacing } from "@/theme/colors";

export function SectionTitle({ children }: { children: string }): React.JSX.Element {
  return <Text style={styles.title}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    marginTop: spacing.sm
  }
});
