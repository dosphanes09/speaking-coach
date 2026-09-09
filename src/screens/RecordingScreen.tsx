import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "@/services/platform/cameraView";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { PracticeQuestionCard } from "@/components/PracticeQuestionCard";
import { SegmentedControl } from "@/components/SegmentedControl";
import { RecordedMedia, RecordingType, Topic } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { deleteMedia, getMimeType, persistRecording } from "@/services/media/mediaStorage";
import { clampRecordingSeconds, formatPracticeDuration } from "@/utils/practiceTiming";

type RecordingStatus = "idle" | "starting" | "recording" | "finished";

// Chromium records video as WebM, which the backend's upload allowlist rejects
// (it accepts video/mp4 only). Rather than let the desktop build offer a mode
// that always fails at the analysis step, the picker is audio-only there.
// Audio itself is unaffected: it is re-encoded to WAV before upload.
const supportsVideoRecording = Platform.OS !== "web";
const recordingModes: RecordingType[] = supportsVideoRecording ? ["audio", "video"] : ["audio"];

interface RecordingScreenProps {
  topic: Topic;
  thinkingNotes: string;
  initialRecordingType?: RecordingType;
  autoStart?: boolean;
  recordingLimitSeconds: number;
  onBack: () => void;
  onRecorded: (media: RecordedMedia) => void;
}

export function RecordingScreen({
  topic,
  thinkingNotes,
  initialRecordingType = "audio",
  autoStart = false,
  recordingLimitSeconds,
  onBack,
  onRecorded
}: RecordingScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const maxRecordingSeconds = clampRecordingSeconds(recordingLimitSeconds);
  const [mode, setMode] = useState<RecordingType>(
    supportsVideoRecording ? initialRecordingType : "audio"
  );
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedMedia, setRecordedMedia] = useState<RecordedMedia | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const audioRecordingRef = useRef<Audio.Recording | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const autoStartAttemptedRef = useRef(false);
  const isCameraReadyRef = useRef(false);
  const stopInProgressRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const finalizeRecording = useCallback(
    async (temporaryUri: string, recordingType: RecordingType) => {
      const durationSeconds = startedAtRef.current
        ? Math.max(1, Math.min(maxRecordingSeconds, Math.round((Date.now() - startedAtRef.current) / 1000)))
        : 1;
      const persistedUri = await persistRecording(temporaryUri, recordingType);
      setRecordedMedia({
        uri: persistedUri,
        type: recordingType,
        durationSeconds,
        expectedDurationSeconds: maxRecordingSeconds,
        mimeType: getMimeType(recordingType)
      });
      setElapsedSeconds(durationSeconds);
      setStatus("finished");
      setIsBusy(false);
      stopInProgressRef.current = false;
      startedAtRef.current = null;
    },
    [maxRecordingSeconds]
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
        const next = Math.min(maxRecordingSeconds, current + 1);
        if (next >= maxRecordingSeconds) {
          void stopRecording();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [maxRecordingSeconds, status, stopRecording]);

  useEffect(() => {
    if (!autoStart || autoStartAttemptedRef.current) {
      return undefined;
    }

    autoStartAttemptedRef.current = true;
    const timer = setTimeout(() => {
      void startRecording();
    }, 250);

    return () => clearTimeout(timer);
  }, [autoStart]);

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

  async function waitForCameraReady(): Promise<void> {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (cameraRef.current && isCameraReadyRef.current) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error("Camera is not ready yet.");
  }

  async function startVideoRecording(): Promise<void> {
    if (!cameraRef.current || !isCameraReadyRef.current) {
      throw new Error("Camera is not ready yet.");
    }

    const video = await cameraRef.current.recordAsync({ maxDuration: maxRecordingSeconds });
    if (video?.uri) {
      await finalizeRecording(video.uri, "video");
    }
  }

  async function startRecording(): Promise<void> {
    if (status !== "idle" || isBusy) {
      return;
    }

    setError("");
    setIsBusy(true);
    setElapsedSeconds(0);
    setRecordedMedia(null);
    setStatus("starting");

    try {
      if (mode === "audio") {
        await startAudioRecording();
        startedAtRef.current = Date.now();
        setStatus("recording");
        setIsBusy(false);
      } else {
        await ensureVideoPermissions();
        await waitForCameraReady();
        startedAtRef.current = Date.now();
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

  const remainingSeconds = maxRecordingSeconds - elapsedSeconds;
  const trimmedNotes = thinkingNotes.trim();
  const startingLabel = mode === "video" && status === "starting" && !isCameraReady
    ? "waiting for camera"
    : "starting automatically";

  return (
    <View style={styles.screen}>
      <Header title="Record" subtitle="Speak naturally until the timer ends." onBack={onBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PracticeQuestionCard topic={topic} phase="recording" />

        {trimmedNotes ? (
          <Card style={styles.notesCard}>
            <Text style={styles.notesTitle}>Prep notes</Text>
            <Text style={styles.notesBody}>{trimmedNotes}</Text>
          </Card>
        ) : null}

        <Card style={styles.controlCard}>
          <SegmentedControl<RecordingType>
            options={recordingModes}
            labels={{ audio: "Audio", video: "Video" }}
            value={mode}
            onChange={setMode}
            disabled={status !== "idle" || isBusy}
          />
          {mode === "video" && status !== "finished" ? (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="front"
              mode="video"
              onCameraReady={() => {
                isCameraReadyRef.current = true;
                setIsCameraReady(true);
              }}
            />
          ) : null}
          <View style={styles.timerBox}>
            <Text style={styles.timer}>{remainingSeconds}</Text>
            <Text style={styles.timerLabel}>{status === "starting" ? startingLabel : "seconds left"}</Text>
            <Text style={styles.durationHint}>
              Suggested time: {formatPracticeDuration(maxRecordingSeconds)}
            </Text>
            {autoStart && status === "idle" && !error ? (
              <Text style={styles.autoStartHint}>Recording will begin automatically.</Text>
            ) : null}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Card>
      </ScrollView>

      <View style={styles.actions}>
        {status === "idle" ? (
          <AppButton label="Record" onPress={startRecording} loading={isBusy} />
        ) : null}
        {status === "starting" ? (
          <AppButton label="Starting Recording" onPress={() => undefined} loading disabled />
        ) : null}
        {status === "recording" ? (
          <AppButton label="Stop" onPress={stopRecording} loading={isBusy} variant="danger" />
        ) : null}
        {status === "finished" && recordedMedia ? (
          <>
            <AppButton label="Save and Continue" onPress={() => onRecorded(recordedMedia)} icon="arrow-right" />
            <AppButton label="Retry" onPress={retry} variant="ghost" icon="refresh-cw" />
          </>
        ) : null}
      </View>
    </View>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
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
  notesCard: {
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted
  },
  notesTitle: {
    ...typography.label,
    color: colors.primaryDark
  },
  notesBody: {
    ...typography.bodyLarge,
    color: colors.ink,
    fontWeight: "700"
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
    ...typography.bodyStrong,
    color: colors.muted
  },
  durationHint: {
    ...typography.bodyStrong,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs
  },
  autoStartHint: {
    ...typography.bodyStrong,
    color: colors.primaryDark,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs
  },
  error: {
    ...typography.bodyStrong,
    color: colors.danger,
    lineHeight: 20
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line
  }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
