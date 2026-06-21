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

function createStyles(colors: AppColors) {
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
      color: colors.muted,
      fontSize: 13,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    listenCard: {
      gap: spacing.sm
    },
    listenTitle: {
      color: colors.ink,
      fontSize: 19,
      lineHeight: 25,
      fontWeight: "900"
    },
    listenHelp: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20
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
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "900"
    },
    correctText: {
      color: colors.success
    },
    wrongText: {
      color: colors.warning
    },
    resultBody: {
      color: colors.ink,
      fontSize: 15,
      lineHeight: 21
    },
    resultBlock: {
      gap: spacing.sm
    },
    sectionTitle: {
      color: colors.ink,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "900"
    },
    transcript: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22
    },
    detailLine: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    chip: {
      overflow: "hidden",
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceMuted,
      color: colors.primaryDark,
      fontSize: 13,
      fontWeight: "800",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
      lineHeight: 20
    }
  });
}
