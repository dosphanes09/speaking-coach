import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { CONTENT_MAX_WIDTH, MAX_GRID_COLUMNS } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { RhetoricMetrics } from "@/types/rhetoric";

interface MetricGridProps {
  metrics: RhetoricMetrics;
  durationSeconds: number;
  /** False when the model only read a transcript and could not hear anything. */
  measuredFromAudio: boolean;
}

interface Tile {
  label: string;
  value: string;
  hint: string;
  tone: "good" | "watch" | "neutral";
  /** Audible-only measurements are unreliable without the recording. */
  audioOnly: boolean;
  /** True for the figures ffmpeg reads off the waveform rather than judging. */
  waveform?: boolean;
}

/**
 * The measured numbers, as opposed to the judged ones.
 *
 * These are what progress is tracked on, so each tile also says what a healthy
 * value looks like — a number with no reference point is just decoration.
 */
export function MetricGrid({
  metrics,
  durationSeconds,
  measuredFromAudio
}: MetricGridProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const minutes = Math.max(durationSeconds, 1) / 60;
  const isMeasured = metrics.metricsSource === "measured";

  const fillerSoundRate = metrics.fillerSoundCount / minutes;
  const fillerWordRate = metrics.fillerWordCount / minutes;

  const tiles: Tile[] = [
    {
      label: "Dolgu sesi",
      value: `${metrics.fillerSoundCount}`,
      hint: `dakikada ${fillerSoundRate.toFixed(1)} · hedef 1'in altı`,
      tone: fillerSoundRate <= 1 ? "good" : "watch",
      audioOnly: true
    },
    {
      label: "Dolgu kelimesi",
      value: `${metrics.fillerWordCount}`,
      hint: `dakikada ${fillerWordRate.toFixed(1)} · hedef 2'nin altı`,
      tone: fillerWordRate <= 2 ? "good" : "watch",
      audioOnly: false
    },
    {
      label: "Konuşma hızı",
      value: `${Math.round(metrics.wordsPerMinute)}`,
      hint: "kelime/dk · rahat aralık 130–160",
      tone: metrics.wordsPerMinute >= 125 && metrics.wordsPerMinute <= 170 ? "good" : "watch",
      audioOnly: false,
      waveform: true
    },
    {
      label: "Duraklama",
      value: `${metrics.pauseCount}`,
      hint: `en uzunu ${metrics.longestPauseSeconds.toFixed(1)} sn`,
      tone: metrics.longestPauseSeconds <= 2.5 ? "good" : "watch",
      audioOnly: true,
      waveform: true
    },
    {
      label: "Sessizlik oranı",
      value: `%${Math.round(metrics.silenceRatio * 100)}`,
      hint: "nefes ve vurgu için %10–20 sağlıklı",
      tone: metrics.silenceRatio <= 0.25 ? "good" : "watch",
      audioOnly: true,
      waveform: true
    },
    {
      label: "Kelime çeşitliliği",
      value: `%${Math.round(metrics.uniqueWordRatio * 100)}`,
      hint: "benzersiz kelime / toplam",
      tone: metrics.uniqueWordRatio >= 0.4 ? "good" : "neutral",
      audioOnly: false
    }
  ];

  return (
    <View style={styles.container}>
      {!measuredFromAudio ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Bu analiz ses kaydından değil, yalnızca yazı dökümünden yapıldı. Dolgu sesi, duraklama ve
            sessizlik değerleri bu durumda güvenilir değil.
          </Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {tiles.map((tile) => (
          <View
            key={tile.label}
            style={[
              styles.tile,
              tile.tone === "good" && styles.tileGood,
              tile.tone === "watch" && styles.tileWatch,
              !measuredFromAudio && tile.audioOnly && styles.tileUnreliable
            ]}
          >
            <View style={styles.tileHeader}>
              <Text style={styles.tileLabel}>{tile.label}</Text>
              {/* A tiny mark, but the distinction behind it is the whole point:
                  these three are read off the waveform and do not drift, the
                  rest are the model's judgement and can. */}
              {tile.waveform && isMeasured ? <Text style={styles.measuredMark}>ölçüldü</Text> : null}
            </View>
            <Text style={styles.tileValue}>{tile.value}</Text>
            <Text style={styles.tileHint}>{tile.hint}</Text>
          </View>
        ))}
      </View>

      {isMeasured ? (
        <Text style={styles.legend}>
          "ölçüldü" işaretli değerler ses dalgasından hesaplandı — aynı kayıt her zaman aynı sayıyı
          verir. İşaretsizler modelin duyduğu kadarıyla; dolgu sesleri sessizlikten ayırt edilemediği
          için hep öyle kalacak.
        </Text>
      ) : null}

      {metrics.topFillers.length > 0 ? (
        <View style={styles.fillerRow}>
          <Text style={styles.fillerLabel}>En sık dolgular</Text>
          <View style={styles.fillerChips}>
            {metrics.topFillers.slice(0, 6).map((filler) => (
              <View key={filler.text} style={styles.fillerChip}>
                <Text style={styles.fillerChipText}>
                  {filler.text} · {filler.count}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm
    },
    warning: {
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.warningTint,
      borderWidth: 1,
      borderColor: colors.warning
    },
    warningText: {
      ...typography.body,
      color: colors.ink
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    tile: {
      flexGrow: 1,
      flexBasis: 150,
      // Without a ceiling `flexBasis: 150` kept adding columns as the window
      // grew — seven of them in a desktop window, which stops being a grid and
      // becomes a row of disconnected numbers with no shape to scan. Three
      // columns keeps the tiles readable and the block recognisable.
      maxWidth: (CONTENT_MAX_WIDTH - spacing.screen * 2 - spacing.sm * (MAX_GRID_COLUMNS - 1)) / MAX_GRID_COLUMNS,
      padding: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted,
      gap: 2
    },
    tileGood: {
      backgroundColor: colors.successTint,
      borderColor: colors.success
    },
    tileWatch: {
      backgroundColor: colors.warningTint,
      borderColor: colors.warning
    },
    tileUnreliable: {
      opacity: 0.5
    },
    tileHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.xs
    },
    measuredMark: {
      ...typography.caption,
      fontSize: 10,
      color: colors.success
    },
    tileLabel: {
      ...typography.label,
      color: colors.muted
    },
    tileValue: {
      ...typography.h1,
      color: colors.ink
    },
    tileHint: {
      ...typography.caption,
      color: colors.muted
    },
    legend: {
      ...typography.caption,
      color: colors.muted
    },
    fillerRow: {
      gap: spacing.xs
    },
    fillerLabel: {
      ...typography.label,
      color: colors.muted
    },
    fillerChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    fillerChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.sm,
      backgroundColor: colors.dangerTint,
      borderWidth: 1,
      borderColor: colors.danger
    },
    fillerChipText: {
      ...typography.bodyStrong,
      color: colors.danger
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
