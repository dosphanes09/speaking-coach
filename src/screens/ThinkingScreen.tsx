import React, { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { PracticeQuestionCard } from "@/components/PracticeQuestionCard";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useCountdown } from "@/hooks/useCountdown";
import { RecordingType, Topic } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { THINKING_SECONDS } from "@/utils/practiceTiming";

interface ThinkingScreenProps {
  topic: Topic;
  initialNotes?: string;
  initialRecordingType?: RecordingType;
  onBack: () => void;
  onStartRecording: (thinkingNotes: string, recordingType: RecordingType) => void;
}

export function ThinkingScreen({
  topic,
  initialNotes = "",
  initialRecordingType = "audio",
  onBack,
  onStartRecording
}: ThinkingScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [thinkingNotes, setThinkingNotes] = useState(initialNotes);
  const [recordingType, setRecordingType] = useState<RecordingType>(initialRecordingType);
  const thinkingNotesRef = useRef(thinkingNotes);
  const recordingTypeRef = useRef(recordingType);

  const completeThinking = useCallback(() => {
    onStartRecording(thinkingNotesRef.current, recordingTypeRef.current);
  }, [onStartRecording]);
  const countdown = useCountdown(THINKING_SECONDS, completeThinking);

  useEffect(() => {
    countdown.start();
  }, []);

  useEffect(() => {
    thinkingNotesRef.current = thinkingNotes;
  }, [thinkingNotes]);

  useEffect(() => {
    recordingTypeRef.current = recordingType;
  }, [recordingType]);

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
        <Header title="Prepare" subtitle="Recording will start automatically after preparation." onBack={onBack} />

        <PracticeQuestionCard topic={topic} phase="thinking" />

        <Card style={styles.timerCard}>
          <Text style={styles.timer}>{countdown.remainingSeconds}</Text>
          <Text style={styles.timerLabel}>seconds</Text>
          <Text style={styles.autoStartText}>Recording starts automatically when the timer reaches 0.</Text>
        </Card>

        <Card style={styles.notesCard}>
          <Text style={styles.notesTitle}>Recording type</Text>
          <SegmentedControl<RecordingType>
            options={["audio", "video"]}
            labels={{ audio: "Audio", video: "Video" }}
            value={recordingType}
            onChange={setRecordingType}
          />

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
          <AppButton label="Start Recording Now" onPress={countdown.skip} variant="ghost" icon="arrow-right" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function buildStyles(colors: AppColors) {
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
      backgroundColor: colors.surface,
      gap: spacing.xs
    },
    timer: {
      color: colors.primaryDark,
      fontSize: 82,
      lineHeight: 90,
      fontWeight: "900"
    },
    timerLabel: {
      ...typography.bodyLarge,
      color: colors.muted,
      fontSize: 18
    },
    autoStartText: {
      ...typography.bodyStrong,
      color: colors.primaryDark,
      textAlign: "center"
    },
    notesCard: {
      gap: spacing.sm
    },
    notesTitle: {
      ...typography.h2,
      color: colors.ink
    },
    notesHelp: {
      ...typography.body,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19
    },
    notesInput: {
      minHeight: 150,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.sm,
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

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
