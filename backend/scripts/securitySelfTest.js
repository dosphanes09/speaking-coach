process.env.NODE_ENV = "test";
process.env.REQUIRE_APP_AUTH = "true";
process.env.AUTH_TOKEN_SECRET = "test-only-token-secret-that-is-longer-than-32-characters";
process.env.APP_INVITE_CODES = "test-invite-code-that-is-long-enough";
process.env.UPSTASH_REDIS_REST_URL = "https://test-only.example";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-only-token";

class FakeRedis {
  constructor() {
    this.values = new Map();
  }

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async set(key, value, options = {}) {
    if (options.nx && this.values.has(key)) {
      return null;
    }
    this.values.set(key, value);
    return "OK";
  }

  async del(key) {
    return this.values.delete(key) ? 1 : 0;
  }

  async incr(key) {
    const next = Number(this.values.get(key) || 0) + 1;
    this.values.set(key, next);
    return next;
  }

  async expire() {
    return 1;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function authenticate(requireAuth, token) {
  const req = {
    get(name) {
      return name === "Authorization" ? `Bearer ${token}` : "";
    }
  };

  await new Promise((resolve, reject) => {
    requireAuth(req, {}, (error) => (error ? reject(error) : resolve()));
  });
  return req;
}

async function expectCode(operation, expectedCode) {
  try {
    await operation();
  } catch (error) {
    assert(error?.code === expectedCode, `Expected ${expectedCode}, received ${error?.code || "unknown"}`);
    return;
  }
  throw new Error(`Expected ${expectedCode}, but operation succeeded.`);
}

async function run() {
  const { setRedisClientForTests } = require("../src/redisClient");
  const { registerDevice, requireAuth, revokeDevice } = require("../src/auth");
  const { assertDailyLimit } = require("../src/dailyLimitStore");
  const { validateUploadMetadata } = require("../src/validation");
  setRedisClientForTests(new FakeRedis());

  const registration = await registerDevice(
    "test-invite-code-that-is-long-enough",
    "client_security_self_test_001"
  );
  assert(registration.token.split(".").length === 3, "Signed access token was not issued.");

  const authenticatedRequest = await authenticate(requireAuth, registration.token);
  assert(/^[a-f0-9]{64}$/.test(authenticatedRequest.auth.subject), "Token subject was not verified.");

  await expectCode(
    () => registerDevice("test-invite-code-that-is-long-enough", "client_security_self_test_002"),
    "registration_denied"
  );

  await assertDailyLimit(authenticatedRequest, 2);
  await assertDailyLimit(authenticatedRequest, 2);
  await expectCode(() => assertDailyLimit(authenticatedRequest, 2), "daily_limit_exceeded");

  const tokenParts = registration.token.split(".");
  tokenParts[2] = `${tokenParts[2].startsWith("a") ? "b" : "a"}${tokenParts[2].slice(1)}`;
  const tamperedToken = tokenParts.join(".");
  await expectCode(() => authenticate(requireAuth, tamperedToken), "authentication_required");

  await revokeDevice(authenticatedRequest.auth.subject);
  await expectCode(() => authenticate(requireAuth, registration.token), "authentication_required");

  const extension = validateUploadMetadata("speaking-practice.m4a", "audio/m4a");
  assert(extension === ".m4a", "Allowed upload metadata was rejected.");
  await expectCode(() => validateUploadMetadata("shell.php", "audio/m4a"), "invalid_file_type");
  await expectCode(() => validateUploadMetadata("speaking-practice.m4a", "application/octet-stream"), "invalid_file_type");

  console.log("Security self-test passed: enrollment, JWT validation, one-device invites, persistent quota, tamper rejection, revocation, and upload metadata validation.");
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
