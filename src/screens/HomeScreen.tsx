import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { NavListCard, NavListItem } from "@/components/NavListItem";
import { RingProgress } from "@/components/RingProgress";
import { SpeakingRecord } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors, useThemeMode } from "@/theme/ThemeProvider";
import { formatReadableDate } from "@/utils/date";
import { formatScore100, normalizeScores } from "@/services/progress/scoreUtils";
import { StreakSummary } from "@/services/streak/streakService";
import { loadDailyLessonState } from "@/services/storage/dailyLessonRepository";
import { isLessonForDate } from "@/services/lesson/dailyLessonLogic";
import { toDateKey } from "@/utils/date";

const WEEKLY_STREAK_GOAL_DAYS = 7;
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

interface HomeScreenProps {
  records: SpeakingRecord[];
  streakSummary: StreakSummary;
  onStartThinking: () => void;
  onDailyLesson: () => void;
  onChat: () => void;
  onLearning: () => void;
  onPracticeModes: () => void;
  onHistory: () => void;
  onProgress: () => void;
  onSettings: () => void;
}

export function HomeScreen({
  records,
  streakSummary,
  onStartThinking,
  onDailyLesson,
  onChat,
  onLearning,
  onPracticeModes,
  onHistory,
  onProgress,
  onSettings
}: HomeScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const themeMode = useThemeMode();
  const styles = createStyles(colors);
  const isLoveMode = themeMode === "love";
  const latestRecord = records[0];
  const latestOverallScore = latestRecord ? normalizeScores(latestRecord.scores).overall : 0;
  const recordsThisWeek = useMemo(() => countRecordsSince(records, WEEK_IN_MS), [records]);
  const greeting = useMemo(() => getGreeting(), []);
  const streakProgress = Math.min(1, streakSummary.currentStreakDays / WEEKLY_STREAK_GOAL_DAYS);
  const todaysLesson = useTodaysLesson();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.h1}>Ready to practice?</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={onSettings}
            hitSlop={4}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
          >
            <Icon name="settings" size={18} color={colors.onAccent} />
          </Pressable>
        </View>

        {isLoveMode ? (
          <View style={styles.loveBanner}>
            <Text style={styles.loveBannerIcon}>❤️</Text>
            <Text style={styles.loveBannerText}>Every practice session, a little more love, a little more confidence.</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start speaking practice"
          onPress={onStartThinking}
          style={({ pressed }) => [styles.hero, pressed && styles.heroPressed]}
        >
          <View style={styles.heroGlow} />
          <Text style={styles.heroEyebrow}>Speaking practice</Text>
          <Text style={styles.heroTitle}>Prepare, speak, and get instant feedback</Text>
          <View style={styles.heroCta}>
            <Text style={styles.heroCtaText}>Start practice</Text>
            <Icon name="arrow-right" size={15} color={colors.primaryDark} />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={todaysLesson ? "Open today's lesson" : "Write today's lesson"}
          onPress={onDailyLesson}
          style={({ pressed }) => [styles.lessonCard, pressed && styles.lessonCardPressed]}
        >
          <View style={styles.lessonIconWrap}>
            <Icon name="sunrise" size={19} color={colors.accent} />
          </View>
          <View style={styles.textBlockFlex}>
            <Text style={styles.lessonEyebrow}>Daily Lesson</Text>
            <Text style={styles.lessonTitle} numberOfLines={2}>
              {todaysLesson ? todaysLesson.title : "Write today's lesson"}
            </Text>
            <Text style={styles.lessonMeta}>
              {todaysLesson
                ? `${todaysLesson.level} · ${todaysLesson.wordCount} words · ${todaysLesson.hasPractice ? "ready" : "exercises still loading"}`
                : "Tell it what's on your mind and it writes one for you"}
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.muted} />
        </Pressable>

        <View style={styles.streakCard}>
          <RingProgress size={50} strokeWidth={5} progress={streakProgress} color={colors.primary} trackColor={colors.primaryTint}>
            <Text style={styles.streakRingText}>🔥{streakSummary.currentStreakDays}</Text>
          </RingProgress>
          <View style={styles.streakTextBlock}>
            <Text style={styles.streakTitle}>{streakSummary.currentStreakDays}-day streak</Text>
            <Text style={styles.streakSubtitle}>{streakSummary.helperText}</Text>
          </View>
        </View>

        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipValue}>{records.length}</Text>
            <Text style={styles.chipLabel}>Records</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipValue}>{latestRecord ? formatScore100(latestOverallScore) : "–"}</Text>
            <Text style={styles.chipLabel}>Last score</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipValue}>{recordsThisWeek}</Text>
            <Text style={styles.chipLabel}>This week</Text>
          </View>
        </View>

        {latestRecord ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View last practice in history"
            onPress={onHistory}
            style={({ pressed }) => [styles.latestCard, pressed && styles.latestCardPressed]}
          >
            <View style={styles.latestIconWrap}>
              <Icon name="check-circle" size={17} color={colors.primaryDark} />
            </View>
            <View style={styles.textBlockFlex}>
              <Text style={styles.latestTitle}>Last practice ready</Text>
              <Text style={styles.latestMeta}>{formatReadableDate(latestRecord.createdAt)}</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
        ) : null}

        <Text style={styles.sectionTitle}>Explore</Text>
        <NavListCard>
          <NavListItem
            label="Records"
            sublabel="Every practice you've saved"
            iconName="folder"
            iconColor={colors.primaryDark}
            iconBackground={colors.primaryTint}
            onPress={onHistory}
          />
          <NavListItem
            label="Progress"
            sublabel="Scores and trends over time"
            iconName="trending-up"
            iconColor={colors.accent}
            iconBackground={colors.accentTint}
            onPress={onProgress}
          />
          <NavListItem
            label="Instant Chat"
            sublabel="Text or voice practice"
            iconName="message-circle"
            iconColor={colors.secondary}
            iconBackground={colors.secondaryTint}
            onPress={onChat}
          />
          <NavListItem
            label="Grammar Roadmap"
            sublabel="A1 to C2, structured path"
            iconName="book-open"
            iconColor={colors.warning}
            iconBackground={colors.warningTint}
            onPress={onLearning}
          />
          <NavListItem
            label="Practice Modes"
            sublabel="Picture and listening games"
            iconName="grid"
            iconColor={colors.success}
            iconBackground={colors.successTint}
            onPress={onPracticeModes}
            isLast
          />
        </NavListCard>

        <Text style={styles.signature}>
          {isLoveMode ? "made with love, for you, by Yağız" : "made with care by Yağız"}
        </Text>
      </ScrollView>
    </View>
  );
}

interface TodaysLessonSummary {
  title: string;
  level: string;
  wordCount: number;
  hasPractice: boolean;
}

/**
 * Read on every visit to the home screen rather than passed down from App: the learner can
 * generate a lesson and come straight back, and a copy held higher up would still be showing
 * yesterday's state.
 */
function useTodaysLesson(): TodaysLessonSummary | null {
  const [summary, setSummary] = useState<TodaysLessonSummary | null>(null);

  useEffect(() => {
    let isActive = true;

    async function load(): Promise<void> {
      try {
        const state = await loadDailyLessonState();
        const lesson = state.lesson;
        if (!isActive) {
          return;
        }

        setSummary(
          lesson && isLessonForDate(lesson, toDateKey())
            ? {
                title: lesson.core.title,
                level: lesson.core.level,
                wordCount: lesson.core.reading.wordCount,
                hasPractice: Boolean(lesson.practice)
              }
            : null
        );
      } catch {
        // A missing or unreadable lesson simply means the card invites you to write one.
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  return summary;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

function countRecordsSince(records: SpeakingRecord[], windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  return records.filter((record) => Date.parse(record.createdAt) >= cutoff).length;
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: spacing.md
    },
    content: {
      gap: spacing.sm,
      paddingBottom: spacing.lg,
      paddingTop: spacing.sm
    },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacing.xs
    },
    greetingBlock: {
      flexShrink: 1
    },
    greeting: {
      ...typography.caption,
      color: colors.muted
    },
    h1: {
      ...typography.h1,
      color: colors.ink,
      marginTop: 2
    },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000000",
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2
    },
    settingsButtonPressed: {
      opacity: 0.85
    },
    loveBanner: {
      minHeight: 48,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    loveBannerIcon: {
      fontSize: 18
    },
    loveBannerText: {
      flex: 1,
      color: colors.primaryDark,
      ...typography.bodyStrong
    },
    hero: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      backgroundColor: colors.primaryDark,
      overflow: "hidden",
      marginTop: spacing.xs,
      shadowColor: colors.primaryDark,
      shadowOpacity: 0.35,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 4
    },
    heroPressed: {
      opacity: 0.94,
      transform: [{ scale: 0.995 }]
    },
    heroGlow: {
      position: "absolute",
      right: -50,
      top: -50,
      width: 170,
      height: 170,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.08)"
    },
    heroEyebrow: {
      ...typography.label,
      color: "rgba(255,255,255,0.78)"
    },
    heroTitle: {
      ...typography.h1,
      color: colors.onAccent,
      maxWidth: 230,
      marginTop: spacing.xs,
      marginBottom: spacing.md
    },
    heroCta: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: "#FFFFFF",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 999
    },
    heroCtaText: {
      ...typography.bodyStrong,
      color: colors.primaryDark
    },
    lessonCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.accentTint,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing.md,
      marginTop: spacing.xs
    },
    lessonCardPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.995 }]
    },
    lessonIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center"
    },
    lessonEyebrow: {
      ...typography.label,
      color: colors.accent
    },
    lessonTitle: {
      ...typography.bodyStrong,
      color: colors.ink,
      fontSize: 16,
      marginTop: 2
    },
    lessonMeta: {
      ...typography.caption,
      color: colors.muted,
      marginTop: 2
    },
    streakCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      shadowColor: "#000000",
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 1
    },
    streakRingText: {
      fontSize: 13,
      fontWeight: "800"
    },
    streakTextBlock: {
      flex: 1
    },
    streakTitle: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    streakSubtitle: {
      ...typography.caption,
      color: colors.muted,
      marginTop: 2
    },
    chipRow: {
      flexDirection: "row",
      gap: spacing.sm
    },
    chip: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm + 2,
      alignItems: "center",
      shadowColor: "#000000",
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 1
    },
    chipValue: {
      fontSize: 19,
      fontWeight: "800",
      color: colors.ink
    },
    chipLabel: {
      ...typography.caption,
      color: colors.muted,
      marginTop: 2
    },
    latestCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      shadowColor: "#000000",
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 1
    },
    latestCardPressed: {
      opacity: 0.85
    },
    latestIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center"
    },
    textBlockFlex: {
      flex: 1
    },
    latestTitle: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    latestMeta: {
      ...typography.caption,
      color: colors.muted,
      marginTop: 1
    },
    sectionTitle: {
      ...typography.label,
      color: colors.muted,
      marginTop: spacing.sm,
      marginBottom: 2,
      marginLeft: 2
    },
    signature: {
      ...typography.caption,
      color: colors.muted,
      textAlign: "center",
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
