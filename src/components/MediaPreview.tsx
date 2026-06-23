import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Audio, ResizeMode, Video } from "expo-av";
import { AppButton } from "./AppButton";
import { RecordedMedia } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";

interface MediaPreviewProps {
  media: RecordedMedia;
}

export function MediaPreview({ media }: MediaPreviewProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  async function toggleAudio(): Promise<void> {
    if (media.type !== "audio") {
      return;
    }

    if (soundRef.current && isPlaying) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsPlaying(false);
      return;
    }

    const { sound } = await Audio.Sound.createAsync({ uri: media.uri });
    soundRef.current = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setIsPlaying(false);
        sound.unloadAsync();
        soundRef.current = null;
      }
    });
    await sound.playAsync();
    setIsPlaying(true);
  }

  if (media.type === "video") {
    return (
      <Video
        source={{ uri: media.uri }}
        useNativeControls
        resizeMode={ResizeMode.COVER}
        style={styles.video}
      />
    );
  }

  return (
    <View style={styles.audioBox}>
      <Text style={styles.audioText}>Audio practice saved</Text>
      <AppButton label={isPlaying ? "Stop" : "Play"} onPress={toggleAudio} variant="ghost" />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  video: {
    width: "100%",
    aspectRatio: 9 / 12,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    overflow: "hidden"
  },
  audioBox: {
    minHeight: 96,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md
  },
  audioText: {
    color: colors.ink,
    fontWeight: "800"
  }
  });
}
