const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { config } = require("./config");
const { HttpError, isHttpError } = require("./errors");
const { logError, logInfo, logWarn } = require("./logger");
const { assertDailyLimit } = require("./dailyLimitStore");
const {
  validateDurationSeconds,
  validateLevel,
  validateTextField,
  validateUploadedFile
} = require("./validation");
const { analyzeTranscript, transcribeFile } = require("./openaiClient");

const app = express();

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
    files: 1,
    fields: 4
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

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    speechAnalysisConfigured: Boolean(config.openAiApiKey)
  });
});

app.post("/api/analyze-speech", upload.single("file"), async (req, res, next) => {
  const filePath = req.file?.path;

  try {
    const topic = validateTextField(req.body.topic, "topic", 200);
    const level = validateLevel(req.body.level);
    validateDurationSeconds(req.body.durationSeconds);
    const fileInfo = await validateUploadedFile(req.file);
    const dailyLimit = assertDailyLimit(req, config.maxDailyAnalysesPerUser);

    const transcript = await transcribeFile(req.file.path, fileInfo.mimeType, req.file.originalname);
    if (!transcript) {
      throw new HttpError(422, "empty_transcript", "Transcript could not be created from this recording.");
    }

    const analysis = await analyzeTranscript(topic, transcript, level);

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
  const normalizedError = multerFileSizeCode
    ? new HttpError(400, "invalid_file_size", "File size is not allowed.")
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

ensureUploadDir()
  .then(() => {
    app.listen(config.port, () => {
      logInfo("backend_started", { status: 200, code: "started", path: `:${config.port}` });
    });
  })
  .catch((error) => {
    logError("backend_start_failed", { status: 500, code: error?.code || "start_failed" });
    process.exit(1);
  });
