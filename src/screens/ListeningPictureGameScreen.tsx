import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import * as Speech from "expo-speech";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { PictureChoiceGrid } from "@/components/PictureChoiceGrid";
import { SegmentedControl } from "@/components/SegmentedControl";
import { getRandomListeningItem } from "@/data/listeningPictureItems";
import { getPicturePromptById, PICTURE_LEVELS } from "@/data/picturePrompts";
import { ListeningGameItem, ListeningGameResult, PicturePrompt, TopicLevel } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { createId } from "@/utils/id";

interface ListeningPictureGameScreenProps {
  targetLevel: TopicLevel;
  onBack: () => void;
  onSaveResult: (result: ListeningGameResult) => Promise<void>;
  onDescribePicture: (prompt: PicturePrompt) => void;
}

export function ListeningPictureGameScreen({
  targetLevel,
  onBack,
  onSaveResult,
  onDescribePicture
}: ListeningPictureGameScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [level, setLevel] = useState<TopicLevel>(targetLevel);
  const [item, setItem] = useState<ListeningGameItem>(() => getRandomListeningItem(targetLevel));
  const [selectedPictureId, setSelectedPictureId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [saveError, setSaveError] = useState("");

  const optionPrompts = useMemo(
    () =>
      item.optionPictureIds
        .map((pictureId) => getPicturePromptById(pictureId))
        .filter((prompt): prompt is PicturePrompt => Boolean(prompt)),
    [item.optionPictureIds]
  );

  const correctPrompt = getPicturePromptById(item.correctPictureId);
  const isCorrect = submitted && selectedPictureId === item.correctPictureId;

  useEffect(() => {
    setItem(getRandomListeningItem(level));
    setSelectedPictureId("");
    setSubmitted(false);
    setAudioError("");
    setSaveError("");
    Speech.stop();
  }, [level]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  function playDescription(): void {
    setAudioError("");

    try {
      Speech.stop();
      Speech.speak(item.audioText, {
        language: "en-US",
        rate: level === "A1" || level === "A2" ? 0.88 : 0.95
      });
    } catch {
      setAudioError("Audio could not be played on this device. Please try again.");
    }
  }

  async function submitAnswer(): Promise<void> {
    if (!selectedPictureId || submitted) {
      return;
    }

    setSubmitted(true);
    setSaveError("");

    try {
      await onSaveResult({
        id: createId("listening"),
        createdAt: new Date().toISOString(),
        practiceType: "listening_picture_match",
        level,
        itemId: item.id,
        correctPictureId: item.correctPictureId,
        selectedPictureId,
        isCorrect: selectedPictureId === item.correctPictureId,
        score: selectedPictureId === item.correctPictureId ? 100 : 0,
        transcript: item.transcript,
        keyDetails: item.keyDetails,
        distractorExplanation: item.distractorExplanation,
        vocabulary: item.vocabulary,
        explanation: item.explanation,
        targetGrammar: item.targetGrammar
      });
    } catch {
      setSaveError("Result was shown, but could not be saved locally.");
    }
  }

  function nextQuestion(): void {
    setItem(getRandomListeningItem(level, item.id));
    setSelectedPictureId("");
    setSubmitted(false);
    setAudioError("");
    setSaveError("");
    Speech.stop();
  }

  function startDescriptionPractice(): void {
    if (correctPrompt) {
      onDescribePicture(correctPrompt);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header
        title="Listen & Choose"
        subtitle="Play the description, then choose the matching picture."
        onBack={onBack}
      />

      <View style={styles.levelBlock}>
        <Text style={styles.label}>Level</Text>
        <SegmentedControl options={PICTURE_LEVELS} value={level} onChange={setLevel} />
      </View>

      <Card style={styles.listenCard}>
        <Text style={styles.listenTitle}>Audio description</Text>
        <Text style={styles.listenHelp}>
          The transcript stays hidden until you submit your answer.
        </Text>
        <View style={styles.playActions}>
          <AppButton label="Play Description" onPress={playDescription} />
          <AppButton label="Replay" onPress={playDescription} variant="ghost" />
        </View>
        {audioError ? <Text style={styles.errorText}>{audioError}</Text> : null}
      </Card>

      <PictureChoiceGrid
        options={optionPrompts}
        selectedPictureId={selectedPictureId}
        correctPictureId={item.correctPictureId}
        showResult={submitted}
        onSelect={setSelectedPictureId}
      />

      <View style={styles.actions}>
        <AppButton label="Submit Answer" onPress={submitAnswer} disabled={!selectedPictureId || submitted} />
      </View>

      {submitted ? (
        <Card style={styles.resultCard}>
          <Text style={[styles.resultTitle, isCorrect ? styles.correctText : styles.wrongText]}>
            {isCorrect ? "Correct" : "Not quite"}
          </Text>
          <Text style={styles.resultBody}>{item.explanation}</Text>
          <View style={styles.resultBlock}>
            <Text style={styles.sectionTitle}>Transcript</Text>
            <Text style={styles.transcript}>{item.transcript}</Text>
          </View>
          <View style={styles.resultBlock}>
            <Text style={styles.sectionTitle}>Key details</Text>
            {item.keyDetails.map((detail) => (
              <Text key={detail} style={styles.detailLine}>
                - {detail}
              </Text>
            ))}
          </View>
          <View style={styles.resultBlock}>
            <Text style={styles.sectionTitle}>Why the other options are wrong</Text>
            {item.distractorExplanation.map((detail) => (
              <Text key={detail} style={styles.detailLine}>
                - {detail}
              </Text>
            ))}
          </View>
          <View style={styles.resultBlock}>
            <Text style={styles.sectionTitle}>Vocabulary clues</Text>
            <View style={styles.chipRow}>
              {item.vocabulary.map((word) => (
                <Text key={word} style={styles.chip}>
                  {word}
                </Text>
              ))}
            </View>
          </View>
          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
          <View style={styles.actions}>
            <AppButton label="Try to Describe This Picture" onPress={startDescriptionPractice} variant="secondary" />
            <AppButton label="Next Question" onPress={nextQuestion} variant="ghost" />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.md,
      gap: spacing.md,
      paddingBottom: spacing.lg
    },
    levelBlock: {
      gap: spacing.sm
    },
    label: {
      ...typography.label,
      color: colors.muted
    },
    listenCard: {
      gap: spacing.sm
    },
    listenTitle: {
      ...typography.h1,
      color: colors.ink
    },
    listenHelp: {
      ...typography.body,
      color: colors.muted
    },
    playActions: {
      gap: spacing.sm
    },
    actions: {
      gap: spacing.sm
    },
    resultCard: {
      gap: spacing.md
    },
    resultTitle: {
      ...typography.display
    },
    correctText: {
      color: colors.success
    },
    wrongText: {
      color: colors.warning
    },
    resultBody: {
      ...typography.bodyLarge,
      color: colors.ink
    },
    resultBlock: {
      gap: spacing.sm
    },
    sectionTitle: {
      ...typography.h2,
      color: colors.ink
    },
    transcript: {
      ...typography.bodyLarge,
      color: colors.muted
    },
    detailLine: {
      ...typography.body,
      color: colors.muted
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    chip: {
      ...typography.bodyStrong,
      overflow: "hidden",
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceMuted,
      color: colors.primaryDark,
      fontSize: 13,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs
    },
    errorText: {
      ...typography.body,
      color: colors.danger
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
