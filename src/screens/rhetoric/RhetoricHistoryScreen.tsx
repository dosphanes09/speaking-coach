import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icon";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { rhetoricCategoryLabels } from "@/data/rhetoricTopics";
import { RhetoricRecord } from "@/types/rhetoric";

interface RhetoricHistoryScreenProps {
  records: RhetoricRecord[];
  onBack: () => void;
  onSelect: (record: RhetoricRecord) => void;
}

export function RhetoricHistoryScreen({
  records,
  onBack,
  onSelect
}: RhetoricHistoryScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.screen}>
      <Header
        title="Kayıtlar"
        subtitle={records.length > 0 ? `${records.length} konuşma` : undefined}
        onBack={onBack}
        backLabel="Geri"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {records.length === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>Henüz konuşma yok</Text>
            <Text style={styles.emptyBody}>
              İlk hazırlıklı veya doğaçlama konuşmanı yaptığında burada listelenecek.
            </Text>
          </Card>
        ) : (
          records.map((record) => (
            <Pressable
              key={record.id}
              accessibilityRole="button"
              accessibilityLabel={record.topic.title}
              onPress={() => onSelect(record)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.scoreBadge}>
                <Text style={[styles.scoreValue, { color: scoreColor(record.analysis.scores.overall, colors) }]}>
                  {record.analysis.scores.overall}
                </Text>
              </View>

              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {record.topic.title}
                </Text>
                <Text style={styles.rowMeta}>
                  {formatDate(record.createdAt)} · {rhetoricCategoryLabels[record.topic.category]} ·{" "}
                  {record.mode === "impromptu" ? "doğaçlama" : "hazırlıklı"} ·{" "}
                  {formatDuration(record.recording.durationSeconds)}
                </Text>
                <View style={styles.tagRow}>
                  <Tag
                    text={`${record.analysis.metrics.fillerSoundCount} ııı`}
                    tone={record.analysis.metrics.fillerSoundCount <= 3 ? "good" : "warn"}
                    colors={colors}
                  />
                  <Tag
                    text={`${Math.round(record.analysis.metrics.wordsPerMinute)} kelime/dk`}
                    tone="neutral"
                    colors={colors}
                  />
                  {record.retakeOfRecordId ? <Tag text="tekrar" tone="info" colors={colors} /> : null}
                  {record.analysis.audioAnalysisFallback ? (
                    <Tag text="ses analizi yok" tone="warn" colors={colors} />
                  ) : null}
                </View>
              </View>

              <Icon name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Tag({
  text,
  tone,
  colors
}: {
  text: string;
  tone: "good" | "warn" | "neutral" | "info";
  colors: AppColors;
}) {
  const styles = createStyles(colors);
  const palette = {
    good: { bg: colors.successTint, fg: colors.success },
    warn: { bg: colors.warningTint, fg: colors.warning },
    neutral: { bg: colors.surfaceMuted, fg: colors.muted },
    info: { bg: colors.accentTint, fg: colors.accent }
  }[tone];

  return (
    <View style={[styles.tag, { backgroundColor: palette.bg }]}>
      <Text style={[styles.tagText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

function scoreColor(value: number, colors: AppColors): string {
  if (value >= 80) {
    return colors.success;
  }
  if (value >= 65) {
    return colors.primaryDark;
  }
  if (value >= 50) {
    return colors.warning;
  }
  return colors.danger;
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(value)
    );
  } catch {
    return value.slice(0, 10);
  }
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: spacing.screen
    },
    content: {
      paddingBottom: spacing.xl,
      gap: spacing.sm
    },
    emptyTitle: {
      ...typography.h2,
      color: colors.ink
    },
    emptyBody: {
      ...typography.body,
      color: colors.muted
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface
    },
    pressed: {
      opacity: 0.85
    },
    scoreBadge: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted
    },
    scoreValue: {
      ...typography.h1
    },
    rowText: {
      flex: 1,
      gap: 3
    },
    rowTitle: {
      ...typography.bodyStrong,
      color: colors.ink,
      fontSize: 15
    },
    rowMeta: {
      ...typography.caption,
      color: colors.muted
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4
    },
    tag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.sm
    },
    tagText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: "700"
    }
  });
}
