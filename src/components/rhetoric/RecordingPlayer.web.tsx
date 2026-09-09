import React, { useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { AppColors, radius } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { useThemeColors } from "@/theme/ThemeProvider";
import { RhetoricRecording } from "@/types/rhetoric";

export interface RecordingPlayerHandle {
  seekTo(seconds: number): void;
}

interface RecordingPlayerProps {
  recording: RhetoricRecording;
}

/**
 * Playback of a finished practice — desktop implementation.
 *
 * A real `<video>` / `<audio>` element rather than expo-av: the browser's own
 * controls are better than anything worth rebuilding, and `currentTime` gives
 * exact, instant seeking, which is what makes tapping a marked moment in the
 * transcript jump straight to hearing it.
 *
 * Note this is NOT mirrored, unlike the live preview. A mirror helps while you
 * are speaking; when reviewing, you want to see what an audience saw.
 */
export const RecordingPlayer = React.forwardRef<RecordingPlayerHandle, RecordingPlayerProps>(
  function RecordingPlayer({ recording }, ref) {
    const colors = useThemeColors();
    const styles = createStyles(colors);
    const mediaRef = useRef<HTMLMediaElement | null>(null);

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        const element = mediaRef.current;
        if (!element) {
          return;
        }
        // Nudged slightly earlier so the marked word is heard from its start
        // rather than clipped halfway through.
        element.currentTime = Math.max(0, seconds - 0.4);
        void element.play?.().catch(() => undefined);
      }
    }));

    if (recording.hasVideo) {
      return (
        <View style={styles.videoFrame}>
          {React.createElement("video", {
            ref: mediaRef,
            src: recording.uri,
            controls: true,
            preload: "metadata",
            style: { width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#000" }
          })}
        </View>
      );
    }

    return (
      <View style={styles.audioFrame}>
        {React.createElement("audio", {
          ref: mediaRef,
          src: recording.uri,
          controls: true,
          preload: "metadata",
          style: { width: "100%" }
        })}
      </View>
    );
  }
);

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    videoFrame: {
      width: "100%",
      aspectRatio: 16 / 9,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.ink,
      overflow: "hidden"
    },
    audioFrame: {
      width: "100%",
      paddingVertical: 4
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
