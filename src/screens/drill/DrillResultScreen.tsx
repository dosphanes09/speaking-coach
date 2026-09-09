import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { CollapsibleCard } from "@/components/CollapsibleCard";
import { Header } from "@/components/Header";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { proseWidth } from "@/theme/layout";
import { useThemeColors } from "@/theme/ThemeProvider";
import { drillKindLabels } from "@/data/drillPrompts";
import { DrillRecord } from "@/types/drill";

interface DrillResultScreenProps {
  record: DrillRecord;
  /** Reps done today, so the screen can say what the streak looks like now. */
  repsToday: number;
  onAgain: () => void;
  onAnother: () => void;
  onHome: () => void;
}

/**
 * The rep result.
 *
 * Ordered around one decision: do another. The verdict is the first thing on
 * screen and the "again" button is the first action, because the value of this
 * feature is the fourth rep, not the report on the third. Numbers live in a
 * collapsed section for the same reason — they are worth having, and worth not
 * reading every time.
 */
export function DrillResultScreen({
  record,
  repsToday,
  onAgain,
  onAnother,
  onHome
}: DrillResultScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { outcome, metrics } = record.result;
  const isReading = record.prompt.kind !== "dolgu_yasagi";

  return (
    <View style={styles.screen}>
      <Header
        title={drillKindLabels[record.prompt.kind]}
        subtitle={record.prompt.title}
        onBack={onHome}
        backLabel="Bitir"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={[styles.verdictCard, outcome.passed ? styles.verdictPass : styles.verdictFail]}>
          <Text style={[styles.verdictBadge, outcome.passed ? styles.badgePass : styles.badgeFail]}>
            {outcome.passed ? "GEÇTİ" : "GEÇMEDİ"}
          </Text>
          <Text style={styles.verdictHeadline}>{outcome.headline}</Text>
          <Text style={styles.verdictDetail}>{outcome.detail}</Text>
        </Card>

        {outcome.tip ? (
          <Card style={styles.tipCard}>
            <Text style={styles.tipLabel}>SONRAKİ TEKRARDA</Text>
            <Text style={styles.tipText}>{outcome.tip}</Text>
          </Card>
        ) : null}

        {/* The action comes before the numbers on purpose: the point of a drill
            is the next rep, not the report on this one. */}
        <View style={styles.actions}>
          <AppButton label="Aynısını tekrar yap" onPress={onAgain} icon="refresh-cw" />
          <AppButton label="Başka bir egzersiz" onPress={onAnother} variant="ghost" icon="shuffle" />
        </View>

        <Text style={styles.todayLine}>
          Bugün {repsToday} tekrar yaptın.
          {repsToday < 3 ? " Günde 3 tekrar bu işi yürütür." : " İyi gidiyor."}
        </Text>

        <CollapsibleCard title="Ölçümler" subtitle="Rakamlar">
          {!isReading ? (
            <>
              <MetricRow label="Dolgu sesi" value={`${metrics.fillerSoundCount}`} colors={colors} />
              <MetricRow label="Dolgu kelimesi" value={`${metrics.fillerWordCount}`} colors={colors} />
            </>
          ) : null}
          {metrics.wordsPerMinute !== null ? (
            <MetricRow
              label="Konuşma hızı"
              value={`${Math.round(metrics.wordsPerMinute)} kelime/dk`}
              measured={metrics.metricsSource === "measured"}
              colors={colors}
            />
          ) : null}
          {metrics.articulationWordsPerMinute !== null ? (
            <MetricRow
              label="Duraklamalar hariç hız"
              value={`${Math.round(metrics.articulationWordsPerMinute)} kelime/dk`}
              measured={metrics.metricsSource === "measured"}
              colors={colors}
            />
          ) : null}
          {metrics.textAccuracy !== null ? (
            <MetricRow
              label="Metne bağlılık"
              value={`%${Math.round(metrics.textAccuracy * 100)}`}
              measured
              colors={colors}
            />
          ) : null}
          <MetricRow
            label="Duraklama"
            value={`${metrics.pauseCount} · en uzunu ${metrics.longestPauseSeconds.toFixed(1)} sn`}
            measured={metrics.metricsSource === "measured"}
            colors={colors}
          />
          {isReading ? (
            <Text style={styles.metricNote}>
              Bu egzersizde kayıt dolgu sesi için dinlenmedi, o yüzden dolgu sayısı gösterilmiyor.
            </Text>
          ) : null}
        </CollapsibleCard>

        {record.result.fillerMoments.length > 0 ? (
          <CollapsibleCard title="Dolgu sesleri nerede çıktı" subtitle="Örüntüyü gör">
            {record.result.fillerMoments.map((moment, index) => (
              <Text key={`${moment.text}-${index}`} style={styles.momentLine}>
                {formatClock(moment.startSeconds)} · {moment.text}
              </Text>
            ))}
            <Text style={styles.metricNote}>
              Hepsi aynı yerde mi çıkıyor — cümle başında, yeni bir düşünceye geçerken? Örüntü,
              sayıdan daha çok işe yarar.
            </Text>
          </CollapsibleCard>
        ) : null}

        {record.result.transcript ? (
          <CollapsibleCard title="Döküm" subtitle="Ne söylendi">
            <Text style={styles.transcript}>{record.result.transcript}</Text>
          </CollapsibleCard>
        ) : null}
      </ScrollView>
    </View>
  );
}

function MetricRow({
  label,
  value,
  measured,
  colors
}: {
  label: string;
  value: string;
  measured?: boolean;
  colors: AppColors;
}) {
  const styles = createStyles(colors);
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>
        {label}
        {measured ? <Text style={styles.measuredMark}> · ölçüldü</Text> : null}
      </Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatClock(totalSeconds: number): string {
  const whole = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
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
    verdictCard: {
      gap: spacing.xs,
      borderWidth: 2
    },
    verdictPass: {
      backgroundColor: colors.successTint,
      borderColor: colors.success
    },
    verdictFail: {
      backgroundColor: colors.warningTint,
      borderColor: colors.warning
    },
    verdictBadge: {
      ...typography.label,
      alignSelf: "flex-start",
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.lg,
      overflow: "hidden",
      color: colors.onAccent
    },
    badgePass: {
      backgroundColor: colors.success
    },
    badgeFail: {
      backgroundColor: colors.warning
    },
    verdictHeadline: {
      ...typography.h1,
      color: colors.ink
    },
    verdictDetail: {
      ...typography.body,
      color: colors.ink
    },
    tipCard: {
      gap: 2,
      backgroundColor: colors.accentTint,
      borderColor: colors.accent
    },
    tipLabel: {
      ...typography.label,
      color: colors.accent
    },
    tipText: {
      ...typography.body,
      color: colors.ink
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.xs
    },
    todayLine: {
      ...typography.caption,
      color: colors.muted,
      textAlign: "center"
    },
    metricRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 4,
      gap: spacing.sm
    },
    metricLabel: {
      ...typography.body,
      color: colors.muted,
      flexShrink: 1
    },
    measuredMark: {
      ...typography.caption,
      color: colors.success
    },
    metricValue: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    metricNote: {
      ...typography.caption,
      color: colors.muted,
      marginTop: spacing.xs
    },
    momentLine: {
      ...typography.body,
      color: colors.ink,
      paddingVertical: 2
    },
    transcript: {
      ...typography.body,
      // Read start to finish, so capped tighter than the shell: past about
      // 90 characters per line the eye lands on the wrong line coming back.
      ...proseWidth,
      color: colors.ink,
      lineHeight: 24
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
