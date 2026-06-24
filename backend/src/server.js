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
  validateTextField,
  validateUploadedFile
} = require("./validation");
const { analyzeTranscript, transcribeFile } = require("./openaiClient");

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

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: config.serviceName,
    openaiConfigured: Boolean(config.openAiApiKey)
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

    const transcript = await transcribeFile(req.file.path, fileInfo.mimeType, req.file.originalname);
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
      expectedDurationSeconds
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
