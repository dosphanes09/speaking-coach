import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AnalysisResult } from "@/types/models";
import { Card } from "./Card";
import { ErrorPatternsCard } from "./ErrorPatternsCard";
import { GrammarFocusFeedbackCard } from "./GrammarFocusFeedbackCard";
import { Icon } from "./Icon";
import { MistakesTable } from "./MistakesTable";
import { ScoreBreakdownCard } from "./ScoreBreakdownCard";
import { SectionTitle } from "./SectionTitle";
import { SpeakingAnalyticsCard } from "./SpeakingAnalyticsCard";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
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
      {analysis.analysisSource ? (
        <View
          style={[
            styles.sourceBadge,
            analysis.analysisSource === "audio" ? styles.sourceBadgeAudio : styles.sourceBadgeTranscript
          ]}
        >
          <Icon
            name={analysis.analysisSource === "audio" ? "mic" : "file-text"}
            size={14}
            color={analysis.analysisSource === "audio" ? colors.primaryDark : colors.muted}
          />
          <Text
            style={[
              styles.sourceBadgeText,
              { color: analysis.analysisSource === "audio" ? colors.primaryDark : colors.muted }
            ]}
          >
            {analysis.analysisSource === "audio"
              ? "Audio-based analysis — pronunciation was scored from your actual recording"
              : "Transcript-based analysis — pronunciation was estimated from text only"}
          </Text>
        </View>
      ) : null}

      {analysis.audioAnalysisFallback ? (
        <Card style={styles.noticeCard}>
          <View style={styles.noticeRow}>
            <Icon name="alert-triangle" size={16} color={colors.warning} />
            <Text style={styles.noticeText}>
              This analysis used your transcript instead of the audio recording — direct audio
              analysis was temporarily unavailable for this attempt. Scores and feedback are
              still valid, but pronunciation notes are transcript-based this time.
            </Text>
          </View>
        </Card>
      ) : null}

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

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    borderWidth: 1
  },
  sourceBadgeAudio: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary
  },
  sourceBadgeTranscript: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line
  },
  sourceBadgeText: {
    ...typography.label,
    flexShrink: 1
  },
  noticeCard: {
    backgroundColor: colors.warningTint,
    borderColor: colors.warning,
    borderRadius: radius.lg
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs
  },
  noticeText: {
    ...typography.body,
    color: colors.ink,
    flex: 1,
    flexShrink: 1
  },
  feedbackCard: {
    gap: spacing.sm
  },
  feedbackLine: {
    gap: spacing.xs
  },
  label: {
    ...typography.label,
    color: colors.muted
  },
  body: {
    ...typography.bodyLarge,
    color: colors.ink
  },
  listItem: {
    ...typography.bodyLarge,
    color: colors.ink,
    marginBottom: spacing.xs
  }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
