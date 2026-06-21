const fs = require("node:fs/promises");
const path = require("node:path");
const { config } = require("./config");
const { HttpError } = require("./errors");

const allowedExtensions = new Set([".m4a", ".mp3", ".mp4", ".mpeg", ".mpga", ".wav", ".webm"]);
const allowedMimeTypes = new Set([
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "video/mp4"
]);

function validateTextField(value, fieldName, maxLength) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length > maxLength) {
    throw new HttpError(400, "invalid_input", `${fieldName} is invalid.`);
  }
  return normalized;
}

function validateOptionalTextField(value, fieldName, maxLength) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const normalized = String(value).trim();
  if (normalized.length > maxLength) {
    throw new HttpError(400, "invalid_input", `${fieldName} is invalid.`);
  }
  return normalized;
}

function validateLevel(value) {
  const normalized = String(value || "B1").trim().toUpperCase();
  if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(normalized)) {
    throw new HttpError(400, "invalid_input", "level is invalid.");
  }
  return normalized;
}

function validateDurationSeconds(value) {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0 || duration > config.maxAudioDurationSeconds) {
    throw new HttpError(400, "invalid_duration", "Recording duration is not allowed.");
  }
  return duration;
}

async function readDetectedMime(filePath) {
  const { fileTypeFromFile } = await import("file-type");
  const detected = await fileTypeFromFile(filePath);
  return detected?.mime || "";
}

async function readMediaDuration(filePath) {
  try {
    const { parseFile } = await import("music-metadata");
    const metadata = await parseFile(filePath, { duration: true });
    return metadata.format.duration || 0;
  } catch {
    return 0;
  }
}

async function validateUploadedFile(file) {
  if (!file) {
    throw new HttpError(400, "missing_file", "Audio file is required.");
  }

  const extension = path.extname(file.originalname || "").toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new HttpError(400, "invalid_file_type", "File extension is not allowed.");
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new HttpError(400, "invalid_file_type", "File MIME type is not allowed.");
  }

  const stats = await fs.stat(file.path);
  if (stats.size <= 0 || stats.size > config.maxFileSizeBytes) {
    throw new HttpError(400, "invalid_file_size", "File size is not allowed.");
  }

  const detectedMime = await readDetectedMime(file.path);
  if (detectedMime && !allowedMimeTypes.has(detectedMime)) {
    throw new HttpError(400, "invalid_file_type", "File content type is not allowed.");
  }

  const duration = await readMediaDuration(file.path);
  if (duration && duration > config.maxAudioDurationSeconds) {
    throw new HttpError(400, "invalid_duration", "Recording duration is not allowed.");
  }

  return {
    extension,
    mimeType: detectedMime || file.mimetype,
    duration
  };
}

module.exports = {
  validateTextField,
  validateOptionalTextField,
  validateLevel,
  validateDurationSeconds,
  validateUploadedFile
};
