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
const fs = require("node:fs");
const path = require("node:path");

/** HttpError carries its machine-readable reason on `.code`, not in the text. */
function throwsCode(fn, expectedCode) {
  assert.throws(fn, (error) => {
    assert.equal(error.code, expectedCode, `expected code "${expectedCode}", got "${error.code}"`);
    return true;
  });
}

const { rhetoricJsonSchema, segmentKinds } = require("../src/rhetoricSchema");
const {
  RHETORIC_SYSTEM_INSTRUCTION,
  AUDIO_OBSERVATION_SYSTEM_INSTRUCTION,
  buildAudioObservationPrompt,
  buildRhetoricAnalysisPrompt
} = require("../src/rhetoricPrompt");
const { validateRhetoricMode, validateDurationSeconds, validateTopicKeyPoints } = require("../src/validation");
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
    audioObservation: "DÖKÜM:\nörnek\n\nDOLGU SESLERİ:\n- 0:12 ııı",
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

check("listening report and transcript-only prompts differ", () => {
  const withAudio = buildSample();
  const withoutAudio = buildSample({ audioObservation: "" });

  assert.notEqual(withAudio, withoutAudio);
  // With a report the model is told it, not the transcript, is authoritative.
  assert.match(withAudio, /ASIL KAYNAKTIR/);
  assert.match(withAudio, /DİNLEME TUTANAĞI/);
  // Without one, the model must not invent measurements nobody heard.
  assert.match(withoutAudio, /Olmayan bir şeyi ölçmüş gibi yapma/);
});

check("the listening report is carried into the analysis prompt", () => {
  const prompt = buildSample({ audioObservation: "DOLGU SESLERİ:\n- 1:23 ııı\n- 2:05 eee" });
  assert.match(prompt, /1:23 ııı/);
  assert.match(prompt, /2:05 eee/);
});

check("timestamps are explained so segments can be built from them", () => {
  // The whole click-to-play feature depends on d:ss becoming seconds.
  assert.match(buildSample(), /2:14 -> 134/);
});

check("missing preparation notes are stated, not invented", () => {
  const prompt = buildSample({ preparationNotes: "" });
  assert.match(prompt, /Hazırlık notu paylaşılmadı/);
  assert.match(prompt, /Uydurma başlık üretme/);
});

check("impromptu mode changes the expectations", () => {
  const prepared = buildSample({ mode: "prepared" });
  const impromptu = buildSample({ mode: "impromptu" });

  assert.match(prepared, /15 dakikası oldu/);
  assert.match(impromptu, /60 saniye önce/);

  // The two modes must also disagree about content accuracy. Impromptu means
  // the speaker never researched the concept, so a gap in what they knew is
  // the expected outcome, not a failure to report against them.
  assert.match(impromptu, /eksik bilgi beklenen bir/i);
  assert.match(prepared, /içerik doğruluğu/i);
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
 * The API-shape bug this module was built around
 * ------------------------------------------------------------------ */

console.log("Audio call shape");

check("audio is only ever sent to Chat Completions, never to Responses", () => {
  // The original code sent `input_audio` to /v1/responses and asked for JSON
  // back. Verified against the live API, that is impossible with this model:
  // Responses answers "Audio input is not available", and Chat Completions
  // rejects `response_format` outright. The result was that audio analysis
  // failed on EVERY request and silently degraded to transcript-only for
  // months, in both modules.
  //
  // Reading the source is the only way to guard this without a network call,
  // and it is worth guarding: the failure mode is silent by design.
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "openaiClient.js"), "utf8");

  const endpointPattern = /https:\/\/api\.openai\.com\/v1\/[a-z/]+/g;
  const endpoints = [...source.matchAll(endpointPattern)].map((match) => ({
    index: match.index ?? 0,
    url: match[0]
  }));

  const audioUses = [...source.matchAll(/input_audio/g)].map((match) => match.index ?? 0);
  assert.ok(audioUses.length > 0, "no audio call found at all — did the feature get removed?");

  for (const position of audioUses) {
    const nearest = endpoints.filter((endpoint) => endpoint.index < position).pop();
    assert.ok(nearest, "audio used outside any API call");
    assert.equal(
      nearest.url,
      "https://api.openai.com/v1/chat/completions",
      `audio sent to ${nearest.url} — this model only accepts audio on Chat Completions`
    );
  }
});

check("the listening step never asks the audio model for JSON", () => {
  // response_format is rejected by this model in both strict and loose form.
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "openaiClient.js"), "utf8");
  const chatCallStart = source.indexOf("https://api.openai.com/v1/chat/completions");
  const chatCallEnd = source.indexOf("https://api.openai.com", chatCallStart + 10);
  const chatCallBody = source.slice(chatCallStart, chatCallEnd === -1 ? undefined : chatCallEnd);

  assert.ok(
    !chatCallBody.includes("response_format"),
    "the audio call sets response_format, which this model rejects"
  );
});

/* ------------------------------------------------------------------ *
 * Listening step
 * ------------------------------------------------------------------ */

console.log("Listening step");

check("listening instruction asks for observation, not judgement", () => {
  // If this step starts scoring, the two-step split collapses: the text model
  // would then be grading a grade instead of reading evidence.
  assert.match(AUDIO_OBSERVATION_SYSTEM_INSTRUCTION, /Yorum yapmaz, puan vermez/);
});

check("listening prompt requests every audible-only measurement", () => {
  const prompt = buildAudioObservationPrompt({ durationSeconds: 240 });
  for (const heading of [
    "DÖKÜM:",
    "DOLGU SESLERİ:",
    "DOLGU KELİMELERİ:",
    "DURAKLAMALAR:",
    "TEKRARLAR:",
    "GÜÇLÜ ANLAR:",
    "SES KULLANIMI:",
    "SAYILAR:"
  ]) {
    assert.ok(prompt.includes(heading), `listening prompt is missing "${heading}"`);
  }
  assert.match(prompt, /240 saniye/);
});

check("listening prompt forbids cleaning up hesitations", () => {
  // A transcriber's instinct is to tidy these away, which would delete the
  // single measurement this whole feature exists for.
  assert.match(buildAudioObservationPrompt({ durationSeconds: 60 }), /tereddütleri temizleme/);
});

check("listening prompt keeps the filler/connective distinction", () => {
  assert.match(buildAudioObservationPrompt({ durationSeconds: 60 }), /dolgu DEĞİLDİR/);
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

check("the listening step has room for a full transcript", () => {
  assert.ok(config.openAiAudioObservationMaxTokens >= 4000);
});

/* ------------------------------------------------------------------ *
 * Concept accuracy: the content check
 * ------------------------------------------------------------------ */

check("the schema requires conceptAccuracy with a closed verdict set", () => {
  assert.ok(rhetoricJsonSchema.required.includes("conceptAccuracy"));
  const accuracy = rhetoricJsonSchema.properties.conceptAccuracy;
  assert.equal(accuracy.additionalProperties, false);
  assert.deepEqual(accuracy.properties.verdict.enum, ["dogru", "kismen", "yanlis"]);
  // Strict mode fails the whole request if any property is missing from required.
  assert.deepEqual(new Set(accuracy.required), new Set(Object.keys(accuracy.properties)));
});

check("a reference definition turns the content check on", () => {
  const prompt = buildRhetoricAnalysisPrompt({
    topic: "Jevons paradoksu",
    transcript: "deneme",
    durationSeconds: 200,
    targetDurationSeconds: 240,
    preparationNotes: "",
    mode: "prepared",
    audioObservation: "",
    topicDefinition: "Bir kaynagin kullanimi verimli hale geldiginde toplam tuketiminin artabilmesi.",
    topicKeyPoints: ["Geri tepme etkisi", "Jevons'un komur ornegi"]
  });

  assert.ok(prompt.includes("İÇERİK DOĞRULUĞU DENETİMİ"));
  assert.ok(prompt.includes("Geri tepme etkisi"));
  assert.ok(prompt.includes("Jevons'un komur ornegi"));
});

check("no reference definition tells the model NOT to invent one", () => {
  // Without this branch the model would grade the speaker against a definition
  // it made up from memory, which is worse than not checking at all.
  const prompt = buildRhetoricAnalysisPrompt({
    topic: "Kullanicinin kendi yazdigi konu",
    transcript: "deneme",
    durationSeconds: 200,
    targetDurationSeconds: 240,
    preparationNotes: "",
    mode: "prepared",
    audioObservation: ""
  });

  assert.ok(prompt.includes("KAVRAM REFERANSI: Yok."));
  assert.ok(prompt.includes("Kendi hafızandan bir tanım üretip"));
  assert.ok(!prompt.includes("İÇERİK DOĞRULUĞU DENETİMİ"));
});

check("the content check separates a missing point from a wrong statement", () => {
  // The single most damaging way this feature can fail is by reporting things
  // the speaker never said as errors: one invented mistake costs the user's
  // trust in the entire report, including the parts that are right.
  const prompt = buildRhetoricAnalysisPrompt({
    topic: "Goodhart yasasi",
    transcript: "deneme",
    durationSeconds: 200,
    targetDurationSeconds: 240,
    preparationNotes: "",
    mode: "prepared",
    audioObservation: "",
    topicDefinition: "Bir olcut hedef haline geldiginde iyi bir olcut olmaktan cikar.",
    topicKeyPoints: ["Vekil gostergenin amacla baginin kopmasi"]
  });

  assert.ok(prompt.includes("Eksik olan yanlış değildir"));
  assert.ok(prompt.includes("Emin olmadığın yerde hata yazma"));
  // Accuracy must move the content score without touching delivery scores,
  // otherwise a factual slip would quietly deflate the fluency trend line the
  // progress chart is built on.
  assert.ok(prompt.includes("scores.content"));
  assert.ok(prompt.includes("Diğer puan"));
});

check("key points survive the multipart round trip", () => {
  // They travel as one newline-separated field, not JSON, because in
  // multipart/form-data a repeated field arrives as an array only sometimes —
  // a single-item list would silently decay into a bare string.
  const points = ["Birinci nokta", "İkinci nokta", "Üçüncü nokta"];
  assert.deepEqual(validateTopicKeyPoints(points.join("\n")), points);
  assert.deepEqual(validateTopicKeyPoints("Tek nokta"), ["Tek nokta"]);
  assert.deepEqual(validateTopicKeyPoints(""), []);
  assert.deepEqual(validateTopicKeyPoints(undefined), []);
});

check("key points are bounded, because they go straight into a paid prompt", () => {
  const many = Array.from({ length: 40 }, (_, index) => `nokta ${index}`).join("\n");
  assert.equal(validateTopicKeyPoints(many).length, 12);

  const long = validateTopicKeyPoints("x".repeat(500));
  assert.equal(long[0].length, 300);

  throwsCode(() => validateTopicKeyPoints("y".repeat(3001)), "invalid_input");
});

console.log(`\n${checks} checks passed.`);
