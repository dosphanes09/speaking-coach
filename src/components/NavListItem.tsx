import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Icon, IconName } from "./Icon";
import { IconBadge } from "./IconBadge";

interface NavListItemProps {
  label: string;
  sublabel?: string;
  iconName: IconName;
  iconColor: string;
  iconBackground: string;
  onPress: () => void;
  accessibilityLabel?: string;
  isLast?: boolean;
}

/**
 * A single tappable row inside a `NavListCard` — icon badge, title/sublabel,
 * trailing chevron. Used to consolidate what used to be a mix of shortcut
 * cards and ghost buttons into one consistent list pattern.
 */
export function NavListItem({
  label,
  sublabel,
  iconName,
  iconColor,
  iconBackground,
  onPress,
  accessibilityLabel,
  isLast = false
}: NavListItemProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowDivider,
        pressed && styles.rowPressed
      ]}
    >
      <IconBadge name={iconName} color={iconColor} backgroundColor={iconBackground} />
      <View style={styles.textBlock}>
        <Text style={styles.title}>{label}</Text>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
      <Icon name="chevron-right" size={18} color={colors.muted} />
    </Pressable>
  );
}

export function NavListCard({ children }: { children: React.ReactNode }): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return <View style={styles.card}>{children}</View>;
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: "hidden",
      shadowColor: "#000000",
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 1
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.line
    },
    rowPressed: {
      opacity: 0.7
    },
    textBlock: {
      flex: 1
    },
    title: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    sublabel: {
      ...typography.caption,
      color: colors.muted,
      marginTop: 1
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
