import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AnalysisResult } from "@/types/models";
import { Card } from "./Card";
import { ErrorPatternsCard } from "./ErrorPatternsCard";
import { GrammarFocusFeedbackCard } from "./GrammarFocusFeedbackCard";
import { MistakesTable } from "./MistakesTable";
import { ScoreBreakdownCard } from "./ScoreBreakdownCard";
import { SectionTitle } from "./SectionTitle";
import { SpeakingAnalyticsCard } from "./SpeakingAnalyticsCard";
import { AppColors, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";

interface AnalysisResultViewProps {
  analysis: AnalysisResult;
  showOriginal?: boolean;
}

export function AnalysisResultView({
  analysis,
  showOriginal = true
}: AnalysisResultViewProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const sentenceStructureSuggestions = analysis.sentenceStructureSuggestions ?? [];
  const errorPatterns = analysis.errorPatterns ?? [];

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

      <SectionTitle>Speaking Score Breakdown</SectionTitle>
      <ScoreBreakdownCard analysis={analysis} />

      {analysis.speakingAnalytics ? (
        <>
          <SectionTitle>Speaking Analytics</SectionTitle>
          <SpeakingAnalyticsCard analytics={analysis.speakingAnalytics} />
        </>
      ) : null}

      {analysis.grammarFocusFeedback ? (
        <>
          <SectionTitle>Target Grammar Feedback</SectionTitle>
          <GrammarFocusFeedbackCard feedback={analysis.grammarFocusFeedback} />
        </>
      ) : null}

      <SectionTitle>Mistakes</SectionTitle>
      <MistakesTable mistakes={analysis.mistakes} />

      {errorPatterns.length > 0 ? (
        <>
          <SectionTitle>Error Patterns</SectionTitle>
          <ErrorPatternsCard patterns={errorPatterns} />
        </>
      ) : null}

      <SectionTitle>Speaking Feedback</SectionTitle>
      <Card style={styles.feedbackCard}>
        <FeedbackLine colors={colors} label="Grammar" value={analysis.speakingFeedback.grammar} />
        <FeedbackLine colors={colors} label="Vocabulary" value={analysis.speakingFeedback.vocabulary} />
        <FeedbackLine colors={colors} label="Fluency" value={analysis.speakingFeedback.fluency} />
        <FeedbackLine colors={colors} label="Coherence" value={analysis.speakingFeedback.coherence} />
        <FeedbackLine colors={colors} label="Confidence" value={analysis.speakingFeedback.confidence} />
        <FeedbackLine colors={colors} label="Repetition" value={analysis.speakingFeedback.repetitionProblems} />
        <FeedbackLine colors={colors} label="Connectors" value={analysis.speakingFeedback.missingConnectors} />
        <FeedbackLine colors={colors} label="Pronunciation" value={analysis.speakingFeedback.pronunciationNotes} />
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
        <FeedbackLine colors={colors} label="Good today" value={analysis.improvementPlan.whatWentWell} />
        <FeedbackLine colors={colors} label="Tomorrow" value={analysis.improvementPlan.tomorrowFocus} />
        <FeedbackLine colors={colors} label="Homework" value={analysis.improvementPlan.homework} />
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

function FeedbackLine({
  colors,
  label,
  value
}: {
  colors: AppColors;
  label: string;
  value: string;
}): React.JSX.Element {
  const styles = createStyles(colors);

  return (
    <View style={styles.feedbackLine}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    gap: spacing.sm
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
}
