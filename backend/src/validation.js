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

function validateUploadMetadata(originalName, mimeType) {
  const extension = path.extname(String(originalName || "")).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new HttpError(400, "invalid_file_type", "File extension is not allowed.");
  }

  if (!allowedMimeTypes.has(String(mimeType || ""))) {
    throw new HttpError(400, "invalid_file_type", "File MIME type is not allowed.");
  }

  return extension;
}

function validateOptionalDurationSeconds(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const duration = validateDurationSeconds(value);
  return Math.max(duration, fallback);
}

function validateChatMessages(value) {
  if (!Array.isArray(value)) {
    throw new HttpError(400, "invalid_input", "messages must be an array.");
  }

  if (value.length === 0 || value.length > 40) {
    throw new HttpError(400, "invalid_input", "messages length is not allowed.");
  }

  return value.map((item) => {
    const role = item && (item.role === "user" || item.role === "assistant") ? item.role : null;
    if (!role) {
      throw new HttpError(400, "invalid_input", "messages[].role must be 'user' or 'assistant'.");
    }

    return {
      role,
      text: validateTextField(item?.text, "messages[].text", config.maxChatMessageLength)
    };
  });
}

const LESSON_LEVELS = ["A2", "B1", "B2", "C1"];

/**
 * The app lets a learner sit at A1 or C2, but lesson calibration is only defined for A2-C1,
 * so the two outer levels are folded into the nearest defined band instead of silently
 * producing an uncalibrated lesson.
 */
function toLessonLevel(level) {
  const normalized = String(level || "B1").trim().toUpperCase();
  if (normalized === "A1") {
    return "A2";
  }
  if (normalized === "C2") {
    return "C1";
  }
  return LESSON_LEVELS.includes(normalized) ? normalized : "B1";
}

const LESSON_STAGES = ["angles", "core", "practice"];

function validateLessonStage(value) {
  const normalized = String(value || "core").trim().toLowerCase();
  if (!LESSON_STAGES.includes(normalized)) {
    throw new HttpError(400, "invalid_input", `stage must be one of: ${LESSON_STAGES.join(", ")}.`);
  }
  return normalized;
}

/**
 * The angle the learner picked from the suggestions. Optional: an empty context, or a learner
 * who asked the app to choose, produces a lesson with no angle attached.
 */
function validateChosenAngle(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const title = validateOptionalTextField(value.title, "chosenAngle.title", 200);
  if (!title) {
    return null;
  }

  return {
    title,
    description: validateOptionalTextField(value.description, "chosenAngle.description", 400)
  };
}

function validateStringList(value, fieldName, { maxItems, maxLength }) {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new HttpError(400, "invalid_input", `${fieldName} must be an array.`);
  }

  if (value.length > maxItems) {
    throw new HttpError(400, "invalid_input", `${fieldName} has too many items.`);
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .map((item) => {
      if (item.length > maxLength) {
        throw new HttpError(400, "invalid_input", `${fieldName} contains an item that is too long.`);
      }
      return item;
    });
}

function validateLearnerProfile(value) {
  const profile = value && typeof value === "object" ? value : {};

  return {
    level: validateLevel(profile.level),
    nativeLanguage: validateOptionalTextField(profile.nativeLanguage, "profile.nativeLanguage", 60) || "Turkish",
    interests: validateStringList(profile.interests, "profile.interests", { maxItems: 12, maxLength: 80 }),
    goal: validateOptionalTextField(profile.goal, "profile.goal", 200),
    weakPoints: validateStringList(profile.weakPoints, "profile.weakPoints", { maxItems: 8, maxLength: 120 }),
    context: validateStringList(profile.context, "profile.context", { maxItems: 12, maxLength: 160 })
  };
}

function validateRecentTopics(value) {
  return validateStringList(value, "recentTopics", { maxItems: 20, maxLength: 120 });
}

/**
 * Stage 2 is generated from the finished stage-1 lesson, which the app sends back. Only the
 * fields the practice prompt actually reads are kept, and each one is length-capped, so a
 * client cannot turn this endpoint into an arbitrary-length prompt.
 */
function validateLessonCoreInput(value) {
  const core = value && typeof value === "object" ? value : null;
  if (!core) {
    throw new HttpError(400, "invalid_input", "core is required for the practice stage.");
  }

  const readingText = String(core.reading?.text || "").trim();
  if (!readingText || readingText.length > config.maxLessonReadingLength) {
    throw new HttpError(400, "invalid_input", "core.reading.text is invalid.");
  }

  const vocabulary = Array.isArray(core.vocabulary) ? core.vocabulary.slice(0, 24) : [];
  const collocations = Array.isArray(core.collocations) ? core.collocations.slice(0, 12) : [];

  return {
    topicSlug: validateOptionalTextField(core.topicSlug, "core.topicSlug", 120),
    title: validateOptionalTextField(core.title, "core.title", 200),
    subtitle: validateOptionalTextField(core.subtitle, "core.subtitle", 300),
    level: toLessonLevel(core.level),
    reading: { text: readingText },
    vocabulary: vocabulary.map((item) => ({
      word: validateOptionalTextField(item?.word, "core.vocabulary[].word", 80),
      pos: validateOptionalTextField(item?.pos, "core.vocabulary[].pos", 40),
      definition: validateOptionalTextField(item?.definition, "core.vocabulary[].definition", 300)
    })),
    collocations: collocations.map((item) => ({
      phrase: validateOptionalTextField(item?.phrase, "core.collocations[].phrase", 120),
      register: validateOptionalTextField(item?.register, "core.collocations[].register", 20)
    }))
  };
}

function validateSessionSummary(value) {
  return validateTextField(value, "sessionSummary", config.maxSessionSummaryLength);
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

  const extension = validateUploadMetadata(file.originalname, file.mimetype);

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
  validateOptionalDurationSeconds,
  validateUploadMetadata,
  validateUploadedFile,
  validateChatMessages,
  toLessonLevel,
  validateLessonStage,
  validateChosenAngle,
  validateLearnerProfile,
  validateRecentTopics,
  validateLessonCoreInput,
  validateSessionSummary
};
