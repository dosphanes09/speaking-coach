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

/**
 * Like readNumber, but returns null when the variable is unset and allows 0. Used for
 * settings that must stay *absent* from the API request unless the operator opted in.
 */
function readOptionalNumber(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw.trim() === "") {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
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
  openAiChatModel: process.env.OPENAI_CHAT_MODEL || "gpt-5.4-mini",
  openAiAudioAnalysisModel: process.env.OPENAI_AUDIO_ANALYSIS_MODEL || "gpt-audio",
  enableAudioAnalysis: readBoolean("ENABLE_AUDIO_ANALYSIS", true),
  openAiLessonModel: process.env.OPENAI_LESSON_MODEL || "gpt-5.4-mini",
  // A full lesson part is a long structured answer; a truncated JSON response is the most
  // common failure mode when this is set too low.
  openAiLessonMaxOutputTokens: readNumber("OPENAI_LESSON_MAX_OUTPUT_TOKENS", 9000),
  // Lesson generation regularly runs 30-60s per part, well past the 30s analysis timeout.
  openAiLessonTimeoutMs: readNumber("OPENAI_LESSON_TIMEOUT_MS", 120000),
  // Left unset by default: only sent to the API when the operator explicitly configures it,
  // because not every model accepts a temperature parameter. 0.7-0.8 is the useful band —
  // lower makes every day's lesson read the same, higher breaks level calibration.
  openAiLessonTemperature: readOptionalNumber("OPENAI_LESSON_TEMPERATURE"),
  openAiTimeoutMs: readNumber("OPENAI_TIMEOUT_MS", 30000),
  openAiMaxRetries: Math.min(readNumber("OPENAI_MAX_RETRIES", 1), 2),
  openAiMaxOutputTokens: readNumber("OPENAI_MAX_OUTPUT_TOKENS", 8000),
  openAiRhetoricMaxOutputTokens: readNumber("OPENAI_RHETORIC_MAX_OUTPUT_TOKENS", 12000),
  openAiChatMaxOutputTokens: readNumber("OPENAI_CHAT_MAX_OUTPUT_TOKENS", 700),
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
  maxFileSizeBytes: readNumber("MAX_FILE_SIZE_BYTES", 16 * 1024 * 1024),
  maxAudioDurationSeconds: readNumber("MAX_AUDIO_DURATION_SECONDS", 120),
  // Turkish rhetoric practice is a 3-5 minute speech, not a one-minute drill,
  // so it gets its own ceiling instead of loosening the English one. 330s
  // leaves a little headroom above the 5 minute cap the app enforces.
  // Size check: mono 16kHz 16-bit WAV is 32 KB/s, so 330s is about 10.1 MB,
  // which still fits under maxFileSizeBytes.
  maxRhetoricDurationSeconds: readNumber("MAX_RHETORIC_DURATION_SECONDS", 330),
  maxDailyAnalysesPerUser: readNumber("MAX_DAILY_ANALYSES_PER_USER", 10),
  // Counted separately from English analyses: a rhetoric session sends several
  // times more audio, so one shared counter would let a few long speeches eat
  // the whole day's English practice.
  maxDailyRhetoricAnalysesPerUser: readNumber("MAX_DAILY_RHETORIC_ANALYSES_PER_USER", 6),
  maxDailyChatMessagesPerUser: readNumber("MAX_DAILY_CHAT_MESSAGES_PER_USER", 60),
  // One lesson a day is the product; the extra headroom covers a learner who regenerates
  // because the topic missed, plus the odd failed attempt.
  maxDailyLessonsPerUser: readNumber("MAX_DAILY_LESSONS_PER_USER", 3),
  maxDailyProfileUpdatesPerUser: readNumber("MAX_DAILY_PROFILE_UPDATES_PER_USER", 10),
  maxLessonContextLength: readNumber("MAX_LESSON_CONTEXT_LENGTH", 600),
  maxLessonReadingLength: readNumber("MAX_LESSON_READING_LENGTH", 9000),
  maxSessionSummaryLength: readNumber("MAX_SESSION_SUMMARY_LENGTH", 4000),
  maxChatMessageLength: readNumber("MAX_CHAT_MESSAGE_LENGTH", 1200),
  maxChatHistoryMessages: readNumber("MAX_CHAT_HISTORY_MESSAGES", 12),
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
