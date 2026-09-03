const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { config, validateRuntimeConfig } = require("./config");
const { registerDevice, requireAuth, revokeDevice } = require("./auth");
const { HttpError, isHttpError } = require("./errors");
const { logError, logInfo, logWarn } = require("./logger");
const { assertDailyLimit } = require("./dailyLimitStore");
const {
  validateDurationSeconds,
  validateLevel,
  validateOptionalDurationSeconds,
  validateOptionalTextField,
  validateRhetoricMode,
  validateTextField,
  validateUploadMetadata,
  validateUploadedFile,
  validateChatMessages,
  validateLessonStage,
  validateChosenAngle,
  validateLearnerProfile,
  validateRecentTopics,
  validateLessonCoreInput,
  validateSessionSummary
} = require("./validation");
const {
  analyzeTranscript,
  chatWithCoach,
  transcribeFile,
  analyzeRhetoric,
  generateLessonAngles,
  generateLessonCore,
  generateLessonPractice,
  updateLearnerProfile
} = require("./openaiClient");

const app = express();
const PORT = process.env.PORT || 3001;

async function ensureUploadDir() {
  await fs.mkdir(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, config.uploadDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, callback) => {
    try {
      validateUploadMetadata(file.originalname, file.mimetype);
      callback(null, true);
    } catch (error) {
      callback(error);
    }
  },
  limits: {
    fileSize: config.maxFileSizeBytes,
    fieldSize: 4096,
    files: 1,
    fields: 16,
    parts: 17
  }
});

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());

app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

if (config.requireHttps) {
  app.use((req, _res, next) => {
    const forwardedProto = req.get("X-Forwarded-Proto");
    if (req.secure || forwardedProto === "https") {
      next();
      return;
    }

    next(new HttpError(426, "https_required", "HTTPS is required."));
  });
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new HttpError(403, "origin_not_allowed", "Origin is not allowed."));
    }
  })
);

app.use(
  "/api",
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: "rate_limited",
        message: "Too many requests. Please try again later."
      }
    }
  })
);

const registrationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "registration_rate_limited",
      message: "Too many device registration attempts. Please try again later."
    }
  }
});

app.use("/api/auth", express.json({ limit: "4kb", strict: true }));
app.use("/api/chat", express.json({ limit: "48kb", strict: true }));
// The practice stage sends the finished reading text back so the model can see it, which is
// the largest legitimate body in the app.
app.use("/api/daily-lesson", express.json({ limit: "64kb", strict: true }));
app.use("/api/learner-profile", express.json({ limit: "32kb", strict: true }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: config.serviceName,
    openaiConfigured: Boolean(config.openAiApiKey),
    appAuthRequired: config.requireAppAuth
  });
});

app.post("/api/auth/register", registrationRateLimit, async (req, res, next) => {
  try {
    const result = await registerDevice(req.body?.inviteCode, req.body?.clientId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/revoke", requireAuth, async (req, res, next) => {
  try {
    await revokeDevice(req.auth?.subject);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

const analysisAuthentication = config.requireAppAuth
  ? requireAuth
  : (req, _res, next) => {
      req.auth = null;
      next();
    };

app.post("/api/analyze-speech", analysisAuthentication, upload.single("file"), async (req, res, next) => {
  const filePath = req.file?.path;

  try {
    const topic = validateTextField(req.body.topic, "topic", 200);
    const level = validateLevel(req.body.level);
    const durationSeconds = validateDurationSeconds(req.body.durationSeconds);
    const expectedDurationSeconds = validateOptionalDurationSeconds(req.body.expectedDurationSeconds, durationSeconds);
    const grammarCefrLevel = validateOptionalTextField(req.body.grammarCefrLevel, "grammarCefrLevel", 20);
    const grammarTopic = validateOptionalTextField(req.body.grammarTopic, "grammarTopic", 120);
    const expectedGrammarStructures = validateOptionalTextField(
      req.body.expectedGrammarStructures,
      "expectedGrammarStructures",
      800
    );
    const speakingPrompt = validateOptionalTextField(req.body.speakingPrompt, "speakingPrompt", 300);
    const mode = validateOptionalTextField(req.body.mode, "mode", 40);
    if (mode && mode !== "picture_description") {
      throw new HttpError(400, "invalid_input", "mode is invalid.");
    }

    const picturePromptId = validateOptionalTextField(req.body.picturePromptId, "picturePromptId", 120);
    const pictureDescriptionTarget = validateOptionalTextField(
      req.body.pictureDescriptionTarget,
      "pictureDescriptionTarget",
      1600
    );
    const pictureLearnerInstructions = validateOptionalTextField(
      req.body.pictureLearnerInstructions,
      "pictureLearnerInstructions",
      1000
    );
    const pictureDetailChecklist = validateOptionalTextField(
      req.body.pictureDetailChecklist,
      "pictureDetailChecklist",
      1000
    );
    const picturePossibleInferences = validateOptionalTextField(
      req.body.picturePossibleInferences,
      "picturePossibleInferences",
      1000
    );
    const pictureCommonMistakes = validateOptionalTextField(
      req.body.pictureCommonMistakes,
      "pictureCommonMistakes",
      1000
    );
    const expectedVocabularyCategories = validateOptionalTextField(
      req.body.expectedVocabularyCategories,
      "expectedVocabularyCategories",
      800
    );
    const fileInfo = await validateUploadedFile(req.file);
    const dailyLimit = await assertDailyLimit(req, config.maxDailyAnalysesPerUser);

    const transcript = await transcribeFile(req.file.path, fileInfo.mimeType, `speaking-practice${fileInfo.extension}`);
    if (!transcript) {
      throw new HttpError(422, "empty_transcript", "Transcript could not be created from this recording.");
    }

    const grammarFocus =
      grammarCefrLevel || grammarTopic || expectedGrammarStructures || speakingPrompt
        ? {
            cefrLevel: grammarCefrLevel,
            grammarTopic,
            expectedGrammarStructures,
            speakingPrompt
          }
        : null;

    const pictureDescription =
      mode === "picture_description"
        ? {
            mode,
            picturePromptId,
            pictureDescriptionTarget,
            pictureLearnerInstructions,
            pictureDetailChecklist,
            picturePossibleInferences,
            pictureCommonMistakes,
            expectedVocabularyCategories,
            expectedGrammarStructures,
            speakingPrompt
          }
        : null;

    const analysisContext = {
      grammarFocus,
      pictureDescription
    };

    const analysis = await analyzeTranscript(topic, transcript, level, durationSeconds, analysisContext, {
      expectedDurationSeconds,
      audioFilePath: req.file.path,
      audioMimeType: fileInfo.mimeType
    });

    res.setHeader("X-Daily-Remaining", String(dailyLimit.remaining));
    res.json({
      transcript,
      analysis
    });
  } catch (error) {
    next(error);
  } finally {
    if (filePath) {
      fs.unlink(filePath).catch(() => undefined);
    }
  }
});

/**
 * Turkish rhetoric practice.
 *
 * Deliberately a separate endpoint rather than a flag on /api/analyze-speech.
 * Almost nothing is shared: a different language for transcription, a different
 * duration ceiling, a different daily quota, a different rubric and a different
 * response schema. Folding all of that into the English route would have meant
 * branching on a mode flag in a dozen places and risking the working English
 * path every time this one changes.
 */
app.post("/api/analyze-rhetoric", analysisAuthentication, upload.single("file"), async (req, res, next) => {
  const filePath = req.file?.path;

  try {
    const topic = validateTextField(req.body.topic, "topic", 300);
    const mode = validateRhetoricMode(req.body.mode);
    const durationSeconds = validateDurationSeconds(req.body.durationSeconds, config.maxRhetoricDurationSeconds);
    const targetDurationSeconds = validateOptionalDurationSeconds(
      req.body.targetDurationSeconds,
      durationSeconds,
      config.maxRhetoricDurationSeconds
    );
    // The notes written during the preparation window. Optional: impromptu
    // practice has none, and a prepared session may simply not have used them.
    const preparationNotes = validateOptionalTextField(req.body.preparationNotes, "preparationNotes", 4000);

    const fileInfo = await validateUploadedFile(req.file, config.maxRhetoricDurationSeconds);
    const dailyLimit = await assertDailyLimit(req, config.maxDailyRhetoricAnalysesPerUser, "rhetoric");

    const transcript = await transcribeFile(
      req.file.path,
      fileInfo.mimeType,
      `hitabet-pratigi${fileInfo.extension}`,
      "tr"
    );

    // Unlike the English route an empty transcript is not fatal here: the audio
    // model listens to the recording itself and can still analyse delivery.
    // Only a completely unusable recording should fail, and the duration and
    // size checks above already caught that.
    const analysis = await analyzeRhetoric({
      topic,
      transcript,
      durationSeconds,
      targetDurationSeconds,
      preparationNotes,
      mode,
      audioFilePath: req.file.path,
      audioMimeType: fileInfo.mimeType
    });

    res.setHeader("X-Daily-Remaining", String(dailyLimit.remaining));
    res.json({
      transcript,
      analysis
    });
  } catch (error) {
    next(error);
  } finally {
    if (filePath) {
      fs.unlink(filePath).catch(() => undefined);
    }
  }
});

app.post("/api/chat", analysisAuthentication, async (req, res, next) => {
  try {
    const level = validateLevel(req.body.level);
    const messages = validateChatMessages(req.body.messages);
    const recentMessages = messages.slice(-config.maxChatHistoryMessages);
    const dailyLimit = await assertDailyLimit(req, config.maxDailyChatMessagesPerUser, "chat");

    const reply = await chatWithCoach(recentMessages, level);
    if (!reply) {
      throw new HttpError(422, "empty_chat_reply", "Coach reply could not be created.");
    }

    res.setHeader("X-Daily-Remaining", String(dailyLimit.remaining));
    res.json({ reply });
  } catch (error) {
    next(error);
  }
});

/**
 * Daily lesson generation, in three stages.
 *
 * "angles" offers four narrow directions inside whatever the learner mentioned, so a one-word
 * input like "Batman" does not turn into an encyclopedia entry; "core" picks up the chosen
 * angle and writes the reading text; "practice" turns that finished text into grammar,
 * exercises, speaking tasks and an answer key. The app shows the core as soon as it arrives and
 * loads the practice part behind it, so the learner is never staring at a blank screen for a
 * minute — and the last call can see the actual text, which is what keeps the answer key honest.
 */
app.post("/api/daily-lesson", analysisAuthentication, async (req, res, next) => {
  try {
    const stage = validateLessonStage(req.body.stage);
    const profile = validateLearnerProfile(req.body.profile);

    if (stage === "angles") {
      const todayContext = validateTextField(req.body.todayContext, "todayContext", config.maxLessonContextLength);
      const recentTopics = validateRecentTopics(req.body.recentTopics);
      // Cheap compared with a lesson, but still a model call, so it gets its own bounded counter.
      const dailyLimit = await assertDailyLimit(req, config.maxDailyLessonsPerUser * 4, "lesson-angles");

      const { angles } = await generateLessonAngles({ profile, todayContext, recentTopics });

      res.setHeader("X-Daily-Remaining", String(dailyLimit.remaining));
      res.json({ stage, angles });
      return;
    }

    if (stage === "core") {
      const recentTopics = validateRecentTopics(req.body.recentTopics);
      const todayContext = validateOptionalTextField(
        req.body.todayContext,
        "todayContext",
        config.maxLessonContextLength
      );
      const chosenAngle = validateChosenAngle(req.body.chosenAngle);
      const dailyLimit = await assertDailyLimit(req, config.maxDailyLessonsPerUser, "lesson");

      const { lesson, warnings } = await generateLessonCore({
        profile,
        recentTopics,
        todayContext,
        chosenAngle
      });

      res.setHeader("X-Daily-Remaining", String(dailyLimit.remaining));
      res.json({ stage, lesson, warnings });
      return;
    }

    const core = validateLessonCoreInput(req.body.core);
    // The practice stage belongs to a lesson that already spent a lesson credit, so it gets
    // its own, looser counter instead of a second full credit — while still being bounded.
    const dailyLimit = await assertDailyLimit(req, config.maxDailyLessonsPerUser * 3, "lesson-practice");

    const { practice, warnings } = await generateLessonPractice({ profile, core });

    res.setHeader("X-Daily-Remaining", String(dailyLimit.remaining));
    res.json({ stage, practice, warnings });
  } catch (error) {
    next(error);
  }
});

/**
 * Folds what happened in a session back into the learner profile that drives tomorrow's
 * lesson. Deliberately conservative: see the update rules in lessonPrompt.js.
 */
app.post("/api/learner-profile", analysisAuthentication, async (req, res, next) => {
  try {
    const profile = validateLearnerProfile(req.body.profile);
    const sessionSummary = validateSessionSummary(req.body.sessionSummary);
    const topicSlug = validateOptionalTextField(req.body.topicSlug, "topicSlug", 120);
    const dailyLimit = await assertDailyLimit(req, config.maxDailyProfileUpdatesPerUser, "profile");

    const updatedProfile = await updateLearnerProfile({ profile, sessionSummary, topicSlug });

    res.setHeader("X-Daily-Remaining", String(dailyLimit.remaining));
    res.json({ profile: updatedProfile });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, _next) => {
  const multerFileSizeCode = error?.code === "LIMIT_FILE_SIZE";
  const multerRequestLimitCode = ["LIMIT_FIELD_VALUE", "LIMIT_FIELD_COUNT", "LIMIT_PART_COUNT"].includes(
    error?.code
  );
  const invalidJson = error?.type === "entity.parse.failed" || error?.type === "entity.too.large";
  const normalizedError = multerFileSizeCode
    ? new HttpError(400, "invalid_file_size", "File size is not allowed.")
    : multerRequestLimitCode || invalidJson
      ? new HttpError(400, "invalid_request", "Request payload is not allowed.")
      : error;

  const status = isHttpError(normalizedError) ? normalizedError.status : 500;
  const code = isHttpError(normalizedError) ? normalizedError.code : "internal_error";
  const message = isHttpError(normalizedError)
    ? normalizedError.publicMessage
    : "Request could not be processed.";

  const meta = {
    requestId: req.requestId,
    status,
    code,
    method: req.method,
    path: req.path
  };

  if (status >= 500) {
    logError("request_failed", meta);
  } else if (status >= 400) {
    logWarn("request_rejected", meta);
  }

  res.status(status).json({
    error: {
      code,
      message,
      requestId: req.requestId
    }
  });
});

Promise.resolve()
  .then(() => validateRuntimeConfig())
  .then(() => ensureUploadDir())
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      logInfo("backend_started", { status: 200, code: "started", path: `:${PORT}` });
    });
  })
  .catch((error) => {
    logError("backend_start_failed", { status: 500, code: error?.code || "start_failed" });
    process.exit(1);
  });
