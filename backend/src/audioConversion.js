const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

function resolveFfmpegPath() {
  try {
    // ffmpeg-static resolves to a platform-appropriate prebuilt binary path.
    // Using require() lazily keeps this module loadable even if the dependency
    // is temporarily missing (falls back to a system "ffmpeg" on PATH).
    // eslint-disable-next-line global-require
    const ffmpegStaticPath = require("ffmpeg-static");
    if (ffmpegStaticPath) {
      return ffmpegStaticPath;
    }
  } catch {
    // ffmpeg-static not installed; fall through to system ffmpeg.
  }

  return "ffmpeg";
}

const FFMPEG_PATH = resolveFfmpegPath();

/**
 * Converts an arbitrary audio file (m4a, mp4, webm, mp3, wav, ...) into a
 * mono 16kHz WAV file, which is the audio input format OpenAI's audio-input
 * models document support for most reliably. Returns the path to the new
 * temporary WAV file; the caller is responsible for deleting it afterward.
 */
async function convertToWav(sourcePath) {
  const targetPath = path.join(
    path.dirname(sourcePath),
    `${path.basename(sourcePath, path.extname(sourcePath))}-${crypto.randomUUID()}.wav`
  );

  await execFileAsync(FFMPEG_PATH, [
    "-y",
    "-i",
    sourcePath,
    "-ac",
    "1",
    "-ar",
    "16000",
    "-f",
    "wav",
    targetPath
  ]);

  return targetPath;
}

async function readAsBase64(filePath) {
  const buffer = await fs.readFile(filePath);
  return buffer.toString("base64");
}

async function deleteQuietly(filePath) {
  if (!filePath) {
    return;
  }

  await fs.unlink(filePath).catch(() => undefined);
}

module.exports = { convertToWav, readAsBase64, deleteQuietly };
