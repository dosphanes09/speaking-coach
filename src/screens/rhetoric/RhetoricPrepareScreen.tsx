import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { RhetoricMode, RhetoricTopic } from "@/types/rhetoric";

interface RhetoricPrepareScreenProps {
  topic: RhetoricTopic;
  mode: RhetoricMode;
  targetDurationSeconds: number;
  onBack: () => void;
  onReady: (preparationNotes: string) => void;
}

const PREPARED_SECONDS = 15 * 60;
const IMPROMPTU_SECONDS = 60;

/**
 * The preparation window.
 *
 * Two deliberate design decisions here:
 *
 * 1. The app does not police the "no AI" rule and does not pretend to. It
 *    cannot see other windows, and a fake lock would only create false
 *    confidence. What it does instead is make the commitment a ritual: a
 *    visible countdown, a plain notes pane, and notes that freeze when time is
 *    up.
 *
 * 2. The notes are not scratch paper. They are sent with the recording, and the
 *    analysis compares what was planned against what was actually said. That
 *    turns a waiting period into the session's most useful measurement — the
 *    usual weakness is not preparing badly, it is failing to deliver what was
 *    prepared.
 */
export function RhetoricPrepareScreen({
  topic,
  mode,
  targetDurationSeconds,
  onBack,
  onReady
}: RhetoricPrepareScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const totalSeconds = mode === "impromptu" ? IMPROMPTU_SECONDS : PREPARED_SECONDS;

  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [notes, setNotes] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    // Driven from a timestamp rather than by decrementing a counter: a tab that
    // gets throttled in the background would otherwise silently gain time.
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const left = Math.max(0, totalSeconds - elapsed);
      setRemainingSeconds(left);
      if (left === 0) {
        setIsLocked(true);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [totalSeconds]);

  const progress = useMemo(() => 1 - remainingSeconds / totalSeconds, [remainingSeconds, totalSeconds]);
  const isUrgent = remainingSeconds <= Math.min(60, totalSeconds * 0.2);

  return (
    <View style={styles.screen}>
      <Header
        title={mode === "impromptu" ? "Hazırlık" : "Araştırma"}
        subtitle={mode === "impromptu" ? "60 saniyen var" : "15 dakika araştırma"}
        onBack={onBack}
        backLabel="Geri"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.topicCard}>
          <Text style={styles.topicLabel}>KONU</Text>
          <Text style={styles.topicTitle}>{topic.title}</Text>
        </Card>

        <Card style={[styles.timerCard, isUrgent && styles.timerCardUrgent]}>
          <Text style={[styles.timer, isUrgent && styles.timerUrgent]}>{formatClock(remainingSeconds)}</Text>
          <Text style={styles.timerLabel}>
            {isLocked ? "Süre doldu" : mode === "impromptu" ? "hazırlık süresi" : "araştırma süresi"}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.min(100, Math.max(0, progress * 100))}%` },
                isUrgent && styles.fillUrgent
              ]}
            />
          </View>
          <Text style={styles.rule}>
            Kaynak okuyabilirsin, ansiklopedi ve makale serbest. Yapay zekâ yok — özeti sana başkası
            çıkarırsa çalışan sen olmazsın. Uygulama bunu denetleyemez; bu, kendine verdiğin bir söz.
          </Text>
        </Card>

        <View style={styles.notesHeader}>
          <Text style={styles.notesTitle}>Notların</Text>
          <Text style={styles.notesCount}>{notes.trim().length} karakter</Text>
        </View>
        <Text style={styles.notesHint}>
          Öğrendiklerini ve anlatacağın başlıkları maddeler halinde yaz. Bunlar analize gönderilir;
          planladığının ne kadarını anlatabildiğin ölçülür. Kopyaladığın cümleleri değil, kendi
          cümlelerinle kurduğun başlıkları yazmaya çalış.
        </Text>

        <TextInput
          style={[styles.notesInput, isLocked && styles.notesInputLocked]}
          value={notes}
          onChangeText={setNotes}
          editable={!isLocked}
          multiline
          textAlignVertical="top"
          placeholder={"1) Giriş — hangi soruyla açacağım\n2) Ana fikir\n3) Örnek\n4) Karşı görüş\n5) Kapanış"}
          placeholderTextColor={colors.muted}
          maxLength={4000}
          accessibilityLabel="Hazırlık notları"
        />

        {isLocked ? (
          <Text style={styles.lockedNote}>
            Notlar kilitlendi. Konuşurken bakabilirsin ama artık değiştiremezsin.
          </Text>
        ) : null}

        <View style={styles.actions}>
          <AppButton
            label={isLocked ? "Kayda geç" : "Hazırım, kayda geç"}
            onPress={() => onReady(notes)}
            icon="mic"
          />
          <Text style={styles.targetNote}>
            Hedef konuşma süresi: {Math.round(targetDurationSeconds / 60)} dakika
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: spacing.screen
    },
    content: {
      paddingBottom: spacing.xl,
      gap: spacing.sm
    },
    topicCard: {
      gap: spacing.xs,
      backgroundColor: colors.primaryTint,
      borderColor: colors.primary
    },
    topicLabel: {
      ...typography.label,
      color: colors.primaryDark
    },
    topicTitle: {
      ...typography.h1,
      color: colors.ink
    },
    timerCard: {
      alignItems: "center",
      gap: spacing.xs
    },
    timerCardUrgent: {
      borderColor: colors.warning,
      backgroundColor: colors.warningTint
    },
    timer: {
      fontSize: 52,
      lineHeight: 58,
      fontWeight: "800",
      color: colors.primaryDark
    },
    timerUrgent: {
      color: colors.warning
    },
    timerLabel: {
      ...typography.caption,
      color: colors.muted
    },
    track: {
      width: "100%",
      height: 6,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceMuted,
      overflow: "hidden",
      marginTop: spacing.xs
    },
    fill: {
      height: 6,
      backgroundColor: colors.primary
    },
    fillUrgent: {
      backgroundColor: colors.warning
    },
    rule: {
      ...typography.caption,
      color: colors.muted,
      textAlign: "center",
      marginTop: spacing.xs
    },
    notesHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginTop: spacing.sm
    },
    notesTitle: {
      ...typography.h2,
      color: colors.ink
    },
    notesCount: {
      ...typography.caption,
      color: colors.muted
    },
    notesHint: {
      ...typography.caption,
      color: colors.muted
    },
    notesInput: {
      minHeight: 220,
      padding: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      color: colors.ink,
      ...typography.bodyLarge
    },
    notesInputLocked: {
      backgroundColor: colors.surfaceMuted,
      opacity: 0.85
    },
    lockedNote: {
      ...typography.caption,
      color: colors.warning
    },
    actions: {
      gap: spacing.xs,
      marginTop: spacing.md
    },
    targetNote: {
      ...typography.caption,
      color: colors.muted,
      textAlign: "center"
    }
  });
}
