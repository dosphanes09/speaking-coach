import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { radius } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";

interface CameraPreviewProps {
  stream: unknown | null;
  height?: number;
}

/**
 * Shows the live camera while recording.
 *
 * A MediaStream cannot be handed to any React Native component, so this drops
 * to a real DOM `<video>` element. That is legitimate here rather than a hack:
 * react-native-web renders through react-dom, so `React.createElement("video")`
 * produces an ordinary video element in the same tree.
 *
 * The preview is muted deliberately — an unmuted preview would play the
 * speaker's own voice back through the speakers and feed the microphone.
 */
export function CameraPreview({ stream, height = 260 }: CameraPreviewProps): React.JSX.Element | null {
  const colors = useThemeColors();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    element.srcObject = (stream as MediaStream) ?? null;
    if (stream) {
      void element.play().catch(() => undefined);
    }

    return () => {
      element.srcObject = null;
    };
  }, [stream]);

  if (!stream) {
    return null;
  }

  return (
    <View style={[styles.frame, { height, backgroundColor: colors.ink, borderColor: colors.line }]}>
      {React.createElement("video", {
        ref: videoRef,
        muted: true,
        playsInline: true,
        autoPlay: true,
        style: {
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // Mirrored so it reads like a mirror rather than a stranger's camera;
          // this affects the preview only, never the saved recording.
          transform: "scaleX(-1)"
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden"
  }
});
