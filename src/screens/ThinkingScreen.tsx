import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { useCountdown } from "@/hooks/useCountdown";
import { Topic } from "@/types/models";
import { colors, spacing } from "@/theme/colors";

interface ThinkingScreenProps {
  topic: Topic;
  onBack: () => void;
  onStartRecording: () => void;
}

export function ThinkingScreen({
  topic,
  onBack,
  onStartRecording
}: ThinkingScreenProps): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const completeThinking = useCallback(() => setIsReady(true), []);
  const countdown = useCountdown(30, completeThinking);

  useEffect(() => {
    countdown.start();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="Think" subtitle={topic.title} onBack={onBack} />

      <Card style={styles.timerCard}>
        <Text style={styles.timer}>{countdown.remainingSeconds}</Text>
        <Text style={styles.timerLabel}>seconds</Text>
      </Card>

      <View style={styles.actions}>
        {isReady ? (
          <AppButton label="Kayda Başla" onPress={onStartRecording} />
        ) : (
          <AppButton label="Düşünme Süresini Atla" onPress={countdown.skip} variant="ghost" />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: spacing.md,
    gap: spacing.md
  },
  timerCard: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  timer: {
    color: colors.primaryDark,
    fontSize: 88,
    lineHeight: 96,
    fontWeight: "900"
  },
  timerLabel: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: "700"
  },
  actions: {
    marginTop: "auto",
    gap: spacing.sm
  }
});
