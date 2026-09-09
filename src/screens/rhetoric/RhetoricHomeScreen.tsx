import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { QuotaNotice } from "@/components/QuotaNotice";
import { Card } from "@/components/Card";
import { Icon, IconName } from "@/components/Icon";
import { SectionTitle } from "@/components/SectionTitle";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { RhetoricRecord } from "@/types/rhetoric";
import { buildRhetoricSummary } from "@/services/rhetoric/rhetoricStats";

interface RhetoricHomeScreenProps {
  records: RhetoricRecord[];
  onStartPrepared: () => void;
  onStartImpromptu: () => void;
  onDrills: () => void;
  /** Reps done today, so the entry point can say whether one is still owed. */
  drillRepsToday: number;
  onHistory: () => void;
  onProgress: () => void;
  onSwitchModule: () => void;
}

export function RhetoricHomeScreen({
  records,
  onStartPrepared,
  onStartImpromptu,
  onDrills,
  drillRepsToday,
  onHistory,
  onProgress,
  onSwitchModule
}: RhetoricHomeScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const summary = buildRhetoricSummary(records);
  const lastRecord = records[0];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greetingForNow()}</Text>
          <Text style={styles.title}>Bugün ne anlatacaksın?</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Modül değiştir"
          onPress={onSwitchModule}
          hitSlop={6}
          style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}
        >
          <Icon name="repeat" size={16} color={colors.primaryDark} />
          <Text style={styles.switchText}>Modül</Text>
        </Pressable>
      </View>

      <QuotaNotice feature="rhetoric" exhaustedHint="Yarın tekrar dene." />

      <Card style={styles.heroCard}>
        <Text style={styles.heroLabel}>HAZIRLIKLI KONUŞMA</Text>
        <Text style={styles.heroTitle}>Konu al, 15 dakika hazırlan, anlat</Text>
        <Text style={styles.heroBody}>
          Araştırma süresi boyunca yapay zekâ kullanmıyorsun. Notların analize dahil edilir.
        </Text>
        <AppButton label="Konu ver" onPress={onStartPrepared} icon="arrow-right" />
      </Card>

      <Card style={styles.secondaryCard}>
        <Text style={styles.secondaryLabel}>DOĞAÇLAMA</Text>
        <Text style={styles.secondaryTitle}>60 saniye düşün, konuş</Text>
        <Text style={styles.secondaryBody}>
          Hazırlıksız akıcı kalabilme becerisi. Dolgu sesleri burada artar — çalışılacak yer tam da orası.
        </Text>
        <AppButton label="Doğaçlama başlat" onPress={onStartImpromptu} variant="ghost" icon="zap" />
      </Card>

      {/* Third card rather than a menu item: this is the one meant to be opened
          several times a day, and a speaking session is the thing done weekly.
          Burying the frequent action behind the rare one gets it forgotten. */}
      <Card style={styles.secondaryCard}>
        <Text style={styles.secondaryLabel}>MİKRO EGZERSİZ</Text>
        <Text style={styles.secondaryTitle}>60 saniye · günde birkaç kez</Text>
        <Text style={styles.secondaryBody}>
          Dolgu yasağı, tempo tutturma, tekerleme. Diksiyon ve "ııı" motor becerilerdir; uzun seans
          değil sık tekrar kazandırır.
        </Text>
        <AppButton
          label={drillRepsToday > 0 ? `Bugün ${drillRepsToday} tekrar · devam et` : "Bir tekrar yap"}
          onPress={onDrills}
          variant="ghost"
          icon="mic"
        />
      </Card>

      {records.length > 0 ? (
        <>
          <SectionTitle>Durum</SectionTitle>
          <View style={styles.statRow}>
            <Stat label="Konuşma" value={String(summary.totalSessions)} colors={colors} />
            <Stat
              label="Toplam süre"
              value={formatTotalMinutes(summary.totalSpeakingSeconds)}
              colors={colors}
            />
            <Stat
              label="Son puan"
              value={summary.lastOverallScore === null ? "–" : String(summary.lastOverallScore)}
              colors={colors}
            />
            <Stat label="Seri" value={`${summary.currentStreakDays} gün`} colors={colors} />
          </View>

          {lastRecord ? (
            <Card style={styles.lastCard}>
              <Text style={styles.lastLabel}>SON KONUŞMAN</Text>
              <Text style={styles.lastTopic} numberOfLines={2}>
                {lastRecord.topic.title}
              </Text>
              <Text style={styles.lastFocus} numberOfLines={3}>
                {lastRecord.analysis.nextSessionFocus[0] ?? lastRecord.analysis.summary}
              </Text>
            </Card>
          ) : null}
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Henüz kayıt yok</Text>
          <Text style={styles.emptyBody}>
            İlk konuşmanı yaptığında dolgu sesi, konuşma hızı ve duraklama ölçümlerin burada birikmeye
            başlayacak. Gelişimi puanlardan değil, bu sayılardan takip edeceğiz.
          </Text>
        </Card>
      )}

      <SectionTitle>Keşfet</SectionTitle>
      <NavRow icon="folder" title="Kayıtlar" subtitle="Tüm konuşmaların" onPress={onHistory} colors={colors} />
      <NavRow
        icon="trending-up"
        title="İlerleme"
        subtitle="Ölçümlerin zaman içindeki değişimi"
        onPress={onProgress}
        colors={colors}
      />
    </ScrollView>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: AppColors }) {
  const styles = createStyles(colors);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function NavRow({
  icon,
  title,
  subtitle,
  onPress,
  colors
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  colors: AppColors;
}) {
  const styles = createStyles(colors);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
    >
      <View style={styles.navIcon}>
        <Icon name={icon} size={18} color={colors.primaryDark} />
      </View>
      <View style={styles.navText}>
        <Text style={styles.navTitle}>{title}</Text>
        <Text style={styles.navSubtitle}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.muted} />
    </Pressable>
  );
}

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 6) {
    return "İyi geceler";
  }
  if (hour < 12) {
    return "Günaydın";
  }
  if (hour < 18) {
    return "İyi günler";
  }
  return "İyi akşamlar";
}

function formatTotalMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} sa ${minutes % 60} dk` : `${minutes} dk`;
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.screen,
      paddingBottom: spacing.xl,
      gap: spacing.sm
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingTop: spacing.sm
    },
    headerText: {
      flex: 1,
      gap: 2
    },
    greeting: {
      ...typography.body,
      color: colors.muted
    },
    title: {
      ...typography.display,
      color: colors.ink
    },
    switchButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      // 44 is the floor both Apple and Google publish for a touch target;
      // 40 is the size at which a thumb starts missing.
      minHeight: 44,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface
    },
    switchText: {
      ...typography.bodyStrong,
      color: colors.primaryDark
    },
    pressed: {
      opacity: 0.85
    },
    heroCard: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primaryDark,
      gap: spacing.sm,
      marginTop: spacing.sm
    },
    heroLabel: {
      ...typography.label,
      color: "#FFFFFFCC"
    },
    heroTitle: {
      ...typography.h1,
      color: colors.onAccent
    },
    heroBody: {
      ...typography.body,
      color: "#FFFFFFDD"
    },
    secondaryCard: {
      gap: spacing.sm
    },
    secondaryLabel: {
      ...typography.label,
      color: colors.accent
    },
    secondaryTitle: {
      ...typography.h2,
      color: colors.ink
    },
    secondaryBody: {
      ...typography.body,
      color: colors.muted
    },
    statRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    stat: {
      flexGrow: 1,
      flexBasis: 100,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      gap: 2
    },
    statValue: {
      ...typography.h1,
      color: colors.ink
    },
    statLabel: {
      ...typography.caption,
      color: colors.muted
    },
    lastCard: {
      gap: spacing.xs
    },
    lastLabel: {
      ...typography.label,
      color: colors.muted
    },
    lastTopic: {
      ...typography.h2,
      color: colors.ink
    },
    lastFocus: {
      ...typography.body,
      color: colors.muted
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
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      minHeight: 60
    },
    navIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryTint
    },
    navText: {
      flex: 1,
      gap: 2
    },
    navTitle: {
      ...typography.h2,
      color: colors.ink
    },
    navSubtitle: {
      ...typography.caption,
      color: colors.muted
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
