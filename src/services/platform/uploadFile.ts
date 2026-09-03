/**
 * Turns a finished recording into the value that goes into the upload FormData.
 *
 * Native path: React Native's FormData understands a `{ uri, name, type }`
 * object and streams the file straight off disk, so nothing is loaded into
 * memory here.
 */
import { RecordedMedia } from "@/types/models";

export interface UploadFileResult {
  /** The value handed to `FormData.append`. */
  value: Blob;
  /** File name the backend sees; its extension is what the server validates. */
  fileName: string;
}

export async function createUploadFile(media: RecordedMedia, fileName: string): Promise<UploadFileResult> {
  return {
    value: {
      uri: media.uri,
      name: fileName,
      type: media.mimeType
    } as unknown as Blob,
    fileName
  };
}
