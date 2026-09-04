import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import {
  pickRhetoricTopic,
  rhetoricCategoryDescriptions,
  rhetoricCategoryLabels,
  rhetoricLevelDescriptions,
  rhetoricLevelLabels
} from "@/data/rhetoricTopics";
import { RhetoricCategory, RhetoricLevel, RhetoricMode, RhetoricRecord, RhetoricTopic } from "@/types/rhetoric";
import { getRecentRhetoricTopicIds } from "@/services/storage/rhetoricRepository";

interface RhetoricTopicScreenProps {
  mode: RhetoricMode;
  records: RhetoricRecord[];
  retakeOf?: RhetoricRecord;
  onBack: () => void;
  onStart: (topic: RhetoricTopic, targetDurationSeconds: number) => void;
}

const DURATION_CHOICES = [
  { seconds: 180, label: "3 dakika" },
  { seconds: 240, label: "4 dakika" },
  { seconds: 300, label: "5 dakika" }
];

const IMPROMPTU_DURATION_CHOICES = [
  { seconds: 60, label: "1 dakika" },
  { seconds: 90, label: "1.5 dakika" },
  { seconds: 120, label: "2 dakika" }
];

/**
 * Where a session starts: pick the constraints, then get the topic.
 *
 * The topic is drawn AFTER the filters are set rather than shown as a list to
 * browse. Choosing your own prompt quietly removes the difficulty — the
 * exercise is speaking about what you are given, not about what you like.
 */
export function RhetoricTopicScreen({
  mode,
  records,
  retakeOf,
  onBack,
  onStart
}: RhetoricTopicScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const isImpromptu = mode === "impromptu";
  const durationChoices = isImpromptu ? IMPROMPTU_DURATION_CHOICES : DURATION_CHOICES;

  const recentTopicIds = useMemo(() => getRecentRhetoricTopicIds(records), [records]);

  const [level, setLevel] = useState<RhetoricLevel | undefined>(undefined);
  const [category, setCategory] = useState<RhetoricCategory | undefined>(undefined);
  const [targetSeconds, setTargetSeconds] = useState(isImpromptu ? 90 : 240);
  const [topic, setTopic] = useState<RhetoricTopic | null>(retakeOf ? retakeOf.topic : null);

  function drawTopic(): void {
    setTopic(pickRhetoricTopic({ level, category, recentTopicIds }));
  }

  return (
    <View style={styles.screen}>
      <Header
        title={retakeOf ? "Aynı konuyu tekrar anlat" : isImpromptu ? "Doğaçlama" : "Hazırlıklı konuşma"}
        subtitle={
          retakeOf
            ? "Geri bildirimi aldıktan sonraki ikinci deneme"
            : isImpromptu
              ? "60 saniye düşünme, sonra konuşma"
              : "15 dakika araştırma, sonra konuşma"
        }
        onBack={onBack}
        backLabel="Geri"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {retakeOf ? (
          <Card style={styles.retakeCard}>
            <Text style={styles.retakeLabel}>ÖNCEKİ DENEMEN</Text>
            <Text style={styles.retakeScore}>{retakeOf.analysis.scores.overall} puan</Text>
            <Text style={styles.retakeFocus}>
              {retakeOf.analysis.nextSessionFocus[0] ?? "Bu sefer neyi farklı yapacaksın?"}
            </Text>
          </Card>
        ) : (
          <>
            <Text style={styles.groupLabel}>ZORLUK</Text>
            <View style={styles.chipRow}>
              <Chip label="Farketmez" active={level === undefined} onPress={() => setLevel(undefined)} colors={colors} />
              {(Object.keys(rhetoricLevelLabels) as RhetoricLevel[]).map((item) => (
                <Chip
                  key={item}
                  label={rhetoricLevelLabels[item]}
                  active={level === item}
                  onPress={() => setLevel(item)}
                  colors={colors}
                />
              ))}
            </View>
            {level ? <Text style={styles.categoryHint}>{rhetoricLevelDescriptions[level]}</Text> : null}

            <Text style={styles.groupLabel}>ALAN</Text>
            <View style={styles.chipRow}>
              <Chip
                label="Farketmez"
                active={category === undefined}
                onPress={() => setCategory(undefined)}
                colors={colors}
              />
              {(Object.keys(rhetoricCategoryLabels) as RhetoricCategory[]).map((item) => (
                <Chip
                  key={item}
                  label={rhetoricCategoryLabels[item]}
                  active={category === item}
                  onPress={() => setCategory(item)}
                  colors={colors}
                />
              ))}
            </View>
            {category ? <Text style={styles.categoryHint}>{rhetoricCategoryDescriptions[category]}</Text> : null}
          </>
        )}

        <Text style={styles.groupLabel}>HEDEF SÜRE</Text>
        <View style={styles.chipRow}>
          {durationChoices.map((choice) => (
            <Chip
              key={choice.seconds}
              label={choice.label}
              active={targetSeconds === choice.seconds}
              onPress={() => setTargetSeconds(choice.seconds)}
              colors={colors}
            />
          ))}
        </View>

        {topic ? (
          <Card style={styles.topicCard}>
            <Text style={styles.topicLabel}>
              {rhetoricCategoryLabels[topic.category]} · {rhetoricLevelLabels[topic.level]}
            </Text>
            <Text style={styles.topicTitle}>{topic.title}</Text>
            <Text style={styles.topicNote}>
              {isImpromptu
                ? "Bildiğin kadarıyla anlat. Kavramın doğru tanımını konuşmadan sonra göreceksin."
                : "Bu kavramı araştır, anla, sonra anlat. Doğru tanımı ve olması beklenen noktaları konuşmadan sonra göreceksin."}
            </Text>
          </Card>
        ) : (
          <Card style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>
              Filtreleri seçtikten sonra konuyu çek. Gelen konu araştırılacak bir kavram olacak — bir
              görüş sorusu değil. Konu geldiği anda süre işlemeye başlamaz; hazır olduğunda başlatırsın.
            </Text>
          </Card>
        )}

        <View style={styles.actions}>
          {!retakeOf ? (
            <AppButton
              label={topic ? "Başka konu" : "Konu çek"}
              onPress={drawTopic}
              variant={topic ? "ghost" : "primary"}
              icon={topic ? "refresh-cw" : "shuffle"}
            />
          ) : null}
          {topic ? (
            <AppButton
              label={isImpromptu ? "60 saniyeyi başlat" : "15 dakikayı başlat"}
              onPress={() => onStart(topic, targetSeconds)}
              icon="arrow-right"
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  colors
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: AppColors;
}) {
  const styles = createStyles(colors);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
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
    groupLabel: {
      ...typography.label,
      color: colors.muted,
      marginTop: spacing.sm
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    chip: {
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface
    },
    chipActive: {
      backgroundColor: colors.primaryTint,
      borderColor: colors.primary
    },
    chipPressed: {
      opacity: 0.85
    },
    chipText: {
      ...typography.bodyStrong,
      color: colors.muted
    },
    chipTextActive: {
      color: colors.primaryDark
    },
    categoryHint: {
      ...typography.caption,
      color: colors.muted
    },
    topicCard: {
      marginTop: spacing.sm,
      gap: spacing.xs,
      backgroundColor: colors.primaryTint,
      borderColor: colors.primary
    },
    topicLabel: {
      ...typography.label,
      color: colors.primaryDark
    },
    topicTitle: {
      ...typography.h1,
      color: colors.ink
    },
    topicNote: {
      ...typography.caption,
      color: colors.muted
    },
    placeholderCard: {
      marginTop: spacing.sm,
      backgroundColor: colors.surfaceMuted
    },
    placeholderText: {
      ...typography.body,
      color: colors.muted
    },
    retakeCard: {
      gap: 2,
      backgroundColor: colors.accentTint,
      borderColor: colors.accent
    },
    retakeLabel: {
      ...typography.label,
      color: colors.accent
    },
    retakeScore: {
      ...typography.h1,
      color: colors.ink
    },
    retakeFocus: {
      ...typography.body,
      color: colors.muted
    },
    actions: {
      gap: spacing.sm,
      marginTop: spacing.md
    }
  });
}
