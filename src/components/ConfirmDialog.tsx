import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { PROSE_MAX_WIDTH } from "@/theme/layout";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  /** What will actually happen. Say the consequence, not "are you sure". */
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Colours the confirm button as destructive and puts it second. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A confirmation the desktop build actually shows.
 *
 * React Native's `Alert.alert` looks like the obvious tool and is a trap here:
 * react-native-web implements it as `static alert() {}` — an empty function. On
 * the desktop app every Alert-based confirmation silently does nothing, which
 * is worse than having none. The app's only existing confirmation, the one
 * guarding "Clear All Progress", meant that button was simply dead on desktop:
 * no dialog, and therefore no reset either.
 *
 * Built on `Modal`, which react-native-web does implement, so the same code
 * shows the same dialog on a phone and in the desktop window.
 *
 * The layout puts Cancel first and the destructive action second, so the
 * button under a reflexive tap is the harmless one.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Vazgeç",
  destructive = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Android's hardware back button must dismiss rather than fall through to
      // the screen underneath, which would navigate away with the dialog open.
      onRequestClose={onCancel}
    >
      <Pressable
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
        onPress={onCancel}
      >
        {/* Swallows taps so a press inside the card does not dismiss it. */}
        <Pressable
          style={styles.card}
          onPress={() => undefined}
          accessibilityLabel={title}
          accessibilityViewIsModal
        >
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <AppButton label={cancelLabel} onPress={onCancel} variant="ghost" />
            <AppButton
              label={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? "danger" : "primary"}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg
    },
    card: {
      width: "100%",
      maxWidth: PROSE_MAX_WIDTH,
      padding: spacing.lg,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.sm
    },
    title: {
      ...typography.h2,
      color: colors.ink
    },
    message: {
      ...typography.body,
      color: colors.muted
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.sm
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
