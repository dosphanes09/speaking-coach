import * as FileSystem from "expo-file-system/legacy";
import { RecordingType } from "@/types/models";

const RECORDINGS_DIR = `${FileSystem.documentDirectory ?? ""}recordings/`;

export function getMimeType(type: RecordingType): string {
  return type === "video" ? "video/mp4" : "audio/m4a";
}

export function getFileExtension(type: RecordingType): string {
  return type === "video" ? "mp4" : "m4a";
}

export async function persistRecording(uri: string, type: RecordingType): Promise<string> {
  if (!FileSystem.documentDirectory) {
    return uri;
  }

  const directoryInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }

  const extension = getFileExtension(type);
  const targetUri = `${RECORDINGS_DIR}${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;

  await FileSystem.copyAsync({ from: uri, to: targetUri });
  return targetUri;
}

export async function deleteMedia(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri);
    }
  } catch {
    // Best-effort cleanup only.
  }
}
