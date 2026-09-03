/**
 * Recording for the rhetoric module — native (phone) implementation.
 *
 * On a phone this is audio only. Driving the camera and the microphone into two
 * separate recorders at the same time is not something Expo makes reliable, and
 * the desktop build is this module's natural home anyway: a five minute speech
 * with a camera pointed at you is a desk exercise.
 *
 * The web sibling (`rhetoricRecorder.web.ts`) does record video.
 */
import { Audio } from "expo-av";
import { getMimeType, persistRecording } from "@/services/media/mediaStorage";
import { RhetoricRecording } from "@/types/rhetoric";

export interface RhetoricRecorderHandle {
  /** Stops and returns the finished recording. */
  stop(durationSeconds: number): Promise<RhetoricRecording>;
  /** Aborts without producing a recording. */
  cancel(): Promise<void>;
  /** The live camera stream, when there is one. Null on this platform. */
  previewStream: unknown | null;
}

export function isVideoRecordingSupported(): boolean {
  return false;
}

export async function startRhetoricRecording(): Promise<RhetoricRecorderHandle> {
  const permission = await Audio.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Kayıt için mikrofon izni gerekiyor.");
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();

  let finished = false;

  return {
    previewStream: null,

    async stop(durationSeconds: number): Promise<RhetoricRecording> {
      finished = true;
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      if (!uri) {
        throw new Error("Kayıt kaydedilemedi.");
      }

      const persistedUri = await persistRecording(uri, "audio");
      return {
        uri: persistedUri,
        audioUri: persistedUri,
        hasVideo: false,
        durationSeconds,
        mimeType: getMimeType("audio")
      };
    },

    async cancel(): Promise<void> {
      if (finished) {
        return;
      }
      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch {
        // Cancelling is best-effort; nothing downstream depends on it.
      }
    }
  };
}
