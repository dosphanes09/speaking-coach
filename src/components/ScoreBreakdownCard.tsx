import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { DimensionValue } from "react-native";
import { AnalysisResult, ScoreMetric } from "@/types/models";
import { formatScore100, normalizeScores, SCORE_LABELS, SCORE_METRICS } from "@/services/progress/scoreUtils";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Card } from "./Card";

interface ScoreBreakdownCardProps {
  analysis: AnalysisResult;
}

interface ScoreBreakdownItem {
  metric: ScoreMetric;
  label: string;
  score: number;
  reasonTR: string;
  nextFocusTR: string;
}

export function ScoreBreakdownCard({ analysis }: ScoreBreakdownCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const items = buildScoreBreakdownItems(analysis);

  return (
    <Card style={styles.card}>
      <View style={styles.rubricIntro}>
        <Text style={styles.rubricTitle}>Score rubric</Text>
        <Text style={styles.rubricText}>
          Overall score considers grammar, fluency/coherence, content relevance, vocabulary range, and task completion.
          Short answers are capped even when grammar is accurate.
        </Text>
      </View>
      {items.map((item) => (
        <View key={item.metric} style={styles.item}>
          <View style={styles.headerRow}>
            <Text style={styles.metric}>{item.label}</Text>
            <Text style={styles.score}>{formatScore100(item.score)}/100</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${item.score}%` as DimensionValue }]} />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.label}>Neden bu skor?</Text>
            <Text style={styles.body}>{item.reasonTR}</Text>
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.label}>Sonraki denemede odak</Text>
            <Text style={styles.body}>{item.nextFocusTR}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

function buildScoreBreakdownItems(analysis: AnalysisResult): ScoreBreakdownItem[] {
  const scores = normalizeScores(analysis.scores);

  return SCORE_METRICS.map((metric) => ({
    metric,
    label: SCORE_LABELS[metric],
    score: scores[metric],
    reasonTR: buildReason(analysis, metric),
    nextFocusTR: buildNextFocus(analysis, metric)
  }));
}

function buildReason(analysis: AnalysisResult, metric: ScoreMetric): string {
  switch (metric) {
    case "grammar":
      return normalizeText(
        analysis.speakingFeedback.grammar,
        "Grammar skoru, cümle doğruluğu, tense kullanımı ve hata yoğunluğuna göre değerlendirildi."
      );
    case "vocabulary":
      return normalizeText(
        analysis.speakingFeedback.vocabulary,
        "Vocabulary skoru, kelime çeşitliliği ve daha doğal alternatif kullanımı ihtiyacına göre değerlendirildi."
      );
    case "fluency":
      return normalizeText(
        analysis.speakingFeedback.fluency,
        "Fluency skoru, konuşma akışı, duraksama ve tekrar problemlerine göre değerlendirildi."
      );
    case "pronunciation":
      return normalizeText(
        analysis.speakingFeedback.pronunciationNotes,
        "Pronunciation skoru sadece transcript üzerinden tahmini olarak değerlendirildi."
      );
    case "coherence":
      return normalizeText(
        analysis.speakingFeedback.coherence,
        "Coherence skoru, fikrin sıralanması, örnek kullanımı ve bağlantı cümlelerine göre değerlendirildi."
      );
    case "naturalness":
      return normalizeText(
        analysis.sentenceStructureSuggestions?.[0] ?? "",
        "Naturalness skoru, cevabın native-like akışı, doğal kelime seçimi ve cümle yapısına göre tahmin edildi."
      );
    case "overall":
      return normalizeText(
        analysis.improvementPlan.whatWentWell,
        "Overall skor, grammar, vocabulary, fluency, coherence ve genel anlatım gücünün birleşimidir."
      );
    default:
      return "Bu skor mevcut konuşma analizindeki güçlü ve gelişmesi gereken yönlere göre hesaplandı.";
  }
}

function buildNextFocus(analysis: AnalysisResult, metric: ScoreMetric): string {
  switch (metric) {
    case "grammar":
      return normalizeText(
        analysis.mistakes[0]?.problem ?? "",
        "Bir sonraki denemede bir ana tense ve bir doğru cümle kalıbına odaklan."
      );
    case "vocabulary":
      return normalizeText(
        analysis.vocabularySuggestions[0] ?? "",
        "Basit kelimeleri daha güçlü alternatiflerle değiştirip en az 3 yeni cümle kur."
      );
    case "fluency":
      return normalizeText(
        analysis.speakingFeedback.repetitionProblems,
        "Cevap vermeden önce 3 anahtar kelime belirle ve duraksamaları azaltmak için kısa cümlelerle konuş."
      );
    case "pronunciation":
      return "Corrected version içinden 2 cümle seç, yavaş ve doğal hızda 5 kez shadowing yap.";
    case "coherence":
      return normalizeText(
        analysis.connectorSuggestions[0] ?? "",
        "Cevabını fikir, neden, örnek ve sonuç sırasıyla kurmaya çalış."
      );
    case "naturalness":
      return normalizeText(
        analysis.sentenceStructureSuggestions?.[1] ?? analysis.correctedVersion,
        "Aynı cevabı birebir çevirmeden, daha kısa ve doğal İngilizce cümlelerle tekrar söyle."
      );
    case "overall":
      return normalizeText(
        analysis.improvementPlan.tomorrowFocus || analysis.improvementPlan.homework,
        "Bir sonraki denemede tek bir ana problem seç ve cevabını onun etrafında iyileştir."
      );
    default:
      return "Bir sonraki denemede daha net, daha doğal ve daha düzenli bir cevap hedefle.";
  }
}

function normalizeText(value: string, fallback: string): string {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : fallback;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    gap: spacing.md
  },
  rubricIntro: {
    gap: spacing.xs
  },
  rubricTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  rubricText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  item: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  metric: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    flex: 1
  },
  score: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900"
  },
  track: {
    height: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    overflow: "hidden"
  },
  fill: {
    height: 8,
    backgroundColor: colors.primary
  },
  textBlock: {
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
    fontSize: 14,
    lineHeight: 20
  }
  });
}
