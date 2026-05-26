const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function readNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  return raw.toLowerCase() === "true";
}

function readOrigins() {
  return (process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: readNumber("PORT", 3001),
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiTranscriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
  openAiAnalysisModel: process.env.OPENAI_ANALYSIS_MODEL || "gpt-5.4-mini",
  openAiTimeoutMs: readNumber("OPENAI_TIMEOUT_MS", 30000),
  openAiMaxRetries: Math.min(readNumber("OPENAI_MAX_RETRIES", 1), 2),
  allowedOrigins: readOrigins(),
  requireHttps: readBoolean("REQUIRE_HTTPS", false),
  maxFileSizeBytes: readNumber("MAX_FILE_SIZE_BYTES", 12 * 1024 * 1024),
  maxAudioDurationSeconds: readNumber("MAX_AUDIO_DURATION_SECONDS", 75),
  maxDailyAnalysesPerUser: readNumber("MAX_DAILY_ANALYSES_PER_USER", 10),
  rateLimitWindowMs: readNumber("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  rateLimitMaxRequests: readNumber("RATE_LIMIT_MAX_REQUESTS", 30),
  uploadDir: path.join(__dirname, "..", "tmp", "uploads")
};

module.exports = { config };
