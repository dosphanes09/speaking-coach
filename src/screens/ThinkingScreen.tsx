import React, { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { useCountdown } from "@/hooks/useCountdown";
import { Topic } from "@/types/models";
import { AppColors, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";
import { THINKING_SECONDS } from "@/utils/practiceTiming";

interface ThinkingScreenProps {
  topic: Topic;
  initialNotes?: string;
  onBack: () => void;
  onStartRecording: (thinkingNotes: string) => void;
}

export function ThinkingScreen({
  topic,
  initialNotes = "",
  onBack,
  onStartRecording
}: ThinkingScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [isReady, setIsReady] = useState(false);
  const [thinkingNotes, setThinkingNotes] = useState(initialNotes);
  const completeThinking = useCallback(() => setIsReady(true), []);
  const countdown = useCountdown(THINKING_SECONDS, completeThinking);

  useEffect(() => {
    countdown.start();
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Header title="Think" subtitle={topic.title} onBack={onBack} />

        <Card style={styles.timerCard}>
          <Text style={styles.timer}>{countdown.remainingSeconds}</Text>
          <Text style={styles.timerLabel}>seconds</Text>
        </Card>

        <Card style={styles.notesCard}>
          <Text style={styles.notesTitle}>Private prep notes</Text>
          <Text style={styles.notesHelp}>
            Write short ideas for the 30-second thinking time. These notes are not recorded or sent to analysis.
          </Text>
          <TextInput
            value={thinkingNotes}
            onChangeText={setThinkingNotes}
            maxLength={600}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
            placeholder="Example: main idea / reason / example / connector..."
            placeholderTextColor={colors.muted}
            scrollEnabled
            style={styles.notesInput}
          />
        </Card>

        <View style={styles.actions}>
          {isReady ? (
            <AppButton label="Kayda Başla" onPress={() => onStartRecording(thinkingNotes)} />
          ) : (
            <AppButton label="Düşünme Süresini Atla" onPress={countdown.skip} variant="ghost" />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1
    },
    content: {
      flexGrow: 1,
      padding: spacing.md,
      paddingBottom: 128,
      gap: spacing.md
    },
    timerCard: {
      minHeight: 190,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface
    },
    timer: {
      color: colors.primaryDark,
      fontSize: 82,
      lineHeight: 90,
      fontWeight: "900"
    },
    timerLabel: {
      color: colors.muted,
      fontSize: 18,
      fontWeight: "700"
    },
    notesCard: {
      gap: spacing.sm
    },
    notesTitle: {
      color: colors.ink,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "900"
    },
    notesHelp: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19
    },
    notesInput: {
      minHeight: 150,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      padding: spacing.md,
      color: colors.ink,
      fontSize: 16,
      lineHeight: 22,
      backgroundColor: colors.background
    },
    actions: {
      marginTop: "auto",
      gap: spacing.sm
    }
  });
}
