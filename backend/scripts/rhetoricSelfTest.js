/**
 * Offline checks for the Turkish rhetoric module. No API key, no network.
 *
 * These catch the failures that would otherwise only show up as a rejected
 * OpenAI request or a confusing 400 minutes into a real session:
 *
 *  - the response schema must satisfy OpenAI structured-output strict mode,
 *    which is stricter than plain JSON Schema and fails the whole call if any
 *    object anywhere in the tree breaks a rule;
 *  - the prompt must actually change when audio is attached, since that branch
 *    decides whether hesitation sounds get measured at all;
 *  - the limits must be self-consistent: a 5 minute WAV has to fit under the
 *    upload size cap, or every long recording would be rejected on arrival.
 *
 * Run: npm run test:rhetoric
 */

const assert = require("node:assert/strict");

/** HttpError carries its machine-readable reason on `.code`, not in the text. */
function throwsCode(fn, expectedCode) {
  assert.throws(fn, (error) => {
    assert.equal(error.code, expectedCode, `expected code "${expectedCode}", got "${error.code}"`);
    return true;
  });
}

const { rhetoricJsonSchema, segmentKinds } = require("../src/rhetoricSchema");
const { RHETORIC_SYSTEM_INSTRUCTION, buildRhetoricAnalysisPrompt } = require("../src/rhetoricPrompt");
const { validateRhetoricMode, validateDurationSeconds } = require("../src/validation");
const { config } = require("../src/config");

let checks = 0;
function check(name, fn) {
  fn();
  checks += 1;
  console.log(`  ok  ${name}`);
}

/* ------------------------------------------------------------------ *
 * Schema: OpenAI strict mode rules
 * ------------------------------------------------------------------ */

// Keywords the structured-output strict mode rejects outright. Using any of
// them anywhere in the tree fails the request with a schema error rather than
// silently ignoring the constraint.
const UNSUPPORTED_KEYWORDS = [
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minItems",
  "maxItems",
  "uniqueItems",
  "default",
  "oneOf",
  "allOf",
  "not",
  "if",
  "then",
  "else"
];

function walkSchema(node, path, visit) {
  if (!node || typeof node !== "object") {
    return;
  }

  visit(node, path);

  if (node.type === "object" && node.properties) {
    for (const [key, value] of Object.entries(node.properties)) {
      walkSchema(value, `${path}.${key}`, visit);
    }
  }

  if (node.type === "array" && node.items) {
    walkSchema(node.items, `${path}[]`, visit);
  }
}

console.log("Rhetoric schema");

check("root is a closed object", () => {
  assert.equal(rhetoricJsonSchema.type, "object");
  assert.equal(rhetoricJsonSchema.additionalProperties, false);
});

check("every object closes additionalProperties", () => {
  walkSchema(rhetoricJsonSchema, "$", (node, path) => {
    if (node.type === "object") {
      assert.equal(node.additionalProperties, false, `${path} must set additionalProperties:false`);
    }
  });
});

check("every object lists all its properties as required", () => {
  walkSchema(rhetoricJsonSchema, "$", (node, path) => {
    if (node.type !== "object") {
      return;
    }
    const properties = Object.keys(node.properties || {});
    const required = node.required || [];
    assert.deepEqual(
      [...properties].sort(),
      [...required].sort(),
      `${path}: required must list exactly the declared properties`
    );
  });
});

check("no strict-mode-unsupported keywords anywhere", () => {
  walkSchema(rhetoricJsonSchema, "$", (node, path) => {
    for (const keyword of UNSUPPORTED_KEYWORDS) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(node, keyword),
        false,
        `${path} uses unsupported keyword "${keyword}"`
      );
    }
  });
});

check("every leaf declares a type", () => {
  walkSchema(rhetoricJsonSchema, "$", (node, path) => {
    assert.ok(node.type, `${path} has no type`);
  });
});

check("segment kinds cover what the prompt asks the model to emit", () => {
  const enumValues = rhetoricJsonSchema.properties.segments.items.properties.kind.enum;
  assert.deepEqual([...enumValues].sort(), [...segmentKinds].sort());
  for (const kind of segmentKinds) {
    assert.ok(
      RHETORIC_SYSTEM_INSTRUCTION.length > 0 && buildSample().includes(kind),
      `prompt never mentions segment kind "${kind}"`
    );
  }
});

check("metrics separate heard signals from readable ones", () => {
  const metrics = Object.keys(rhetoricJsonSchema.properties.metrics.properties);
  // fillerSoundCount is the whole reason audio is sent to the model; if it ever
  // disappears from the schema the feature quietly loses its main measurement.
  for (const required of ["fillerSoundCount", "fillerWordCount", "wordsPerMinute", "topFillers"]) {
    assert.ok(metrics.includes(required), `metrics is missing ${required}`);
  }
});

/* ------------------------------------------------------------------ *
 * Prompt
 * ------------------------------------------------------------------ */

function buildSample(overrides = {}) {
  return buildRhetoricAnalysisPrompt({
    topic: "Yapay zekâ çağında eleştirel düşünme",
    transcript: "Bugün sizinle şunu paylaşmak istiyorum...",
    durationSeconds: 240,
    targetDurationSeconds: 240,
    preparationNotes: "1) Tanım 2) Örnek 3) Karşı görüş 4) Kapanış",
    mode: "prepared",
    audioAttached: true,
    ...overrides
  });
}

console.log("Rhetoric prompt");

check("system instruction is Turkish and names the role", () => {
  assert.match(RHETORIC_SYSTEM_INSTRUCTION, /hitabet/i);
  assert.match(RHETORIC_SYSTEM_INSTRUCTION, /Türkçe/);
});

check("prompt carries the topic, duration and preparation notes", () => {
  const prompt = buildSample();
  assert.match(prompt, /Yapay zekâ çağında eleştirel düşünme/);
  assert.match(prompt, /240 saniye/);
  assert.match(prompt, /Karşı görüş/);
});

check("audio and transcript-only prompts give different instructions", () => {
  const withAudio = buildSample({ audioAttached: true });
  const withoutAudio = buildSample({ audioAttached: false });

  assert.notEqual(withAudio, withoutAudio);
  // With audio the model is told the recording overrides the transcript.
  assert.match(withAudio, /ASIL KAYNAK ODUR/);
  // Without it, the model must not invent measurements it cannot hear.
  assert.match(withoutAudio, /Olmayan bir şeyi ölçmüş gibi yapma/);
});

check("missing preparation notes are stated, not invented", () => {
  const prompt = buildSample({ preparationNotes: "" });
  assert.match(prompt, /Hazırlık notu paylaşılmadı/);
  assert.match(prompt, /Uydurma başlık üretme/);
});

check("impromptu mode changes the expectations", () => {
  const prepared = buildSample({ mode: "prepared" });
  const impromptu = buildSample({ mode: "impromptu" });

  assert.match(prepared, /15 dakikası vardı/);
  assert.match(impromptu, /60 saniye önce/);
});

check("filler rules distinguish real fillers from ordinary use", () => {
  const prompt = buildSample();
  assert.match(prompt, /ııı/);
  // The single most common false positive: "yani" as a legitimate connective.
  assert.match(prompt, /dolgu DEĞİL/);
});

check("scoring bands are anchored so scores mean the same thing twice", () => {
  const prompt = buildSample();
  assert.match(prompt, /90-100/);
  assert.match(prompt, /Şişirilmiş puan/);
});

/* ------------------------------------------------------------------ *
 * Validation and limits
 * ------------------------------------------------------------------ */

console.log("Validation and limits");

check("mode accepts only the two practice types", () => {
  assert.equal(validateRhetoricMode("prepared"), "prepared");
  assert.equal(validateRhetoricMode("impromptu"), "impromptu");
  assert.equal(validateRhetoricMode(""), "prepared", "empty should fall back to prepared");
  assert.equal(validateRhetoricMode("  IMPROMPTU "), "impromptu", "should be trimmed and lowercased");
  throwsCode(() => validateRhetoricMode("freestyle"), "invalid_input");
});

check("duration ceiling is per-endpoint, not global", () => {
  const rhetoricMax = config.maxRhetoricDurationSeconds;

  // A five minute speech is the whole point of this module and must pass.
  assert.equal(validateDurationSeconds(300, rhetoricMax), 300);
  // The English endpoint keeps its tighter default.
  throwsCode(() => validateDurationSeconds(300), "invalid_duration");
  throwsCode(() => validateDurationSeconds(rhetoricMax + 1, rhetoricMax), "invalid_duration");
  throwsCode(() => validateDurationSeconds(0, rhetoricMax), "invalid_duration");
});

check("a full-length recording fits under the upload size cap", () => {
  // The app uploads mono 16 kHz 16-bit PCM WAV: 16000 samples/s x 2 bytes.
  const bytesPerSecond = 16000 * 2;
  const worstCaseBytes = config.maxRhetoricDurationSeconds * bytesPerSecond + 44; // + RIFF header
  assert.ok(
    worstCaseBytes < config.maxFileSizeBytes,
    `a ${config.maxRhetoricDurationSeconds}s WAV is ${(worstCaseBytes / 1024 / 1024).toFixed(1)} MB ` +
      `but the upload cap is ${(config.maxFileSizeBytes / 1024 / 1024).toFixed(1)} MB`
  );
});

check("rhetoric has its own daily quota", () => {
  assert.ok(config.maxDailyRhetoricAnalysesPerUser > 0);
  // Sharing one counter would let a few long speeches eat the English practice.
  assert.notEqual(
    config.maxDailyRhetoricAnalysesPerUser,
    config.maxDailyAnalysesPerUser,
    "expected a separate, smaller rhetoric quota"
  );
});

check("rhetoric gets a far longer request timeout than English drills", () => {
  // Regression guard for a bug that would have made every single five minute
  // analysis fail: the rhetoric path inherited the 30 second budget sized for
  // one-minute English clips.
  assert.ok(
    config.openAiRhetoricTimeoutMs >= 90000,
    `rhetoric timeout is ${config.openAiRhetoricTimeoutMs}ms, too short for five minutes of audio`
  );
  assert.ok(config.openAiRhetoricTimeoutMs > config.openAiTimeoutMs * 3);
});

check("rhetoric responses get a larger token budget than English ones", () => {
  // The response carries a fully segmented transcript, so it is much longer.
  assert.ok(config.openAiRhetoricMaxOutputTokens > config.openAiMaxOutputTokens);
});

console.log(`\n${checks} checks passed.`);
