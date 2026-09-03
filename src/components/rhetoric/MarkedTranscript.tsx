import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { RhetoricSegment, RhetoricSegmentKind } from "@/types/rhetoric";

interface MarkedTranscriptProps {
  segments: RhetoricSegment[];
  /** Falls back to this when the model returned no segments. */
  plainTranscript: string;
  onSeek?: (seconds: number) => void;
}

const KIND_LABELS: Record<RhetoricSegmentKind, string> = {
  speech: "",
  filler_sound: "dolgu sesi",
  filler_word: "dolgu kelimesi",
  long_pause: "uzun duraklama",
  repetition: "tekrar",
  strong_moment: "güçlü an"
};

/**
 * The speech, with the analysis drawn on top of it.
 *
 * "Dolgu sözcük kullanımın fazla" is forgettable. Seeing your own sentence with
 * the fillers highlighted is not — and because each mark carries the second it
 * happened, tapping one plays that moment back. This is the same finding the
 * score already reported, moved from a claim to something you can check.
 */
export function MarkedTranscript({
  segments,
  plainTranscript,
  onSeek
}: MarkedTranscriptProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const kindStyles = useMemo(
    () => ({
      speech: { backgroundColor: "transparent", color: colors.ink },
      filler_sound: { backgroundColor: colors.dangerTint, color: colors.danger },
      filler_word: { backgroundColor: colors.warningTint, color: colors.warning },
      long_pause: { backgroundColor: colors.surfaceMuted, color: colors.muted },
      repetition: { backgroundColor: colors.accentTint, color: colors.accent },
      strong_moment: { backgroundColor: colors.successTint, color: colors.success }
    }),
    [colors]
  );

  if (segments.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.plain}>{plainTranscript || "Konuşma metni oluşturulamadı."}</Text>
      </View>
    );
  }

  const selected = selectedIndex === null ? null : segments[selectedIndex];

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        {(["filler_sound", "filler_word", "long_pause", "repetition", "strong_moment"] as const).map((kind) => (
          <View key={kind} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: kindStyles[kind].backgroundColor }]} />
            <Text style={styles.legendLabel}>{KIND_LABELS[kind]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.flow}>
        {segments.map((segment, index) => {
          const isPlain = segment.kind === "speech";
          const palette = kindStyles[segment.kind];
          const label = segment.kind === "long_pause" ? (segment.text || "…") : segment.text;

          if (isPlain) {
            return (
              <Text key={`${index}-${segment.startSeconds}`} style={styles.plainRun}>
                {`${label} `}
              </Text>
            );
          }

          return (
            <Pressable
              key={`${index}-${segment.startSeconds}`}
              accessibilityRole="button"
              accessibilityLabel={`${KIND_LABELS[segment.kind]}, ${formatTimestamp(segment.startSeconds)}`}
              onPress={() => {
                setSelectedIndex(selectedIndex === index ? null : index);
                onSeek?.(segment.startSeconds);
              }}
              style={({ pressed }) => [
                styles.mark,
                { backgroundColor: palette.backgroundColor },
                selectedIndex === index && { borderColor: palette.color },
                pressed && styles.markPressed
              ]}
            >
              <Text style={[styles.markText, { color: palette.color }]}>{label}</Text>
              <Text style={[styles.markTime, { color: palette.color }]}>{formatTimestamp(segment.startSeconds)}</Text>
            </Pressable>
          );
        })}
      </View>

      {selected && selected.note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteKind}>{KIND_LABELS[selected.kind]}</Text>
          <Text style={styles.noteText}>{selected.note}</Text>
        </View>
      ) : (
        <Text style={styles.hint}>İşaretli bir yere dokun: hem açıklamasını görür, hem o anı dinlersin.</Text>
      )}
    </View>
  );
}

function formatTimestamp(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm
    },
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4
    },
    legendSwatch: {
      width: 12,
      height: 12,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: colors.line
    },
    legendLabel: {
      ...typography.caption,
      color: colors.muted
    },
    flow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center"
    },
    plainRun: {
      ...typography.bodyLarge,
      color: colors.ink
    },
    plain: {
      ...typography.bodyLarge,
      color: colors.ink
    },
    mark: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: 4,
      marginVertical: 2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: "transparent"
    },
    markPressed: {
      opacity: 0.75
    },
    markText: {
      ...typography.bodyStrong
    },
    markTime: {
      ...typography.caption,
      fontSize: 10,
      opacity: 0.8
    },
    noteBox: {
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      gap: 2
    },
    noteKind: {
      ...typography.label,
      color: colors.primaryDark
    },
    noteText: {
      ...typography.body,
      color: colors.ink
    },
    hint: {
      ...typography.caption,
      color: colors.muted
    }
  });
}
