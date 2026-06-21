const { Redis } = require("@upstash/redis");
const { config } = require("./config");
const { HttpError } = require("./errors");

let redisClient;

function setRedisClientForTests(client) {
  if (config.nodeEnv === "production") {
    throw new Error("Test Redis injection is disabled in production.");
  }
  redisClient = client;
}

function getRedisClient() {
  if (!config.upstashRedisRestUrl || !config.upstashRedisRestToken) {
    throw new HttpError(503, "authorization_unavailable", "Authorization service is unavailable.");
  }

  if (!redisClient) {
    redisClient = new Redis({
      url: config.upstashRedisRestUrl,
      token: config.upstashRedisRestToken
    });
  }

  return redisClient;
}

async function runRedis(operation) {
  try {
    return await operation(getRedisClient());
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(503, "authorization_unavailable", "Authorization service is unavailable.");
  }
}

module.exports = {
  getRedisClient,
  runRedis,
  setRedisClientForTests
};
