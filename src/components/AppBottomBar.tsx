import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

interface AppBottomBarProps {
  canGoBack: boolean;
  isHome: boolean;
  onBack: () => void;
  onHome: () => void;
  onSettings: () => void;
  /** Returns to the launch picker. Omitted when there is nothing to switch to. */
  onSwitchModule?: () => void;
}

/**
 * The app's own persistent navigation bar. Android's system navigation bar
 * (back / home / recents) is hidden — see `androidImmersiveMode.ts` — so this
 * is the only navigation surface the user has for moving between screens,
 * always visible and always in the same place regardless of what the OS UI
 * does.
 */
export function AppBottomBar({
  canGoBack,
  isHome,
  onBack,
  onHome,
  onSettings,
  onSwitchModule
}: AppBottomBarProps): React.JSX.Element {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.line }]}>
      <BarButton
        icon="arrow-left"
        label="Back"
        disabled={!canGoBack}
        onPress={onBack}
      />
      <BarButton
        icon="home"
        label="Home"
        active={isHome}
        onPress={onHome}
      />
      <BarButton
        icon="settings"
        label="Settings"
        onPress={onSettings}
      />
      {onSwitchModule ? <BarButton icon="repeat" label="Module" onPress={onSwitchModule} /> : null}
    </View>
  );
}

interface BarButtonProps {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}

function BarButton({ icon, label, onPress, active = false, disabled = false }: BarButtonProps): React.JSX.Element {
  const colors = useThemeColors();
  const tintColor = active ? colors.primary : disabled ? colors.muted : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        active ? { backgroundColor: colors.primaryTint } : null,
        pressed && !disabled ? { opacity: 0.6 } : null,
        disabled ? styles.buttonDisabled : null
      ]}
    >
      <Icon name={icon} size={20} color={tintColor} />
      <Text style={[typography.caption, styles.label, { color: tintColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === "android" ? spacing.md : spacing.xs
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.md
  },
  buttonDisabled: {
    opacity: 0.4
  },
  label: {
    fontWeight: "700"
  }
});
