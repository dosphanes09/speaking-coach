import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { AppColors, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * A full lesson is far too long to scroll through on a phone in one piece, so each section
 * collapses. Only the sections a learner starts with (warm-up, reading) are open by default.
 */
export function CollapsibleCard({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children
}: CollapsibleCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${title}, ${isOpen ? "collapse" : "expand"}`}
        onPress={() => setIsOpen((current) => !current)}
        hitSlop={4}
        style={({ pressed }) => [styles.headerRow, pressed && styles.pressed]}
      >
        <View style={styles.headerText}>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.primaryDark} />
      </Pressable>
      {isOpen ? <View style={styles.body}>{children}</View> : null}
    </Card>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      gap: spacing.sm
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: 44
    },
    pressed: {
      opacity: 0.86
    },
    headerText: {
      flex: 1,
      gap: 2
    },
    badge: {
      ...typography.label,
      color: colors.primaryDark
    },
    title: {
      ...typography.h2,
      color: colors.ink
    },
    subtitle: {
      ...typography.caption,
      color: colors.muted
    },
    body: {
      gap: spacing.sm,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.line
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
