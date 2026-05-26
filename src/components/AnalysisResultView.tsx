import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AnalysisResult } from "@/types/models";
import { Card } from "./Card";
import { MistakesTable } from "./MistakesTable";
import { ScoreBar } from "./ScoreBar";
import { SectionTitle } from "./SectionTitle";
import { colors, spacing } from "@/theme/colors";

interface AnalysisResultViewProps {
  analysis: AnalysisResult;
  showOriginal?: boolean;
}

export function AnalysisResultView({
  analysis,
  showOriginal = true
}: AnalysisResultViewProps): React.JSX.Element {
  const sentenceStructureSuggestions = analysis.sentenceStructureSuggestions ?? [];

  return (
    <View style={styles.container}>
      {showOriginal ? (
        <>
          <SectionTitle>Original Transcript</SectionTitle>
          <Card>
            <Text style={styles.body}>{analysis.originalTranscript}</Text>
          </Card>
        </>
      ) : null}

      <SectionTitle>Corrected Version</SectionTitle>
      <Card>
        <Text style={styles.body}>{analysis.correctedVersion}</Text>
      </Card>

      <SectionTitle>Speaking Score</SectionTitle>
      <Card style={styles.scoreCard}>
        <ScoreBar label="Grammar" value={analysis.scores.grammar} />
        <ScoreBar label="Vocabulary" value={analysis.scores.vocabulary} />
        <ScoreBar label="Fluency" value={analysis.scores.fluency} />
        <ScoreBar label="Coherence" value={analysis.scores.coherence} />
        <ScoreBar label="Overall" value={analysis.scores.overall} />
      </Card>

      <SectionTitle>Mistakes</SectionTitle>
      <MistakesTable mistakes={analysis.mistakes} />

      <SectionTitle>Speaking Feedback</SectionTitle>
      <Card style={styles.feedbackCard}>
        <FeedbackLine label="Grammar" value={analysis.speakingFeedback.grammar} />
        <FeedbackLine label="Vocabulary" value={analysis.speakingFeedback.vocabulary} />
        <FeedbackLine label="Fluency" value={analysis.speakingFeedback.fluency} />
        <FeedbackLine label="Coherence" value={analysis.speakingFeedback.coherence} />
        <FeedbackLine label="Confidence" value={analysis.speakingFeedback.confidence} />
        <FeedbackLine label="Repetition" value={analysis.speakingFeedback.repetitionProblems} />
        <FeedbackLine label="Connectors" value={analysis.speakingFeedback.missingConnectors} />
        <FeedbackLine label="Pronunciation" value={analysis.speakingFeedback.pronunciationNotes} />
      </Card>

      <SectionTitle>Vocabulary Upgrades</SectionTitle>
      <Card>
        {analysis.vocabularySuggestions.map((item) => (
          <Text key={item} style={styles.listItem}>
            {item}
          </Text>
        ))}
      </Card>

      <SectionTitle>Better Connectors</SectionTitle>
      <Card>
        {analysis.connectorSuggestions.map((item) => (
          <Text key={item} style={styles.listItem}>
            {item}
          </Text>
        ))}
      </Card>

      {sentenceStructureSuggestions.length > 0 ? (
        <>
          <SectionTitle>Sentence Building</SectionTitle>
          <Card>
            {sentenceStructureSuggestions.map((item) => (
              <Text key={item} style={styles.listItem}>
                {item}
              </Text>
            ))}
          </Card>
        </>
      ) : null}

      <SectionTitle>Teacher-like Improvement Plan</SectionTitle>
      <Card style={styles.feedbackCard}>
        <FeedbackLine label="Good today" value={analysis.improvementPlan.whatWentWell} />
        <FeedbackLine label="Tomorrow" value={analysis.improvementPlan.tomorrowFocus} />
        <FeedbackLine label="Homework" value={analysis.improvementPlan.homework} />
        <Text style={styles.label}>Top 3 Problems</Text>
        {analysis.improvementPlan.topProblems.map((problem) => (
          <Text key={problem} style={styles.listItem}>
            {problem}
          </Text>
        ))}
        <Text style={styles.label}>Sentence Patterns</Text>
        {analysis.improvementPlan.sentencePatterns.map((pattern) => (
          <Text key={pattern} style={styles.listItem}>
            {pattern}
          </Text>
        ))}
      </Card>
    </View>
  );
}

function FeedbackLine({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.feedbackLine}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  scoreCard: {
    gap: spacing.md
  },
  feedbackCard: {
    gap: spacing.sm
  },
  feedbackLine: {
    gap: spacing.xs
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  body: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22
  },
  listItem: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.xs
  }
});
