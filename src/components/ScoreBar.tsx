import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { DimensionValue } from "react-native";
import { colors, radius, spacing } from "@/theme/colors";

interface ScoreBarProps {
  label: string;
  value: number;
}

export function ScoreBar({ label, value }: ScoreBarProps): React.JSX.Element {
  const width = `${Math.max(0, Math.min(10, value)) * 10}%` as DimensionValue;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value.toFixed(1)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  value: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  track: {
    height: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    overflow: "hidden"
  },
  fill: {
    height: 8,
    backgroundColor: colors.primary
  }
});
