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

function readList(name) {
  return (process.env[name] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || "development";

const config = {
  nodeEnv,
  serviceName: process.env.SERVICE_NAME || "daily-speaking-coach-api",
  port: readNumber("PORT", 3001),
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiTranscriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
  openAiAnalysisModel: process.env.OPENAI_ANALYSIS_MODEL || "gpt-5.4-mini",
  openAiTimeoutMs: readNumber("OPENAI_TIMEOUT_MS", 30000),
  openAiMaxRetries: Math.min(readNumber("OPENAI_MAX_RETRIES", 1), 2),
  openAiMaxOutputTokens: readNumber("OPENAI_MAX_OUTPUT_TOKENS", 8000),
  allowedOrigins: readOrigins(),
  requireHttps: readBoolean("REQUIRE_HTTPS", false),
  requireAppAuth: readBoolean("REQUIRE_APP_AUTH", nodeEnv === "production"),
  authTokenSecret: process.env.AUTH_TOKEN_SECRET || "",
  authTokenTtlSeconds: readNumber("AUTH_TOKEN_TTL_SECONDS", 365 * 24 * 60 * 60),
  authIssuer: process.env.AUTH_ISSUER || "daily-speaking-coach-api",
  authAudience: process.env.AUTH_AUDIENCE || "daily-speaking-coach-mobile",
  appInviteCodes: readList("APP_INVITE_CODES"),
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL || "",
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  maxFileSizeBytes: readNumber("MAX_FILE_SIZE_BYTES", 12 * 1024 * 1024),
  maxAudioDurationSeconds: readNumber("MAX_AUDIO_DURATION_SECONDS", 120),
  maxDailyAnalysesPerUser: readNumber("MAX_DAILY_ANALYSES_PER_USER", 10),
  rateLimitWindowMs: readNumber("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  rateLimitMaxRequests: readNumber("RATE_LIMIT_MAX_REQUESTS", 30),
  uploadDir: path.join(__dirname, "..", "tmp", "uploads")
};

function validateRuntimeConfig() {
  const missing = [];

  if (config.nodeEnv === "production" && !config.openAiApiKey) {
    missing.push("OPENAI_API_KEY");
  }

  if (config.requireAppAuth) {
    if (config.authTokenSecret.length < 32) {
      missing.push("AUTH_TOKEN_SECRET (at least 32 characters)");
    }
    if (config.appInviteCodes.length === 0 || config.appInviteCodes.some((code) => code.length < 20)) {
      missing.push("APP_INVITE_CODES (each code must be at least 20 characters)");
    }
    if (!config.upstashRedisRestUrl.startsWith("https://")) {
      missing.push("UPSTASH_REDIS_REST_URL (HTTPS)");
    }
    if (!config.upstashRedisRestToken) {
      missing.push("UPSTASH_REDIS_REST_TOKEN");
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing or invalid production configuration: ${missing.join(", ")}`);
  }
}

module.exports = { config, validateRuntimeConfig };
