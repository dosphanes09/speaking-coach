import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { DimensionValue } from "react-native";
import { AnalysisResult, ScoreMetric } from "@/types/models";
import { formatScore100, normalizeScores, SCORE_LABELS } from "@/services/progress/scoreUtils";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Icon, IconName } from "./Icon";
import { IconBadge } from "./IconBadge";
import { RingProgress } from "./RingProgress";

interface ScoreBreakdownCardProps {
  analysis: AnalysisResult;
}

/** The metrics shown as individual rows. "overall" drives the hero ring instead. */
const DETAIL_METRICS: ScoreMetric[] = ["grammar", "vocabulary", "fluency", "pronunciation", "coherence", "naturalness"];

const METRIC_STYLE: Record<ScoreMetric, { icon: IconName; colorKey: keyof AppColors; tintKey: keyof AppColors }> = {
  grammar: { icon: "edit-3", colorKey: "primaryDark", tintKey: "primaryTint" },
  vocabulary: { icon: "book-open", colorKey: "accent", tintKey: "accentTint" },
  fluency: { icon: "activity", colorKey: "warning", tintKey: "warningTint" },
  pronunciation: { icon: "mic", colorKey: "secondary", tintKey: "secondaryTint" },
  coherence: { icon: "link-2", colorKey: "success", tintKey: "successTint" },
  naturalness: { icon: "smile", colorKey: "accent", tintKey: "accentTint" },
  overall: { icon: "award", colorKey: "primaryDark", tintKey: "primaryTint" }
};

export function ScoreBreakdownCard({ analysis }: ScoreBreakdownCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const scores = normalizeScores(analysis.scores);
  const overallScore = scores.overall;

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <RingProgress size={72} strokeWidth={7} progress={overallScore / 100} color={colors.primary} trackColor={colors.primaryTint}>
          <View style={styles.heroRingInner}>
            <Text style={styles.heroRingValue}>{formatScore100(overallScore)}</Text>
            <Text style={styles.heroRingDenominator}>/100</Text>
          </View>
        </RingProgress>
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroTitle}>{buildOverallHeadline(overallScore)}</Text>
          <Text style={styles.heroSubtitle}>
            {normalizeText(
              analysis.improvementPlan.whatWentWell,
              "Overall score combines grammar, fluency, coherence, vocabulary range, and task completion."
            )}
          </Text>
        </View>
      </View>

      <View style={styles.metricListCard}>
        {DETAIL_METRICS.map((metric, index) => {
          const style = METRIC_STYLE[metric];
          const score = scores[metric];
          return (
            <View key={metric} style={[styles.metricRow, index < DETAIL_METRICS.length - 1 && styles.metricRowDivider]}>
              <IconBadge name={style.icon} color={colors[style.colorKey]} backgroundColor={colors[style.tintKey]} size={30} />
              <Text style={styles.metricName}>{SCORE_LABELS[metric]}</Text>
              <View style={styles.metricBarTrack}>
                <View style={[styles.metricBarFill, { width: `${score}%` as DimensionValue, backgroundColor: colors[style.colorKey] }]} />
              </View>
              <Text style={styles.metricValue}>{formatScore100(score)}</Text>
            </View>
          );
        })}
      </View>

      {DETAIL_METRICS.map((metric) => {
        const style = METRIC_STYLE[metric];
        return (
          <View key={metric} style={styles.detailCard}>
            <View style={styles.detailHead}>
              <IconBadge name={style.icon} color={colors[style.colorKey]} backgroundColor={colors[style.tintKey]} size={32} />
              <Text style={styles.detailTitle}>{SCORE_LABELS[metric]}</Text>
            </View>
            <View style={styles.detailLine}>
              <Icon name="help-circle" size={13} color={colors.muted} />
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Why this score  </Text>
                {buildReason(analysis, metric)}
              </Text>
            </View>
            <View style={styles.detailLine}>
              <Icon name="target" size={13} color={colors.muted} />
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Next focus  </Text>
                {buildNextFocus(analysis, metric)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function buildOverallHeadline(score: number): string {
  if (score >= 85) {
    return "Excellent, confident answer";
  }
  if (score >= 70) {
    return "Solid, clear answer";
  }
  if (score >= 55) {
    return "Good effort — keep practicing";
  }
  return "A first step — keep going";
}

function buildReason(analysis: AnalysisResult, metric: ScoreMetric): string {
  switch (metric) {
    case "grammar":
      return normalizeText(
        analysis.speakingFeedback.grammar,
        "Scored from sentence accuracy, tense use, and how often mistakes appeared."
      );
    case "vocabulary":
      return normalizeText(
        analysis.speakingFeedback.vocabulary,
        "Scored from word variety and how natural your word choices were."
      );
    case "fluency":
      return normalizeText(
        analysis.speakingFeedback.fluency,
        "Scored from how smoothly you spoke, and how much you paused or repeated words."
      );
    case "pronunciation":
      return normalizeText(
        analysis.speakingFeedback.pronunciationNotes,
        "Pronunciation is estimated from the transcript only, not the audio itself."
      );
    case "coherence":
      return normalizeText(
        analysis.speakingFeedback.coherence,
        "Scored from how well your ideas were ordered and connected."
      );
    case "naturalness":
      return normalizeText(
        analysis.sentenceStructureSuggestions?.[0] ?? "",
        "Estimated from how native-like your sentence flow and word choice sounded."
      );
    default:
      return "This score reflects the strengths and growth areas found in this recording.";
  }
}

function buildNextFocus(analysis: AnalysisResult, metric: ScoreMetric): string {
  switch (metric) {
    case "grammar":
      return normalizeText(
        analysis.mistakes[0]?.problem ?? "",
        "Next time, focus on one main tense and one correct sentence pattern."
      );
    case "vocabulary":
      return normalizeText(
        analysis.vocabularySuggestions[0] ?? "",
        "Swap a few simple words for stronger alternatives and build 3 new sentences with them."
      );
    case "fluency":
      return normalizeText(
        analysis.speakingFeedback.repetitionProblems,
        "Pick 3 key words before you answer, then use short sentences to cut down on hesitation."
      );
    case "pronunciation":
      return "Pick 2 sentences from the corrected version and shadow them slowly, 5 times.";
    case "coherence":
      return normalizeText(
        analysis.connectorSuggestions[0] ?? "",
        "Try structuring your answer as idea, reason, example, then conclusion."
      );
    case "naturalness":
      return normalizeText(
        analysis.sentenceStructureSuggestions?.[1] ?? analysis.correctedVersion,
        "Say the same answer again without translating word-for-word — keep sentences short and natural."
      );
    default:
      return "Pick one main problem to focus on and build your next answer around fixing it.";
  }
}

function normalizeText(value: string, fallback: string): string {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm
    },
    heroCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.md,
      shadowColor: "#000000",
      shadowOpacity: 0.07,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 2
    },
    heroRingInner: {
      alignItems: "center"
    },
    heroRingValue: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.ink,
      lineHeight: 22
    },
    heroRingDenominator: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.muted
    },
    heroTextBlock: {
      flex: 1
    },
    heroTitle: {
      ...typography.h2,
      color: colors.ink,
      marginBottom: 3
    },
    heroSubtitle: {
      ...typography.caption,
      color: colors.muted,
      lineHeight: 18
    },
    metricListCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      shadowColor: "#000000",
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 1
    },
    metricRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm + 2
    },
    metricRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.line
    },
    metricName: {
      ...typography.bodyStrong,
      color: colors.ink,
      flex: 1
    },
    metricBarTrack: {
      width: 64,
      height: 6,
      borderRadius: 4,
      backgroundColor: colors.surfaceMuted,
      overflow: "hidden"
    },
    metricBarFill: {
      height: 6,
      borderRadius: 4
    },
    metricValue: {
      ...typography.bodyStrong,
      color: colors.ink,
      width: 28,
      textAlign: "right"
    },
    detailCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.xs,
      shadowColor: "#000000",
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 1
    },
    detailHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: 2
    },
    detailTitle: {
      ...typography.h2,
      color: colors.ink
    },
    detailLine: {
      flexDirection: "row",
      gap: spacing.xs,
      alignItems: "flex-start"
    },
    detailLabel: {
      ...typography.label,
      color: colors.muted
    },
    detailText: {
      ...typography.body,
      color: colors.ink,
      flex: 1,
      flexShrink: 1
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
