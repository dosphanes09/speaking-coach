import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SectionTitle } from "@/components/SectionTitle";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { RhetoricRecord } from "@/types/rhetoric";
import {
  RhetoricTrend,
  buildRhetoricSummary,
  findRecurringWeaknesses,
  toTrackedMetrics
} from "@/services/rhetoric/rhetoricStats";

interface RhetoricProgressScreenProps {
  records: RhetoricRecord[];
  onBack: () => void;
}

/**
 * Progress for the rhetoric module — completely separate from the English
 * charts, because the two use different scales and averaging them would make
 * both meaningless.
 *
 * The measured rates lead and the model's score follows, for the reason stated
 * throughout this module: counts are comparable between sessions, judgements
 * are not.
 */
export function RhetoricProgressScreen({
  records,
  onBack
}: RhetoricProgressScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const summary = useMemo(() => buildRhetoricSummary(records), [records]);
  const weaknesses = useMemo(() => findRecurringWeaknesses(records), [records]);
  const chronological = useMemo(
    () => [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [records]
  );

  if (records.length === 0) {
    return (
      <View style={styles.screen}>
        <Header title="İlerleme" onBack={onBack} backLabel="Geri" />
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Henüz veri yok</Text>
          <Text style={styles.emptyBody}>
            En az iki konuşma yaptıktan sonra ölçümlerin karşılaştırılmaya başlar.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header title="İlerleme" subtitle={`${records.length} konuşma`} onBack={onBack} backLabel="Geri" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle>Ölçümlerdeki değişim</SectionTitle>
        <Text style={styles.explainer}>
          Son 3 konuşmanın ortalaması, ondan önceki 3 konuşmayla karşılaştırılıyor. Tek bir iyi veya
          kötü günün ilerleme gibi görünmesini engellemek için böyle.
        </Text>
        {summary.trends.map((trend) => (
          <TrendRow key={trend.key} trend={trend} colors={colors} />
        ))}

        <SectionTitle>Dolgu sesi eğrisi</SectionTitle>
        <Card>
          <Sparkline
            values={chronological.map((record) => toTrackedMetrics(record).fillerSoundsPerMinute)}
            colors={colors}
            lowerIsBetter
            unit="/dk"
          />
          <Text style={styles.chartNote}>
            Dakikada kaç kez "ııı" dediğin. Bu modülün en doğrudan hedefi bu çizgiyi aşağı çekmek.
          </Text>
        </Card>

        <SectionTitle>Genel puan eğrisi</SectionTitle>
        <Card>
          <Sparkline
            values={chronological.map((record) => record.analysis.scores.overall)}
            colors={colors}
            lowerIsBetter={false}
            unit=""
          />
          <Text style={styles.chartNote}>
            Model değerlendirmesi. Seanslar arasında oynayabilir; asıl göstergen yukarıdaki ölçümler.
          </Text>
        </Card>

        {summary.averageSelfScoreGap !== null ? (
          <>
            <SectionTitle>Öz değerlendirme farkın</SectionTitle>
            <Card style={styles.gapCard}>
              <Text style={styles.gapValue}>
                {summary.averageSelfScoreGap > 0 ? "+" : ""}
                {Math.round(summary.averageSelfScoreGap)} puan
              </Text>
              <Text style={styles.gapText}>{describeSelfGap(summary.averageSelfScoreGap)}</Text>
            </Card>
          </>
        ) : null}

        {weaknesses.length > 0 ? (
          <>
            <SectionTitle>Tekrar eden zayıflıklar</SectionTitle>
            <Card style={styles.weaknessCard}>
              <Text style={styles.weaknessIntro}>
                Son konuşmalarının çoğunda 70'in altında kalan boyutlar:
              </Text>
              {weaknesses.map((item) => (
                <View key={item.key} style={styles.weaknessRow}>
                  <Text style={styles.weaknessLabel}>{item.label}</Text>
                  <Text style={styles.weaknessValue}>ort. {Math.round(item.average)}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function TrendRow({ trend, colors }: { trend: RhetoricTrend; colors: AppColors }) {
  const styles = createStyles(colors);

  if (!trend.hasComparison) {
    return (
      <View style={styles.trendRow}>
        <Text style={styles.trendLabel}>{trend.label}</Text>
        <Text style={styles.trendPending}>
          {formatValue(trend.recent, trend.unit)} · karşılaştırma için daha fazla konuşma gerek
        </Text>
      </View>
    );
  }

  const color = Math.abs(trend.change) < 0.05 ? colors.muted : trend.improved ? colors.success : colors.danger;
  const arrow = Math.abs(trend.change) < 0.05 ? "→" : trend.change > 0 ? "↑" : "↓";

  return (
    <View style={styles.trendRow}>
      <View style={styles.trendHead}>
        <Text style={styles.trendLabel}>{trend.label}</Text>
        <Text style={[styles.trendChange, { color }]}>
          {arrow} {formatValue(Math.abs(trend.change), trend.unit)}
        </Text>
      </View>
      <Text style={styles.trendDetail}>
        {formatValue(trend.earlier, trend.unit)} → {formatValue(trend.recent, trend.unit)}
      </Text>
    </View>
  );
}

/**
 * A tiny bar chart drawn with plain Views.
 *
 * A charting library would be a heavy dependency for six bars, and this keeps
 * the module working identically on the phone and the desktop build.
 */
function Sparkline({
  values,
  colors,
  lowerIsBetter,
  unit
}: {
  values: number[];
  colors: AppColors;
  lowerIsBetter: boolean;
  unit: string;
}) {
  const styles = createStyles(colors);
  const recent = values.slice(-12);

  if (recent.length === 0) {
    return <Text style={styles.chartNote}>Veri yok.</Text>;
  }

  const max = Math.max(...recent, 0.0001);
  const first = recent[0] as number;
  const last = recent[recent.length - 1] as number;
  const improved = lowerIsBetter ? last < first : last > first;

  return (
    <View style={styles.chart}>
      <View style={styles.bars}>
        {recent.map((value, index) => (
          <View key={index} style={styles.barSlot}>
            <View
              style={[
                styles.bar,
                {
                  height: `${Math.max(4, (value / max) * 100)}%`,
                  backgroundColor:
                    index === recent.length - 1
                      ? improved
                        ? colors.success
                        : colors.warning
                      : colors.primary
                }
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.chartLegend}>
        <Text style={styles.chartLegendText}>
          ilk: {formatValue(first, unit)}
        </Text>
        <Text style={[styles.chartLegendText, { color: improved ? colors.success : colors.warning }]}>
          son: {formatValue(last, unit)}
        </Text>
      </View>
    </View>
  );
}

function formatValue(value: number, unit: string): string {
  const rounded = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return unit === "%" ? `%${rounded}` : `${rounded}${unit}`;
}

function describeSelfGap(gap: number): string {
  const rounded = Math.round(gap);
  if (Math.abs(rounded) <= 8) {
    return "Kendini gerçekçi değerlendiriyorsun. Bu, uygulama yanında yokken de doğru yönde ilerleyebileceğin anlamına geliyor.";
  }
  if (rounded > 0) {
    return "Kendine analizden daha yüksek puan veriyorsun. Fark ettiğin şeylerle fark etmediklerin arasında bir boşluk var — işaretlenmiş metne daha çok bak.";
  }
  return "Kendine analizden daha düşük puan veriyorsun. Konuşmaların düşündüğünden iyi; sertliğin gelişimi engelliyor olabilir.";
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
    explainer: {
      ...typography.caption,
      color: colors.muted
    },
    trendRow: {
      padding: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      gap: 2
    },
    trendHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    trendLabel: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    trendChange: {
      ...typography.bodyStrong
    },
    trendDetail: {
      ...typography.caption,
      color: colors.muted
    },
    trendPending: {
      ...typography.caption,
      color: colors.muted
    },
    chart: {
      gap: spacing.xs
    },
    bars: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 4,
      height: 110
    },
    barSlot: {
      flex: 1,
      height: "100%",
      justifyContent: "flex-end"
    },
    bar: {
      width: "100%",
      borderRadius: radius.sm
    },
    chartLegend: {
      flexDirection: "row",
      justifyContent: "space-between"
    },
    chartLegendText: {
      ...typography.caption,
      color: colors.muted
    },
    chartNote: {
      ...typography.caption,
      color: colors.muted
    },
    gapCard: {
      gap: spacing.xs
    },
    gapValue: {
      ...typography.display,
      color: colors.primaryDark
    },
    gapText: {
      ...typography.body,
      color: colors.ink
    },
    weaknessCard: {
      gap: spacing.xs
    },
    weaknessIntro: {
      ...typography.caption,
      color: colors.muted
    },
    weaknessRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.line
    },
    weaknessLabel: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    weaknessValue: {
      ...typography.bodyStrong,
      color: colors.warning
    },
    emptyCard: {
      gap: spacing.xs
    },
    emptyTitle: {
      ...typography.h2,
      color: colors.ink
    },
    emptyBody: {
      ...typography.body,
      color: colors.muted
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
