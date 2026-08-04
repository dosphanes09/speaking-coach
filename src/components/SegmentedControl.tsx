import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";

interface SegmentedControlProps<T extends string> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
  disabled = false
}: SegmentedControlProps<T>): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            onPress={() => onChange(option)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selected,
              pressed && !disabled && styles.pressed,
              disabled && styles.disabled
            ]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{labels?.[option] ?? option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 4,
      gap: 4
    },
    option: {
      flex: 1,
      minHeight: 44,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.sm
    },
    selected: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line
    },
    pressed: {
      opacity: 0.88
    },
    disabled: {
      opacity: 0.55
    },
    label: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: "600"
    },
    selectedLabel: {
      color: colors.ink,
      fontWeight: "700"
    }
  });
}
