/**
 * Desktop / web implementation of recording storage.
 *
 * expo-av on the web hands back a `blob:` URL, which only lives as long as the
 * page does. In the Electron build the bytes are handed to the shell, which
 * writes them into the app's data folder and returns an `app://media/...` URL —
 * a stable address the <audio>/<video> element can play and `fetch` can read,
 * so history entries still work after the app is restarted.
 *
 * In a plain browser there is nowhere to write, so the blob URL is passed
 * through unchanged: the recording works for the current session (record ->
 * analyse -> save) but playing it back after a reload will not. That is the
 * reason the desktop build is the supported target rather than `npm run web`.
 */
import { RecordingType } from "@/types/models";
import { getDesktopBridge } from "@/services/platform/desktopBridge";

export function getMimeType(type: RecordingType): string {
  // Chromium's MediaRecorder writes WebM containers, not the m4a/mp4 the phone
  // produces. The upload layer re-encodes audio to WAV before sending, so this
  // value only has to describe what is stored locally.
  return type === "video" ? "video/webm" : "audio/webm";
}

export function getFileExtension(type: RecordingType): string {
  return "webm";
}

export async function persistRecording(uri: string, type: RecordingType): Promise<string> {
  const bridge = getDesktopBridge();
  if (!bridge) {
    return uri;
  }

  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    // The kind is part of the name because both audio and video are WebM: the
    // desktop shell serves these files back over app://media and has only the
    // file name to decide whether to label them audio/webm or video/webm, and
    // a <video> element handed audio/webm will refuse to play.
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${type}.${getFileExtension(type)}`;
    const saved = await bridge.saveMediaFile({ data: new Uint8Array(arrayBuffer), fileName });
    return saved.mediaUrl;
  } catch {
    // If saving to disk fails the in-memory blob URL still works for this
    // session, so the practice the user just recorded is not lost.
    return uri;
  }
}

export async function deleteMedia(uri: string): Promise<void> {
  if (!uri) {
    return;
  }

  if (uri.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(uri);
    } catch {
      // Best-effort cleanup only.
    }
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge) {
    return;
  }

  try {
    await bridge.deleteFile({ target: uri });
  } catch {
    // Best-effort cleanup only.
  }
}
