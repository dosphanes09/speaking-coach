import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SectionTitle } from "@/components/SectionTitle";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { drillKindLabels } from "@/data/drillPrompts";
import { computeDrillStats } from "@/services/rhetoric/drillStats";
import { DrillRecord } from "@/types/drill";

interface DrillHistoryScreenProps {
  records: DrillRecord[];
  onBack: () => void;
}

/**
 * The reps, grouped by day.
 *
 * Grouped rather than listed flat because the question this screen answers is
 * "am I actually doing these", and that is a question about days, not about
 * individual reps. A flat list of 200 rows answers it much worse than seven
 * rows saying how many happened each day.
 *
 * There is no detail view to tap into: the recordings are deleted after
 * analysis by design, so there is nothing further to show.
 */
export function DrillHistoryScreen({ records, onBack }: DrillHistoryScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const stats = useMemo(() => computeDrillStats(records), [records]);
  const days = useMemo(() => groupByDay(records), [records]);

  return (
    <View style={styles.screen}>
      <Header
        title="Egzersiz geçmişi"
        subtitle={`${stats.totalReps} tekrar · ${stats.streakDays} günlük seri`}
        onBack={onBack}
        backLabel="Geri"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {records.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Henüz tekrar yok</Text>
            <Text style={styles.emptyBody}>
              Bir mikro egzersiz 60 saniye sürüyor. İlk tekrarını yaptığında burada gün gün
              birikmeye başlayacak — asıl bakacağın şey puanlar değil, kaç gün üst üste yaptığın.
            </Text>
          </Card>
        ) : null}

        {days.map((day) => (
          <View key={day.key} style={styles.dayBlock}>
            <SectionTitle>{day.label}</SectionTitle>
            <Card style={styles.dayCard}>
              <Text style={styles.daySummary}>
                {day.records.length} tekrar · {day.passed} geçti
              </Text>
              {day.records.map((record) => (
                <View key={record.id} style={styles.row}>
                  <View
                    style={[
                      styles.dot,
                      record.result.outcome.passed ? styles.dotPass : styles.dotFail
                    ]}
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{drillKindLabels[record.prompt.kind]}</Text>
                    <Text style={styles.rowMeta}>
                      {formatTime(record.createdAt)} · {record.result.outcome.headline}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

interface DayGroup {
  key: string;
  label: string;
  records: DrillRecord[];
  passed: number;
}

/** Local calendar day. ISO string prefixes would put a late-evening rep on the next day. */
function groupByDay(records: DrillRecord[]): DayGroup[] {
  const groups = new Map<string, DrillRecord[]>();

  for (const record of records) {
    const date = new Date(record.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, dayRecords]) => ({
      key,
      label: formatDayLabel(key),
      records: dayRecords,
      passed: dayRecords.filter((record) => record.result.outcome.passed).length
    }));
}

function formatDayLabel(key: string): string {
  const parts = key.split("-").map(Number);
  const date = new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  const now = new Date();
  const isSameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(date, now)) {
    return "Bugün";
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return "Dün";
  }

  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
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
    },
    dayBlock: {
      gap: spacing.xs
    },
    dayCard: {
      gap: spacing.xs
    },
    daySummary: {
      ...typography.label,
      color: colors.muted
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: 4
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: radius.sm
    },
    dotPass: {
      backgroundColor: colors.success
    },
    dotFail: {
      backgroundColor: colors.warning
    },
    rowText: {
      flex: 1
    },
    rowTitle: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    rowMeta: {
      ...typography.caption,
      color: colors.muted
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
