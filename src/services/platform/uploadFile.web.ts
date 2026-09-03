/**
 * Desktop / web implementation of "prepare the recording for upload".
 *
 * Two problems have to be solved here that do not exist on the phone:
 *
 * 1. A browser's FormData cannot take a `{ uri, name, type }` object. It needs a
 *    real Blob/File, so the recording is read back out of its URL first.
 *
 * 2. Chromium records audio as WebM/Opus, and the backend validates the upload
 *    twice: once against the declared MIME type, and once against the type it
 *    sniffs from the file's own bytes. WebM containers are ambiguous to sniff —
 *    the same bytes can read as `audio/webm` or `video/webm` depending on the
 *    detector — and `video/webm` is not on the server's allowlist. Rather than
 *    gambling on that, the audio is decoded and re-encoded here as a 16 kHz mono
 *    WAV. WAV has an unambiguous magic-number header, is explicitly allowed by
 *    the backend, and is exactly the shape the server's ffmpeg step converts to
 *    anyway — so this removes a conversion rather than adding one.
 *
 * Size check: 16 kHz x 1 channel x 16 bit = 32 KB per second. The backend caps
 * recordings at 120 seconds and uploads at 12 MB, so the worst case is ~3.8 MB.
 */
import { RecordedMedia } from "@/types/models";

export interface UploadFileResult {
  value: Blob;
  fileName: string;
}

const TARGET_SAMPLE_RATE = 16000;

export async function createUploadFile(media: RecordedMedia, fileName: string): Promise<UploadFileResult> {
  const sourceBlob = await readBlob(media.uri);

  if (media.type === "video") {
    // Video practice is not offered on desktop (see RecordingScreen), but if a
    // record recorded on a phone is ever re-uploaded, pass the bytes through
    // untouched rather than trying to transcode video in the page.
    const mimeType = normalizeMimeType(sourceBlob.type) || media.mimeType;
    return {
      value: sourceBlob,
      fileName: replaceExtension(fileName, extensionForMimeType(mimeType, "mp4"))
    };
  }

  const wavBlob = await encodeAsMonoWav(sourceBlob);
  const wavFileName = replaceExtension(fileName, "wav");

  return {
    value: new File([wavBlob], wavFileName, { type: "audio/wav" }),
    fileName: wavFileName
  };
}

async function readBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("The recording could not be read back for upload.");
  }
  return response.blob();
}

/**
 * Decodes any browser-supported audio container and writes a 16 kHz mono
 * 16-bit PCM WAV file. Multi-channel input is averaged down to one channel and
 * resampled with linear interpolation, which is plenty for speech recognition.
 */
async function encodeAsMonoWav(sourceBlob: Blob): Promise<Blob> {
  const arrayBuffer = await sourceBlob.arrayBuffer();
  const AudioContextConstructor =
    (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error("This browser cannot process audio recordings.");
  }

  const audioContext = new AudioContextConstructor();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const monoSamples = downmixToMono(decoded);
    const resampled = resample(monoSamples, decoded.sampleRate, TARGET_SAMPLE_RATE);
    return buildWavBlob(resampled, TARGET_SAMPLE_RATE);
  } finally {
    void audioContext.close().catch(() => undefined);
  }
}

function downmixToMono(buffer: AudioBuffer): Float32Array {
  const channelCount = buffer.numberOfChannels;
  if (channelCount === 1) {
    return buffer.getChannelData(0);
  }

  const mixed = new Float32Array(buffer.length);
  for (let channel = 0; channel < channelCount; channel += 1) {
    const channelData = buffer.getChannelData(channel);
    for (let index = 0; index < channelData.length; index += 1) {
      mixed[index] = (mixed[index] ?? 0) + (channelData[index] ?? 0) / channelCount;
    }
  }
  return mixed;
}

function resample(samples: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (sourceRate === targetRate) {
    return samples;
  }

  const ratio = sourceRate / targetRate;
  const targetLength = Math.max(1, Math.floor(samples.length / ratio));
  const result = new Float32Array(targetLength);

  for (let index = 0; index < targetLength; index += 1) {
    const sourcePosition = index * ratio;
    const lowerIndex = Math.floor(sourcePosition);
    const upperIndex = Math.min(lowerIndex + 1, samples.length - 1);
    const weight = sourcePosition - lowerIndex;
    const lower = samples[lowerIndex] ?? 0;
    const upper = samples[upperIndex] ?? 0;
    result[index] = lower + (upper - lower) * weight;
  }

  return result;
}

/** Writes the 44-byte RIFF/WAVE header followed by signed 16-bit samples. */
function buildWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM header size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 8 * bytesPerSample, true); // bits per sample
  writeAscii(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += bytesPerSample;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

/** `audio/webm;codecs=opus` -> `audio/webm`. Servers match the bare type only. */
function normalizeMimeType(mimeType: string): string {
  return (mimeType || "").split(";")[0]?.trim().toLowerCase() ?? "";
}

function extensionForMimeType(mimeType: string, fallback: string): string {
  const knownExtensions: Record<string, string> = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/mpeg": "mp3",
    "video/mp4": "mp4"
  };
  return knownExtensions[normalizeMimeType(mimeType)] ?? fallback;
}

function replaceExtension(fileName: string, extension: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  return `${base}.${extension}`;
}
