const crypto = require("node:crypto");
const { config } = require("./config");
const { HttpError } = require("./errors");
const { runRedis } = require("./redisClient");

let joseModulePromise;

function getJose() {
  if (!joseModulePromise) {
    joseModulePromise = import("jose");
  }
  return joseModulePromise;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeClientId(value) {
  const normalized = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(normalized)) {
    throw new HttpError(400, "invalid_registration", "Device registration request is invalid.");
  }
  return normalized;
}

function findInviteHash(value) {
  const inviteCode = String(value || "").trim();
  if (inviteCode.length < 20 || inviteCode.length > 128) {
    return "";
  }

  const submittedHash = crypto.createHash("sha256").update(inviteCode).digest();
  for (const configuredCode of config.appInviteCodes) {
    const configuredHash = crypto.createHash("sha256").update(configuredCode).digest();
    if (crypto.timingSafeEqual(submittedHash, configuredHash)) {
      return configuredHash.toString("hex");
    }
  }
  return "";
}

function tokenSecret() {
  return new TextEncoder().encode(config.authTokenSecret);
}

async function issueAccessToken(subject) {
  const { SignJWT } = await getJose();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = nowSeconds + config.authTokenTtlSeconds;
  const token = await new SignJWT({ scope: "speech:analyze" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(subject)
    .setIssuer(config.authIssuer)
    .setAudience(config.authAudience)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(expiresAtSeconds)
    .sign(tokenSecret());

  return {
    token,
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString()
  };
}

async function registerDevice(inviteCode, clientId) {
  if (!config.requireAppAuth) {
    throw new HttpError(404, "not_found", "Endpoint is not available.");
  }

  const normalizedClientId = normalizeClientId(clientId);
  const inviteHash = findInviteHash(inviteCode);
  if (!inviteHash) {
    throw new HttpError(403, "registration_denied", "Device registration was denied.");
  }

  const subject = sha256(normalizedClientId);
  const inviteKey = `auth:invite:${inviteHash}`;
  const subjectKey = `auth:subject:${subject}`;

  await runRedis(async (redis) => {
    const existingSubject = await redis.get(inviteKey);
    if (existingSubject && existingSubject !== subject) {
      throw new HttpError(403, "registration_denied", "Device registration was denied.");
    }

    if (!existingSubject) {
      const assigned = await redis.set(inviteKey, subject, { nx: true });
      if (!assigned) {
        const racedSubject = await redis.get(inviteKey);
        if (racedSubject !== subject) {
          throw new HttpError(403, "registration_denied", "Device registration was denied.");
        }
      }
    }

    await redis.set(subjectKey, "active");
  });

  return issueAccessToken(subject);
}

function readBearerToken(req) {
  const authorization = String(req.get("Authorization") || "");
  const match = authorization.match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  return match?.[1] || "";
}

async function verifyAccessToken(token) {
  if (!token) {
    throw new HttpError(401, "authentication_required", "Device activation is required.");
  }

  try {
    const { jwtVerify } = await getJose();
    const { payload } = await jwtVerify(token, tokenSecret(), {
      algorithms: ["HS256"],
      issuer: config.authIssuer,
      audience: config.authAudience
    });
    const subject = String(payload.sub || "");
    if (!/^[a-f0-9]{64}$/.test(subject) || payload.scope !== "speech:analyze") {
      throw new Error("Invalid token claims");
    }

    const isActive = await runRedis((redis) => redis.get(`auth:subject:${subject}`));
    if (isActive !== "active") {
      throw new HttpError(401, "authentication_required", "Device activation is required.");
    }

    return { subject };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(401, "authentication_required", "Device activation is required.");
  }
}

async function requireAuth(req, _res, next) {
  try {
    req.auth = await verifyAccessToken(readBearerToken(req));
    next();
  } catch (error) {
    next(error);
  }
}

async function revokeDevice(subject) {
  if (!subject) {
    throw new HttpError(401, "authentication_required", "Device activation is required.");
  }
  await runRedis((redis) => redis.del(`auth:subject:${subject}`));
}

module.exports = {
  registerDevice,
  requireAuth,
  revokeDevice
};
