const crypto = require("node:crypto");
const { HttpError } = require("./errors");
const { config } = require("./config");
const { runRedis } = require("./redisClient");

const counters = new Map();

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function hashClientId(clientId) {
  return crypto.createHash("sha256").update(clientId).digest("hex");
}

function getDevelopmentClientKey(req) {
  const clientId = String(req.get("X-Client-Id") || "").trim();
  const fallback = req.ip || "unknown";
  return hashClientId(clientId || fallback);
}

function pruneOldDays(dayKey) {
  for (const key of counters.keys()) {
    if (!key.endsWith(`:${dayKey}`)) {
      counters.delete(key);
    }
  }
}

function assertInMemoryDailyLimit(req, maxDailyAnalysesPerUser) {
  const dayKey = getDayKey();
  pruneOldDays(dayKey);

  const key = `${getDevelopmentClientKey(req)}:${dayKey}`;
  const current = counters.get(key) || 0;
  if (current >= maxDailyAnalysesPerUser) {
    throw new HttpError(429, "daily_limit_exceeded", "Daily analysis limit reached.");
  }

  counters.set(key, current + 1);
  return {
    remaining: Math.max(0, maxDailyAnalysesPerUser - current - 1)
  };
}

async function assertPersistentDailyLimit(req, maxDailyAnalysesPerUser) {
  const subject = req.auth?.subject;
  if (!subject) {
    throw new HttpError(401, "authentication_required", "Device activation is required.");
  }

  const dayKey = getDayKey();
  const key = `quota:analysis:${subject}:${dayKey}`;
  const current = await runRedis(async (redis) => {
    const count = await redis.incr(key);
    await redis.expire(key, 2 * 24 * 60 * 60);
    return count;
  });

  if (current > maxDailyAnalysesPerUser) {
    throw new HttpError(429, "daily_limit_exceeded", "Daily analysis limit reached.");
  }

  return {
    remaining: Math.max(0, maxDailyAnalysesPerUser - current)
  };
}

async function assertDailyLimit(req, maxDailyAnalysesPerUser) {
  if (config.requireAppAuth) {
    return assertPersistentDailyLimit(req, maxDailyAnalysesPerUser);
  }
  return assertInMemoryDailyLimit(req, maxDailyAnalysesPerUser);
}

module.exports = {
  assertDailyLimit
};
