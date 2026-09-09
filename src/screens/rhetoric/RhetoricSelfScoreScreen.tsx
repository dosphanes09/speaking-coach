import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { RecordingPlayer } from "@/components/rhetoric/RecordingPlayer";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { RhetoricRecording, RhetoricSelfAssessment, RhetoricTopic } from "@/types/rhetoric";

interface RhetoricSelfScoreScreenProps {
  topic: RhetoricTopic;
  recording: RhetoricRecording;
  onBack: () => void;
  onSubmit: (assessment: RhetoricSelfAssessment) => void;
}

/**
 * Rate yourself before the model does.
 *
 * This screen exists for one reason: the gap between the two numbers is
 * trainable and the score alone is not. Someone who consistently rates
 * themselves above the analysis has blind spots; someone consistently below has
 * a confidence problem. Both need different work, and neither is visible if the
 * model's verdict arrives first and anchors the answer.
 *
 * That is also why the recording can be watched here but the analysis has not
 * even been requested yet.
 */
export function RhetoricSelfScoreScreen({
  topic,
  recording,
  onBack,
  onSubmit
}: RhetoricSelfScoreScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [score, setScore] = useState<number | null>(null);
  const [note, setNote] = useState("");

  return (
    // Without this the on-screen keyboard sits on top of the very field the
    // screen exists for — on the preparation screen that is fifteen minutes of
    // notes typed blind.
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <View style={styles.screen}>
      <Header
        title="Kendini değerlendir"
        subtitle="Analizi görmeden önce"
        onBack={onBack}
        backLabel="Geri"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.topicCard}>
          <Text style={styles.topicLabel}>KONU</Text>
          <Text style={styles.topicTitle}>{topic.title}</Text>
        </Card>

        <Text style={styles.watchLabel}>
          {recording.hasVideo ? "Kaydını izle" : "Kaydını dinle"} — istersen atlayabilirsin
        </Text>
        <RecordingPlayer recording={recording} />

        <Card style={styles.scoreCard}>
          <Text style={styles.question}>Bu konuşmaya kaç verirsin?</Text>
          <View style={styles.scaleRow}>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: score === value }}
                accessibilityLabel={`${value} puan`}
                onPress={() => setScore(value)}
                style={({ pressed }) => [
                  styles.scaleButton,
                  score === value && styles.scaleButtonActive,
                  pressed && styles.pressed
                ]}
              >
                <Text style={[styles.scaleText, score === value && styles.scaleTextActive]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.scaleLegend}>
            <Text style={styles.scaleLegendText}>1 · kötü</Text>
            <Text style={styles.scaleLegendText}>10 · çok iyi</Text>
          </View>
        </Card>

        <Text style={styles.noteLabel}>Tek cümleyle neden?</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          multiline
          textAlignVertical="top"
          placeholder="Örn: Girişi iyi kurdum ama ortada dağıldım ve kapanışı aceleye getirdim."
          placeholderTextColor={colors.muted}
          maxLength={400}
          accessibilityLabel="Öz değerlendirme notu"
        />

        <Text style={styles.hint}>
          Bu tahmin analizle karşılaştırılacak. Aradaki fark, zamanla kendini ne kadar doğru
          okuyabildiğini gösterir — ve uygulama yanında yokken seni yönlendirecek şey odur.
        </Text>

        <AppButton
          label="Analize gönder"
          onPress={() => onSubmit({ score: score ?? 0, note: note.trim() })}
          disabled={score === null}
          icon="send"
          style={styles.submit}
        />
      </ScrollView>
    </View>
    </KeyboardAvoidingView>
  );
}

function buildStyles(colors: AppColors) {
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
      ...typography.h2,
      color: colors.ink
    },
    watchLabel: {
      ...typography.label,
      color: colors.muted,
      marginTop: spacing.xs
    },
    scoreCard: {
      gap: spacing.sm,
      marginTop: spacing.sm
    },
    question: {
      ...typography.h2,
      color: colors.ink
    },
    scaleRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    scaleButton: {
      flexGrow: 1,
      flexBasis: 44,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted
    },
    scaleButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    pressed: {
      opacity: 0.85
    },
    scaleText: {
      ...typography.h2,
      color: colors.muted
    },
    scaleTextActive: {
      color: colors.onAccent
    },
    scaleLegend: {
      flexDirection: "row",
      justifyContent: "space-between"
    },
    scaleLegendText: {
      ...typography.caption,
      color: colors.muted
    },
    noteLabel: {
      ...typography.label,
      color: colors.muted,
      marginTop: spacing.sm
    },
    noteInput: {
      minHeight: 90,
      padding: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      color: colors.ink,
      ...typography.bodyLarge
    },
    hint: {
      ...typography.caption,
      color: colors.muted
    },
    submit: {
      marginTop: spacing.md
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
