import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { QuotaNotice } from "@/components/QuotaNotice";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SectionTitle } from "@/components/SectionTitle";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { drillKindDescriptions, drillKindGoals, drillKindLabels, pickDrillPrompt } from "@/data/drillPrompts";
import { getRecentDrillPromptIds } from "@/services/storage/drillRepository";
import { computeDrillStats } from "@/services/rhetoric/drillStats";
import { DrillKind, DrillPrompt, DrillRecord } from "@/types/drill";

interface DrillHomeScreenProps {
  records: DrillRecord[];
  onBack: () => void;
  onStart: (prompt: DrillPrompt) => void;
  onHistory: () => void;
}

const KIND_ORDER: DrillKind[] = ["dolgu_yasagi", "tempo", "tekerleme"];

/**
 * The drill launcher.
 *
 * Built to be two taps from a rep. The rhetoric module opens with filters and a
 * topic draw because a five-minute speech deserves a moment's thought; a
 * one-minute rep does not, and every screen between the intent and the
 * microphone is a rep that does not happen.
 *
 * The numbers at the top are frequency and streak, never an average score. A
 * daily average would quietly punish attempting the hard twister, which is
 * exactly the rep worth attempting.
 */
export function DrillHomeScreen({ records, onBack, onStart, onHistory }: DrillHomeScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const stats = useMemo(() => computeDrillStats(records), [records]);
  const recentPromptIds = useMemo(() => getRecentDrillPromptIds(records), [records]);
  const [selectedKind, setSelectedKind] = useState<DrillKind>("dolgu_yasagi");

  function start(kind: DrillKind): void {
    onStart(pickDrillPrompt({ kind, recentPromptIds }));
  }

  return (
    <View style={styles.screen}>
      <Header
        title="Mikro egzersiz"
        subtitle="60 saniye · günde birkaç kez"
        onBack={onBack}
        backLabel="Geri"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <QuotaNotice feature="drill" exhaustedHint="Yarın devam." />

        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <Stat label="Bugün" value={`${stats.repsToday}`} hint="tekrar" colors={colors} />
            <Stat label="Seri" value={`${stats.streakDays}`} hint="gün" colors={colors} />
            <Stat
              label="Temiz seri"
              value={`${stats.currentCleanRun}`}
              hint={stats.bestCleanRun > 0 ? `en iyi ${stats.bestCleanRun}` : "dolgu sesi yok"}
              colors={colors}
            />
          </View>
          {stats.fillerTrend ? (
            <Text style={styles.trendText}>
              Dolgu sesi: dakikada {stats.fillerTrend.before} → {stats.fillerTrend.after}{" "}
              {stats.fillerTrend.improved ? "↓ düşüyor" : "↑ yükseliyor"}
            </Text>
          ) : (
            <Text style={styles.trendText}>
              Eğilim için en az 6 dolgu yasağı tekrarı gerekiyor. ({stats.byKind.dolgu_yasagi.reps}/6)
            </Text>
          )}
        </Card>

        <SectionTitle>Bugün ne çalışıyorsun?</SectionTitle>

        {KIND_ORDER.map((kind) => (
          <Pressable
            key={kind}
            accessibilityRole="button"
            accessibilityLabel={`${drillKindLabels[kind]} — ${drillKindDescriptions[kind]}`}
            accessibilityState={{ selected: selectedKind === kind }}
            onPress={() => setSelectedKind(kind)}
            style={({ pressed }) => [
              styles.kindCard,
              selectedKind === kind && styles.kindCardActive,
              pressed && styles.kindCardPressed
            ]}
          >
            <View style={styles.kindHeader}>
              <Text style={[styles.kindTitle, selectedKind === kind && styles.kindTitleActive]}>
                {drillKindLabels[kind]}
              </Text>
              <Text style={styles.kindCount}>
                {stats.byKind[kind].reps > 0
                  ? `${stats.byKind[kind].passed}/${stats.byKind[kind].reps}`
                  : "—"}
              </Text>
            </View>
            <Text style={styles.kindDescription}>{drillKindDescriptions[kind]}</Text>
            {selectedKind === kind ? <Text style={styles.kindGoal}>{drillKindGoals[kind]}</Text> : null}
          </Pressable>
        ))}

        <View style={styles.actions}>
          <AppButton label="Başla" onPress={() => start(selectedKind)} icon="mic" />
          {records.length > 0 ? (
            <AppButton label="Geçmiş" onPress={onHistory} variant="ghost" icon="clock" />
          ) : null}
        </View>

        <Text style={styles.footnote}>
          Bu egzersizlerde kayıt saklanmaz — analiz biter bitmez silinir. Amaç arşiv değil tekrar.
        </Text>
      </ScrollView>
    </View>
  );
}

function Stat({
  label,
  value,
  hint,
  colors
}: {
  label: string;
  value: string;
  hint: string;
  colors: AppColors;
}) {
  const styles = createStyles(colors);
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
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
    statsCard: {
      gap: spacing.xs,
      backgroundColor: colors.primaryTint,
      borderColor: colors.primary
    },
    statsRow: {
      flexDirection: "row",
      gap: spacing.sm
    },
    stat: {
      flex: 1,
      alignItems: "center"
    },
    statLabel: {
      ...typography.label,
      color: colors.muted
    },
    statValue: {
      ...typography.h1,
      color: colors.primaryDark
    },
    statHint: {
      ...typography.caption,
      color: colors.muted
    },
    trendText: {
      ...typography.caption,
      color: colors.muted,
      textAlign: "center"
    },
    kindCard: {
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      gap: 2
    },
    kindCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryTint
    },
    kindCardPressed: {
      opacity: 0.85
    },
    kindHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    kindTitle: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    kindTitleActive: {
      color: colors.primaryDark
    },
    kindCount: {
      ...typography.caption,
      color: colors.muted
    },
    kindDescription: {
      ...typography.body,
      color: colors.muted
    },
    kindGoal: {
      ...typography.caption,
      color: colors.primaryDark,
      marginTop: spacing.xs
    },
    actions: {
      marginTop: spacing.sm
    },
    footnote: {
      ...typography.caption,
      color: colors.muted,
      marginTop: spacing.sm
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
