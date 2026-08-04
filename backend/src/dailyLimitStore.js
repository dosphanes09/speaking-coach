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

function assertInMemoryDailyLimit(req, maxPerUser, kind) {
  const dayKey = getDayKey();
  pruneOldDays(dayKey);

  const key = `${kind}:${getDevelopmentClientKey(req)}:${dayKey}`;
  const current = counters.get(key) || 0;
  if (current >= maxPerUser) {
    throw new HttpError(429, "daily_limit_exceeded", `Daily ${kind} limit reached.`);
  }

  counters.set(key, current + 1);
  return {
    remaining: Math.max(0, maxPerUser - current - 1)
  };
}

async function assertPersistentDailyLimit(req, maxPerUser, kind) {
  const subject = req.auth?.subject;
  if (!subject) {
    throw new HttpError(401, "authentication_required", "Device activation is required.");
  }

  const dayKey = getDayKey();
  const key = `quota:${kind}:${subject}:${dayKey}`;
  const current = await runRedis(async (redis) => {
    const count = await redis.incr(key);
    await redis.expire(key, 2 * 24 * 60 * 60);
    return count;
  });

  if (current > maxPerUser) {
    throw new HttpError(429, "daily_limit_exceeded", `Daily ${kind} limit reached.`);
  }

  return {
    remaining: Math.max(0, maxPerUser - current)
  };
}

// `kind` namespaces the counter (e.g. "analysis" vs "chat") so unrelated
// features don't silently share and exhaust the same daily quota.
async function assertDailyLimit(req, maxPerUser, kind = "analysis") {
  if (config.requireAppAuth) {
    return assertPersistentDailyLimit(req, maxPerUser, kind);
  }
  return assertInMemoryDailyLimit(req, maxPerUser, kind);
}

module.exports = {
  assertDailyLimit
};
