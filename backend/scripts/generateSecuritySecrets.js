const crypto = require("node:crypto");

const requestedCount = Number(process.argv[2] || 3);
const inviteCount = Number.isInteger(requestedCount) ? Math.min(Math.max(requestedCount, 1), 20) : 3;
const tokenSecret = crypto.randomBytes(48).toString("base64url");
const inviteCodes = Array.from({ length: inviteCount }, () => crypto.randomBytes(24).toString("base64url"));

console.log("Copy these values directly into Render secret environment variables:");
console.log(`AUTH_TOKEN_SECRET=${tokenSecret}`);
console.log(`APP_INVITE_CODES=${inviteCodes.join(",")}`);
console.log("");
console.log("Share one invite code privately with each authorized phone. Do not commit this output.");
