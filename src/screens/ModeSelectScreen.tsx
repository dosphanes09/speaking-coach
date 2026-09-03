import React from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { AppMode } from "@/services/storage/appModeRepository";

interface ModeSelectScreenProps {
  lastMode: AppMode | null;
  askEveryTime: boolean;
  englishSessionCount: number;
  rhetoricSessionCount: number;
  onSelect: (mode: AppMode) => void;
  onToggleAskEveryTime: (askEveryTime: boolean) => void;
}

/**
 * The launch picker.
 *
 * The two modules share a codebase and nothing else: different language,
 * different rubric, different history, different progress charts. Choosing at
 * the door keeps that separation visible instead of burying one module inside
 * the other's menus — and the choice itself is a small useful moment of "what
 * am I practising today".
 */
export function ModeSelectScreen({
  lastMode,
  askEveryTime,
  englishSessionCount,
  rhetoricSessionCount,
  onSelect,
  onToggleAskEveryTime
}: ModeSelectScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.appName}>Daily Speaking Coach</Text>
        <Text style={styles.prompt}>Bugün ne çalışacaksın?</Text>
      </View>

      <ModeCard
        title="English Speaking"
        subtitle="Practise speaking English and get scored feedback"
        detail={
          englishSessionCount > 0 ? `${englishSessionCount} recordings so far` : "Start your first recording"
        }
        icon="message-circle"
        isLast={lastMode === "english"}
        lastLabel="last used"
        accent={colors.primary}
        onPress={() => onSelect("english")}
        colors={colors}
      />

      <ModeCard
        title="Türkçe Hitabet"
        subtitle="Konu al, hazırlan, anlat — hitabet ve sunum çalış"
        detail={rhetoricSessionCount > 0 ? `${rhetoricSessionCount} konuşma yaptın` : "İlk konuşmanı yap"}
        icon="mic"
        isLast={lastMode === "rhetoric"}
        lastLabel="son kullanılan"
        accent={colors.accent}
        onPress={() => onSelect("rhetoric")}
        colors={colors}
      />

      <View style={styles.askRow}>
        <View style={styles.askText}>
          <Text style={styles.askTitle}>Her açılışta sor</Text>
          <Text style={styles.askSubtitle}>
            Kapatırsan uygulama doğrudan son kullandığın modülle açılır. Modülü istediğin an
            değiştirebilirsin.
          </Text>
        </View>
        <Switch
          value={askEveryTime}
          onValueChange={onToggleAskEveryTime}
          trackColor={{ true: colors.primary, false: colors.line }}
          accessibilityLabel="Her açılışta modül sor"
        />
      </View>
    </ScrollView>
  );
}

function ModeCard({
  title,
  subtitle,
  detail,
  icon,
  isLast,
  lastLabel,
  accent,
  onPress,
  colors
}: {
  title: string;
  subtitle: string;
  detail: string;
  icon: "message-circle" | "mic";
  isLast: boolean;
  lastLabel: string;
  accent: string;
  onPress: () => void;
  colors: AppColors;
}) {
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { borderColor: accent }, pressed && styles.cardPressed]}
    >
      <View style={[styles.cardIcon, { backgroundColor: accent }]}>
        <Icon name={icon} size={22} color="#FFFFFF" />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          {isLast ? (
            <View style={[styles.lastBadge, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={styles.lastBadgeText}>{lastLabel}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
        <Text style={styles.cardDetail}>{detail}</Text>
      </View>

      <Icon name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.md,
      maxWidth: 720,
      width: "100%",
      alignSelf: "center"
    },
    header: {
      alignItems: "center",
      gap: spacing.xs,
      marginBottom: spacing.sm
    },
    appName: {
      ...typography.label,
      color: colors.muted
    },
    prompt: {
      ...typography.display,
      color: colors.ink,
      textAlign: "center"
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 2,
      backgroundColor: colors.surface,
      minHeight: 104,
      shadowColor: "#000000",
      shadowOpacity: 0.07,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2
    },
    cardPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }]
    },
    cardIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center"
    },
    cardBody: {
      flex: 1,
      gap: 3
    },
    cardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      flexWrap: "wrap"
    },
    cardTitle: {
      ...typography.h1,
      color: colors.ink
    },
    lastBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.sm
    },
    lastBadgeText: {
      ...typography.caption,
      fontSize: 10,
      color: colors.muted
    },
    cardSubtitle: {
      ...typography.body,
      color: colors.muted
    },
    cardDetail: {
      ...typography.caption,
      color: colors.primaryDark
    },
    askRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      marginTop: spacing.sm
    },
    askText: {
      flex: 1,
      gap: 2
    },
    askTitle: {
      ...typography.bodyStrong,
      color: colors.ink
    },
    askSubtitle: {
      ...typography.caption,
      color: colors.muted
    }
  });
}
