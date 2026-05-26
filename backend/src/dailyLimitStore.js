const crypto = require("node:crypto");
const { HttpError } = require("./errors");

const counters = new Map();

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function hashClientId(clientId) {
  return crypto.createHash("sha256").update(clientId).digest("hex");
}

function getClientKey(req) {
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

function assertDailyLimit(req, maxDailyAnalysesPerUser) {
  const dayKey = getDayKey();
  pruneOldDays(dayKey);

  const key = `${getClientKey(req)}:${dayKey}`;
  const current = counters.get(key) || 0;
  if (current >= maxDailyAnalysesPerUser) {
    throw new HttpError(429, "daily_limit_exceeded", "Daily analysis limit reached.");
  }

  counters.set(key, current + 1);
  return {
    remaining: Math.max(0, maxDailyAnalysesPerUser - current - 1)
  };
}

module.exports = {
  assertDailyLimit
};
