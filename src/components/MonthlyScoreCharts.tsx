import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { ScoreMetric, SpeakingRecord } from "@/types/models";
import { normalizeScores, SCORE_LABELS, SCORE_METRICS } from "@/services/progress/scoreUtils";
import { AppColors, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";

interface MonthlyScoreChartsProps {
  records: SpeakingRecord[];
}

interface DailyPoint {
  day: number;
  dayKey: string;
  label: string;
  score: number | null;
}

interface ActiveMonth {
  year: number;
  monthIndex: number;
  daysInMonth: number;
  label: string;
}

const CHART_WIDTH = 300;
const CHART_HEIGHT = 132;
const PADDING_X = 24;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 30;

export function MonthlyScoreCharts({ records }: MonthlyScoreChartsProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const activeMonth = getActiveMonth(records);
  const recordsInMonth = records.filter((record) => isRecordInMonth(record, activeMonth));

  if (records.length === 0) {
    return <Text style={styles.emptyText}>At least one analysis record is needed for the chart.</Text>;
  }

  if (recordsInMonth.length === 0) {
    return (
      <Text style={styles.emptyText}>
        No analysis records yet in {activeMonth.label}.
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.monthTitle}>Daily score progress in {activeMonth.label}</Text>
      {SCORE_METRICS.map((metric) => (
        <View key={metric} style={styles.chartBlock}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>{SCORE_LABELS[metric]}</Text>
            <Text style={styles.chartMeta}>Daily score</Text>
          </View>
          <DailyLineChart
            activeMonth={activeMonth}
            colors={colors}
            points={buildDailyPoints(recordsInMonth, metric, activeMonth)}
          />
        </View>
      ))}
    </View>
  );
}

function DailyLineChart({
  activeMonth,
  colors,
  points
}: {
  activeMonth: ActiveMonth;
  colors: AppColors;
  points: DailyPoint[];
}): React.JSX.Element {
  const plotWidth = CHART_WIDTH - PADDING_X * 2;
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const denominator = Math.max(1, activeMonth.daysInMonth - 1);
  const coordinates = points.map((point) => {
    const x = PADDING_X + (plotWidth / denominator) * (point.day - 1);
    const normalizedScore = point.score ?? 0;
    const y = PADDING_TOP + plotHeight - (Math.max(0, Math.min(100, normalizedScore)) / 100) * plotHeight;

    return { ...point, x, y };
  });
  const scoredCoordinates = coordinates.filter((point) => point.score !== null);
  const linePoints = scoredCoordinates.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
      <Line
        x1={PADDING_X}
        y1={PADDING_TOP}
        x2={CHART_WIDTH - PADDING_X}
        y2={PADDING_TOP}
        stroke={colors.line}
        strokeWidth={1}
      />
      <Line
        x1={PADDING_X}
        y1={PADDING_TOP + plotHeight / 2}
        x2={CHART_WIDTH - PADDING_X}
        y2={PADDING_TOP + plotHeight / 2}
        stroke={colors.line}
        strokeWidth={1}
      />
      <Line
        x1={PADDING_X}
        y1={PADDING_TOP + plotHeight}
        x2={CHART_WIDTH - PADDING_X}
        y2={PADDING_TOP + plotHeight}
        stroke={colors.line}
        strokeWidth={1}
      />
      {scoredCoordinates.length > 1 ? (
        <Polyline
          points={linePoints}
          fill="none"
          stroke={colors.primary}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {scoredCoordinates.map((point) => (
        <Circle key={point.dayKey} cx={point.x} cy={point.y} r={4} fill={colors.accent} />
      ))}
      {coordinates.filter((point) => shouldShowDayLabel(point.day, activeMonth.daysInMonth)).map((point) => (
        <SvgText
          key={`${point.dayKey}-label`}
          x={point.x}
          y={CHART_HEIGHT - 8}
          fill={colors.muted}
          fontSize="8"
          textAnchor={point.day === 1 ? "start" : point.day === activeMonth.daysInMonth ? "end" : "middle"}
        >
          {point.label}
        </SvgText>
      ))}
      {scoredCoordinates.map((point) => (
        <SvgText
          key={`${point.dayKey}-score`}
          x={point.x}
          y={Math.max(10, point.y - 8)}
          fill={colors.ink}
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
        >
          {point.score?.toFixed(0)}
        </SvgText>
      ))}
    </Svg>
  );
}

function getActiveMonth(records: SpeakingRecord[]): ActiveMonth {
  const latestRecordDate = records
    .map((record) => new Date(record.createdAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const baseDate = latestRecordDate ?? new Date();
  const year = baseDate.getFullYear();
  const monthIndex = baseDate.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const label = baseDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  return {
    year,
    monthIndex,
    daysInMonth,
    label
  };
}

function isRecordInMonth(record: SpeakingRecord, activeMonth: ActiveMonth): boolean {
  const date = new Date(record.createdAt);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getFullYear() === activeMonth.year && date.getMonth() === activeMonth.monthIndex;
}

function buildDailyPoints(
  records: SpeakingRecord[],
  metric: ScoreMetric,
  activeMonth: ActiveMonth
): DailyPoint[] {
  const dayScores = new Map<number, number[]>();

  for (const record of records) {
    const date = new Date(record.createdAt);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const day = date.getDate();
    const score = normalizeScores(record.scores)[metric];
    dayScores.set(day, [...(dayScores.get(day) ?? []), score]);
  }

  return Array.from({ length: activeMonth.daysInMonth }, (_, index) => {
    const day = index + 1;
    const values = dayScores.get(day) ?? [];

    return {
      day,
      dayKey: `${activeMonth.year}-${String(activeMonth.monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      label: String(day),
      score: values.length > 0 ? average(values) : null
    };
  });
}

function shouldShowDayLabel(day: number, daysInMonth: number): boolean {
  return day === 1 || day === daysInMonth || day % 7 === 0;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.md
    },
    monthTitle: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    chartBlock: {
      gap: spacing.sm,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.line
    },
    chartHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    chartTitle: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    chartMeta: {
      ...typography.caption,
      color: colors.muted
    },
    emptyText: {
      ...typography.body,
      color: colors.muted
    }
  });
}
