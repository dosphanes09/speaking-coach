import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors, useThemeMode } from "@/theme/ThemeProvider";

export type BottomTabKey = "home" | "practice" | "grammar" | "chat";

interface BottomTabItem {
  key: BottomTabKey;
  label: string;
  icon: string;
  accessibilityLabel: string;
}

interface BottomTabBarProps {
  activeTab: BottomTabKey;
  onSelectTab: (tab: BottomTabKey) => void;
}

const TABS: BottomTabItem[] = [
  {
    key: "home",
    label: "Ana Sayfa",
    icon: "⌂",
    accessibilityLabel: "Ana Sayfa"
  },
  {
    key: "practice",
    label: "Pratik",
    icon: "▶",
    accessibilityLabel: "Pratik Modu"
  },
  {
    key: "grammar",
    label: "Gramer",
    icon: "Aa",
    accessibilityLabel: "Grammar Pratiği"
  },
  {
    key: "chat",
    label: "Sohbet",
    icon: "…",
    accessibilityLabel: "Anlık Sohbet"
  }
];

export function BottomTabBar({ activeTab, onSelectTab }: BottomTabBarProps): React.JSX.Element {
  const colors = useThemeColors();
  const themeMode = useThemeMode();
  const styles = createStyles(colors, themeMode === "love");

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.accessibilityLabel}
              accessibilityState={{ selected: isActive }}
              onPress={() => onSelectTab(tab.key)}
              hitSlop={4}
              style={({ pressed }) => [
                styles.item,
                isActive && styles.activeItem,
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.icon, isActive && styles.activeText]}>{tab.icon}</Text>
              <Text numberOfLines={1} style={[styles.label, isActive && styles.activeText]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: AppColors, isLoveMode: boolean) {
  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: spacing.screen,
      paddingTop: spacing.xs,
      paddingBottom: Platform.OS === "ios" ? spacing.sm : spacing.xs,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.line
    },
    bar: {
      minHeight: 72,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: isLoveMode ? colors.line : colors.line,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 4,
      padding: 6,
      shadowColor: "#000000",
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -2 },
      elevation: 2
    },
    item: {
      flex: 1,
      minHeight: 58,
      borderRadius: radius.lg,
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      paddingHorizontal: 4
    },
    activeItem: {
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: isLoveMode ? colors.primary : colors.line
    },
    pressed: {
      opacity: 0.86,
      transform: [{ scale: 0.98 }]
    },
    icon: {
      color: colors.muted,
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "800",
      textAlign: "center"
    },
    label: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 15,
      fontWeight: "700",
      textAlign: "center"
    },
    activeText: {
      color: colors.primaryDark
    }
  });
}
