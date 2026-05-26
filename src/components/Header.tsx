import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/theme/colors";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
}

export function Header({
  title,
  subtitle,
  onBack,
  rightLabel,
  onRightPress
}: HeaderProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        {rightLabel && onRightPress ? (
          <Pressable accessibilityRole="button" onPress={onRightPress} style={styles.rightButton}>
            <Text style={styles.rightText}>{rightLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 36
  },
  backButton: {
    minHeight: 36,
    justifyContent: "center"
  },
  backText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "700"
  },
  rightButton: {
    minHeight: 36,
    justifyContent: "center"
  },
  rightText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700"
  },
  backPlaceholder: {
    minWidth: 48
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22
  }
});
