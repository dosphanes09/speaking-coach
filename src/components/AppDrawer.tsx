import React from "react";
import { Modal, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors, useThemeMode } from "@/theme/ThemeProvider";

export type DrawerItemKey = "records" | "progress" | "settings";

interface DrawerItem {
  key: DrawerItemKey;
  label: string;
  icon: string;
  accessibilityLabel: string;
}

interface AppDrawerProps {
  visible: boolean;
  activeItem: DrawerItemKey | null;
  onClose: () => void;
  onSelectItem: (item: DrawerItemKey) => void;
}

const DRAWER_ITEMS: DrawerItem[] = [
  {
    key: "records",
    label: "Kayıtlar",
    icon: "▤",
    accessibilityLabel: "Kayıtlar"
  },
  {
    key: "progress",
    label: "Gelişim",
    icon: "↗",
    accessibilityLabel: "Gelişim"
  },
  {
    key: "settings",
    label: "Ayarlar",
    icon: "⚙",
    accessibilityLabel: "Ayarlar"
  }
];

export function AppDrawer({
  visible,
  activeItem,
  onClose,
  onSelectItem
}: AppDrawerProps): React.JSX.Element {
  const colors = useThemeColors();
  const themeMode = useThemeMode();
  const styles = createStyles(colors, themeMode === "love");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Menüyü kapat"
          onPress={onClose}
          style={styles.overlay}
        />

        <SafeAreaView style={styles.drawer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Daily Speaking Coach</Text>
              <Text style={styles.title}>Menü</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Menüyü kapat"
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.itemList}>
            {DRAWER_ITEMS.map((item) => {
              const isActive = item.key === activeItem;

              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={item.accessibilityLabel}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => onSelectItem(item.key)}
                  style={({ pressed }) => [
                    styles.item,
                    isActive && styles.activeItem,
                    pressed && styles.pressed
                  ]}
                >
                  <View style={[styles.iconWrap, isActive && styles.activeIconWrap]}>
                    <Text style={[styles.icon, isActive && styles.activeText]}>{item.icon}</Text>
                  </View>
                  <Text style={[styles.itemText, isActive && styles.activeText]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// Deliberately not wrapped in memoizeStyles: that cache is keyed on the theme
// object alone, so two different `isLoveMode` values would collide and hand back
// the wrong sheet. Both of these render once per screen, so there is nothing to
// win here anyway.
function createStyles(colors: AppColors, isLoveMode: boolean) {
  return StyleSheet.create({
    modalRoot: {
      flex: 1,
      flexDirection: "row"
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.42)"
    },
    drawer: {
      width: "82%",
      maxWidth: 320,
      minWidth: 276,
      height: "100%",
      backgroundColor: colors.surface,
      borderTopRightRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
      borderRightWidth: 1,
      borderRightColor: isLoveMode ? colors.primary : colors.line,
      paddingHorizontal: spacing.screen,
      paddingTop: Platform.OS === "android" ? spacing.lg : spacing.md,
      paddingBottom: spacing.lg,
      gap: spacing.lg,
      shadowColor: "#000000",
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 8, height: 0 },
      elevation: 10
    },
    header: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md
    },
    eyebrow: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "700",
      textTransform: "uppercase"
    },
    title: {
      color: colors.ink,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "800"
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center"
    },
    closeText: {
      color: colors.primaryDark,
      fontSize: 24,
      lineHeight: 28,
      fontWeight: "700"
    },
    itemList: {
      gap: spacing.sm
    },
    item: {
      minHeight: 56,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs
    },
    activeItem: {
      backgroundColor: colors.surfaceMuted,
      borderColor: isLoveMode ? colors.primary : colors.line
    },
    pressed: {
      opacity: 0.88,
      transform: [{ scale: 0.99 }]
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center"
    },
    activeIconWrap: {
      backgroundColor: colors.surface
    },
    icon: {
      color: colors.muted,
      fontSize: 17,
      lineHeight: 21,
      fontWeight: "800"
    },
    itemText: {
      flex: 1,
      color: colors.ink,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "700"
    },
    activeText: {
      color: colors.primaryDark
    }
  });
}
