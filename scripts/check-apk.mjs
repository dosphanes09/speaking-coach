import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const apkArgument = process.argv[2];

if (!apkArgument) {
  console.error('Usage: npm.cmd run check:apk -- "C:\\path\\to\\app.apk"');
  process.exit(1);
}

const apkPath = resolve(apkArgument);

if (!existsSync(apkPath)) {
  console.error(`APK not found: ${apkPath}`);
  process.exit(1);
}

const apk = readFileSync(apkPath);
const minimumEocdSize = 22;
const maximumZipCommentSize = 0xffff;
const eocdSignature = 0x06054b50;
let eocdOffset = -1;

for (
  let offset = apk.length - minimumEocdSize;
  offset >= Math.max(0, apk.length - minimumEocdSize - maximumZipCommentSize);
  offset -= 1
) {
  if (apk.readUInt32LE(offset) === eocdSignature) {
    eocdOffset = offset;
    break;
  }
}

if (eocdOffset < 0) {
  console.error("INVALID APK: ZIP end record is missing. The download is incomplete or corrupt.");
  process.exit(1);
}

const centralDirectoryOffset = apk.readUInt32LE(eocdOffset + 16);
const signingBlockFooterOffset = centralDirectoryOffset - 24;
const signingBlockMagic = apk
  .subarray(centralDirectoryOffset - 16, centralDirectoryOffset)
  .toString("ascii");

if (signingBlockFooterOffset < 0 || signingBlockMagic !== "APK Sig Block 42") {
  console.error("INVALID APK: Android signing block is missing.");
  process.exit(1);
}

const signingBlockSize = Number(apk.readBigUInt64LE(signingBlockFooterOffset));
const signingBlockStart = centralDirectoryOffset - signingBlockSize - 8;

if (
  signingBlockStart < 0 ||
  Number(apk.readBigUInt64LE(signingBlockStart)) !== signingBlockSize
) {
  console.error("INVALID APK: Android signing block is damaged.");
  process.exit(1);
}

const signatureSchemeIds = new Set();

for (let offset = signingBlockStart + 8; offset < signingBlockFooterOffset;) {
  const pairSize = Number(apk.readBigUInt64LE(offset));

  if (pairSize < 4 || offset + 8 + pairSize > signingBlockFooterOffset) {
    console.error("INVALID APK: Android signing entries are damaged.");
    process.exit(1);
  }

  signatureSchemeIds.add(apk.readUInt32LE(offset + 8));
  offset += 8 + pairSize;
}

const hasV2Signature = signatureSchemeIds.has(0x7109871a);
const hasV3Signature = signatureSchemeIds.has(0xf05368c0);

if (!hasV2Signature && !hasV3Signature) {
  console.error("INVALID APK: No Android v2/v3 release signature was found.");
  process.exit(1);
}

const sha256 = createHash("sha256").update(apk).digest("hex").toUpperCase();
const signatureSchemes = [hasV2Signature && "v2", hasV3Signature && "v3"]
  .filter(Boolean)
  .join(", ");

console.log("APK structure: valid");
console.log(`File: ${apkPath}`);
console.log(`Size: ${apk.length} bytes`);
console.log(`Android signature scheme: ${signatureSchemes}`);
console.log(`SHA-256: ${sha256}`);
