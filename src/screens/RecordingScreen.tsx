import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SegmentedControl } from "@/components/SegmentedControl";
import { RecordedMedia, RecordingType, Topic } from "@/types/models";
import { colors, radius, spacing } from "@/theme/colors";
import { deleteMedia, getMimeType, persistRecording } from "@/services/media/mediaStorage";

const MAX_RECORDING_SECONDS = 60;

type RecordingStatus = "idle" | "recording" | "finished";

interface RecordingScreenProps {
  topic: Topic;
  onBack: () => void;
  onRecorded: (media: RecordedMedia) => void;
}

export function RecordingScreen({
  topic,
  onBack,
  onRecorded
}: RecordingScreenProps): React.JSX.Element {
  const [mode, setMode] = useState<RecordingType>("audio");
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedMedia, setRecordedMedia] = useState<RecordedMedia | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const audioRecordingRef = useRef<Audio.Recording | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const stopInProgressRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const finalizeRecording = useCallback(
    async (temporaryUri: string, recordingType: RecordingType) => {
      const durationSeconds = startedAtRef.current
        ? Math.max(1, Math.min(MAX_RECORDING_SECONDS, Math.round((Date.now() - startedAtRef.current) / 1000)))
        : 1;
      const persistedUri = await persistRecording(temporaryUri, recordingType);
      setRecordedMedia({
        uri: persistedUri,
        type: recordingType,
        durationSeconds,
        mimeType: getMimeType(recordingType)
      });
      setElapsedSeconds(durationSeconds);
      setStatus("finished");
      setIsBusy(false);
      stopInProgressRef.current = false;
      startedAtRef.current = null;
    },
    []
  );

  const stopRecording = useCallback(async () => {
    if (status !== "recording" || stopInProgressRef.current) {
      return;
    }

    stopInProgressRef.current = true;
    setIsBusy(true);

    try {
      if (mode === "audio") {
        const recording = audioRecordingRef.current;
        audioRecordingRef.current = null;
        if (!recording) {
          throw new Error("No active audio recording found.");
        }
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = recording.getURI();
        if (!uri) {
          throw new Error("Audio recording could not be saved.");
        }
        await finalizeRecording(uri, "audio");
      } else {
        cameraRef.current?.stopRecording();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Recording could not be stopped.");
      setIsBusy(false);
      stopInProgressRef.current = false;
    }
  }, [finalizeRecording, mode, status]);

  useEffect(() => {
    if (status !== "recording") {
      return undefined;
    }

    const timer = setInterval(() => {
      setElapsedSeconds((current) => {
        const next = Math.min(MAX_RECORDING_SECONDS, current + 1);
        if (next >= MAX_RECORDING_SECONDS) {
          void stopRecording();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, stopRecording]);

  async function startAudioRecording(): Promise<void> {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Microphone permission is required for audio recording.");
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    audioRecordingRef.current = recording;
  }

  async function ensureVideoPermissions(): Promise<void> {
    let cameraGranted = cameraPermission?.granted ?? false;
    let micGranted = microphonePermission?.granted ?? false;

    if (!cameraGranted) {
      const response = await requestCameraPermission();
      cameraGranted = response.granted;
    }

    if (!micGranted) {
      const response = await requestMicrophonePermission();
      micGranted = response.granted;
    }

    if (!cameraGranted || !micGranted) {
      throw new Error("Camera and microphone permissions are required for video recording.");
    }
  }

  async function startVideoRecording(): Promise<void> {
    if (!cameraRef.current) {
      throw new Error("Camera is not ready yet.");
    }

    const video = await cameraRef.current.recordAsync({ maxDuration: MAX_RECORDING_SECONDS });
    if (video?.uri) {
      await finalizeRecording(video.uri, "video");
    }
  }

  async function startRecording(): Promise<void> {
    setError("");
    setIsBusy(true);
    setElapsedSeconds(0);
    setRecordedMedia(null);
    startedAtRef.current = Date.now();

    try {
      if (mode === "audio") {
        await startAudioRecording();
        setStatus("recording");
        setIsBusy(false);
      } else {
        await ensureVideoPermissions();
        setStatus("recording");
        setIsBusy(false);
        void startVideoRecording().catch((caughtError) => {
          setError(caughtError instanceof Error ? caughtError.message : "Video recording failed.");
          setStatus("idle");
          setIsBusy(false);
          stopInProgressRef.current = false;
          startedAtRef.current = null;
        });
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Recording could not be started.");
      setStatus("idle");
      setIsBusy(false);
      stopInProgressRef.current = false;
      startedAtRef.current = null;
    }
  }

  async function retry(): Promise<void> {
    if (recordedMedia) {
      await deleteMedia(recordedMedia.uri);
    }
    setRecordedMedia(null);
    setElapsedSeconds(0);
    setStatus("idle");
    setError("");
  }

  const remainingSeconds = MAX_RECORDING_SECONDS - elapsedSeconds;

  return (
    <View style={styles.screen}>
      <Header title="Record" subtitle={topic.title} onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.controlCard}>
          <SegmentedControl<RecordingType> options={["audio", "video"]} value={mode} onChange={setMode} />
          {mode === "video" && status !== "finished" ? (
            <CameraView ref={cameraRef} style={styles.camera} facing="front" mode="video" />
          ) : null}
          <View style={styles.timerBox}>
            <Text style={styles.timer}>{remainingSeconds}</Text>
            <Text style={styles.timerLabel}>seconds left</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Card>
      </ScrollView>

      <View style={styles.actions}>
        {status === "idle" ? (
          <AppButton label="Record" onPress={startRecording} loading={isBusy} />
        ) : null}
        {status === "recording" ? (
          <AppButton label="Stop" onPress={stopRecording} loading={isBusy} variant="danger" />
        ) : null}
        {status === "finished" && recordedMedia ? (
          <>
            <AppButton label="Save and Continue" onPress={() => onRecorded(recordedMedia)} />
            <AppButton label="Retry" onPress={retry} variant="ghost" />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.md
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.sm
  },
  controlCard: {
    gap: spacing.md
  },
  camera: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.ink
  },
  timerBox: {
    minHeight: 124,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md
  },
  timer: {
    color: colors.primaryDark,
    fontSize: 56,
    lineHeight: 64,
    fontWeight: "900"
  },
  timerLabel: {
    color: colors.muted,
    fontWeight: "700"
  },
  error: {
    color: colors.danger,
    fontWeight: "700",
    lineHeight: 20
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line
  }
});
