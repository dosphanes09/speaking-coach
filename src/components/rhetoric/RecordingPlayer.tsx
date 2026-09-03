import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Audio, ResizeMode, Video } from "expo-av";
import { AppColors, radius, spacing } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { RhetoricRecording } from "@/types/rhetoric";

export interface RecordingPlayerHandle {
  /** Jumps to a moment and plays from there. Drives the marked transcript. */
  seekTo(seconds: number): void;
}

interface RecordingPlayerProps {
  recording: RhetoricRecording;
}

/**
 * Playback of a finished practice — native implementation.
 *
 * The imperative `seekTo` exists so a tap on a marked spot in the transcript
 * ("ııı at 2:14") can move the playhead there. That is the whole point of
 * pairing the marked transcript with the recording: reading that you hesitated
 * is abstract, hearing yourself do it is not.
 */
export const RecordingPlayer = React.forwardRef<RecordingPlayerHandle, RecordingPlayerProps>(
  function RecordingPlayer({ recording }, ref) {
    const colors = useThemeColors();
    const styles = createStyles(colors);
    const videoRef = useRef<Video | null>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
      if (recording.hasVideo) {
        return undefined;
      }

      let cancelled = false;
      void (async () => {
        try {
          const { sound } = await Audio.Sound.createAsync({ uri: recording.uri });
          if (cancelled) {
            await sound.unloadAsync();
            return;
          }
          soundRef.current = sound;
        } catch {
          setError("Kayıt açılamadı.");
        }
      })();

      return () => {
        cancelled = true;
        void soundRef.current?.unloadAsync();
        soundRef.current = null;
      };
    }, [recording.hasVideo, recording.uri]);

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        const positionMillis = Math.max(0, Math.round(seconds * 1000));
        if (recording.hasVideo) {
          void videoRef.current?.setPositionAsync(positionMillis);
          void videoRef.current?.playAsync();
          return;
        }
        void soundRef.current?.setPositionAsync(positionMillis);
        void soundRef.current?.playAsync();
      }
    }));

    if (error) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>{error}</Text>
        </View>
      );
    }

    if (recording.hasVideo) {
      return (
        <Video
          ref={videoRef}
          source={{ uri: recording.uri }}
          style={styles.video}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
        />
      );
    }

    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          Ses kaydı hazır. İşaretli metinde bir ana dokunarak o noktadan dinleyebilirsin.
        </Text>
      </View>
    );
  }
);

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    video: {
      width: "100%",
      aspectRatio: 16 / 9,
      borderRadius: radius.lg,
      backgroundColor: colors.ink,
      overflow: "hidden"
    },
    fallback: {
      padding: spacing.md,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg
    },
    fallbackText: {
      ...typography.body,
      color: colors.muted
    }
  });
}
