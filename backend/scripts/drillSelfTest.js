/**
 * Offline checks for the micro-drills. No API key, no network, no ffmpeg.
 *
 * The drill verdict is the one number in this codebase a person will compare
 * against yesterday's, every day. That makes it the place where a silent change
 * in behaviour does the most damage: a bar that moves turns a streak counter
 * into noise and the habit dies. So the scoring rules are pure functions and
 * this file pins them down.
 *
 * Run: npm run test:drill
 */

const assert = require("node:assert/strict");

const {
  evaluateDrill,
  buildDrillMetrics,
  sequenceSimilarity,
  normalizeForComparison,
  TEMPO_TOLERANCE,
  TWISTER_PASS_ACCURACY
} = require("../src/drillEvaluation");
const { drillJsonSchema } = require("../src/drillSchema");
const {
  buildDrillAnalysisPrompt,
  buildDrillListeningPrompt,
  DRILL_SYSTEM_INSTRUCTION
} = require("../src/drillPrompt");
const { validateDrillKind, validateOptionalWordsPerMinute } = require("../src/validation");
const { config } = require("../src/config");

let checks = 0;
function check(name, fn) {
  fn();
  checks += 1;
  console.log(`  ok  ${name}`);
}

function throwsCode(fn, expectedCode) {
  assert.throws(fn, (error) => {
    assert.equal(error.code, expectedCode, `expected code "${expectedCode}", got "${error.code}"`);
    return true;
  });
}

/** A measurement object shaped like the one ffmpeg produces. */
function measurement(overrides = {}) {
  return {
    reliable: true,
    wordsPerMinute: 145,
    articulationWordsPerMinute: 160,
    pauseCount: 2,
    longestPauseSeconds: 1.4,
    ...overrides
  };
}

/* ------------------------------------------------------------------ *
 * Text comparison
 * ------------------------------------------------------------------ */

console.log("Text comparison");

check("an exact reading scores 1", () => {
  assert.equal(sequenceSimilarity("kırk küp kırkının da kulpu kırık küp", "kırk küp kırkının da kulpu kırık küp"), 1);
});

check("punctuation and capitalisation do not count as mistakes", () => {
  assert.equal(sequenceSimilarity("Dal kalkar, kartal sarkar.", "dal kalkar kartal sarkar"), 1);
});

check("Turkish dotted and dotless i are folded correctly", () => {
  // The trap: JavaScript's default toLowerCase maps "I" to "i" and "İ" to "i̇",
  // so a transcript saying "kırk" would fail to match a text saying "KIRK" for
  // a reason that has nothing to do with how it was said.
  assert.equal(normalizeForComparison("KIRK"), "kırk");
  assert.equal(normalizeForComparison("İSTANBUL"), "istanbul");
  assert.equal(sequenceSimilarity("KIRK KÜP", "kırk küp"), 1);
});

check("word order matters", () => {
  // "dal kalkar kartal sarkar" and "kartal kalkar dal sarkar" share every word
  // and are not the same performance, which is the entire point of a twister.
  const score = sequenceSimilarity("dal kalkar kartal sarkar", "kartal kalkar dal sarkar");
  assert.ok(score < 1, `expected order to cost something, got ${score}`);
  assert.ok(score > 0.4, `expected partial credit, got ${score}`);
});

check("a swallowed word costs roughly one word, not the whole alignment", () => {
  const full = "bir berber bir berbere gel beraber bir berber dükkanı açalım demiş";
  const missing = "bir berber bir berbere gel beraber bir berber açalım demiş";
  const score = sequenceSimilarity(full, missing);
  assert.ok(score > 0.85, `one dropped word should not collapse the score, got ${score}`);
});

check("padding the reading cannot raise the score", () => {
  // Divided by the longer side, so saying the twister then ad-libbing does not
  // earn credit for the ad-lib.
  const score = sequenceSimilarity("kırk küp", "kırk küp ve sonra bir sürü başka kelime daha");
  assert.ok(score < 0.5, `expected padding to be penalised, got ${score}`);
});

check("an empty transcript scores zero, an empty target scores null", () => {
  assert.equal(sequenceSimilarity("kırk küp", ""), 0);
  assert.equal(sequenceSimilarity("", "kırk küp"), null);
});

/* ------------------------------------------------------------------ *
 * Tempo drill
 * ------------------------------------------------------------------ */

console.log("Tempo drill");

const PASSAGE = "bir iki üç dört beş altı yedi sekiz dokuz on";

check("hitting the target passes", () => {
  const result = evaluateDrill({
    kind: "tempo",
    targetText: PASSAGE,
    targetWordsPerMinute: 145,
    transcript: PASSAGE,
    measured: measurement({ wordsPerMinute: 147 })
  });
  assert.equal(result.passed, true);
  assert.match(result.headline, /tutturuldu/i);
});

check("the tolerance band is symmetric and holds at its edges", () => {
  const target = 145;
  const justInside = target * (1 + TEMPO_TOLERANCE * 0.9);
  const justOutside = target * (1 + TEMPO_TOLERANCE * 1.2);

  for (const [wpm, expected] of [[justInside, true], [justOutside, false],
                                 [target * (1 - TEMPO_TOLERANCE * 0.9), true],
                                 [target * (1 - TEMPO_TOLERANCE * 1.2), false]]) {
    const result = evaluateDrill({
      kind: "tempo",
      targetText: PASSAGE,
      targetWordsPerMinute: target,
      transcript: PASSAGE,
      measured: measurement({ wordsPerMinute: wpm })
    });
    assert.equal(result.passed, expected, `wpm ${Math.round(wpm)} should be ${expected}`);
  }
});

check("the headline says which way and by how much", () => {
  const result = evaluateDrill({
    kind: "tempo",
    targetText: PASSAGE,
    targetWordsPerMinute: 145,
    transcript: PASSAGE,
    measured: measurement({ wordsPerMinute: 190 })
  });
  assert.match(result.headline, /45 kelime\/dk hızlı/);
});

check("hitting the pace by skipping half the text is not a pass", () => {
  // The failure this guards against is real: read every other word and the
  // words-per-minute lands wherever you like.
  const result = evaluateDrill({
    kind: "tempo",
    targetText: PASSAGE,
    targetWordsPerMinute: 145,
    transcript: "bir üç beş yedi dokuz",
    measured: measurement({ wordsPerMinute: 145 })
  });
  assert.equal(result.passed, false);
  assert.ok(result.facts.some((fact) => /atlanmış/.test(fact)));
});

check("no reliable measurement means undecided, not failed", () => {
  // "Could not measure" and "you were too fast" are different messages and the
  // speaker can only act on one of them.
  for (const measured of [null, measurement({ reliable: false })]) {
    const result = evaluateDrill({
      kind: "tempo",
      targetText: PASSAGE,
      targetWordsPerMinute: 145,
      transcript: PASSAGE,
      measured
    });
    assert.equal(result.undecided, true);
    assert.equal(result.passed, false);
    assert.match(result.headline, /ölçülemedi/i);
  }
});

/* ------------------------------------------------------------------ *
 * Tongue twister
 * ------------------------------------------------------------------ */

console.log("Tongue twister");

const TWISTER = "dal kalkar kartal sarkar kartal kalkar dal sarkar";

check("a clean reading passes", () => {
  const result = evaluateDrill({
    kind: "tekerleme",
    targetText: TWISTER,
    transcript: TWISTER,
    measured: measurement()
  });
  assert.equal(result.passed, true);
  assert.equal(result.textAccuracy, 1);
});

check("a mangled reading fails and reports the match", () => {
  const result = evaluateDrill({
    kind: "tekerleme",
    targetText: TWISTER,
    transcript: "dal kalkar sarkar kalkar",
    measured: measurement()
  });
  assert.equal(result.passed, false);
  assert.ok(result.textAccuracy < TWISTER_PASS_ACCURACY);
  // A low match is ambiguous by nature: the recogniser and the mouth both get
  // a vote, so the feedback says to go listen rather than picking a story.
  assert.ok(result.facts.some((fact) => /dinleyip/.test(fact)));
});

check("tempo does not decide a twister", () => {
  // Speed is not the skill here; keeping the syllables while speeding up is.
  const slow = evaluateDrill({
    kind: "tekerleme",
    targetText: TWISTER,
    transcript: TWISTER,
    measured: measurement({ wordsPerMinute: 60, articulationWordsPerMinute: 70 })
  });
  assert.equal(slow.passed, true);
});

/* ------------------------------------------------------------------ *
 * Filler ban
 * ------------------------------------------------------------------ */

console.log("Filler ban");

check("one hesitation sound fails the rep", () => {
  // Zero is the bar on purpose. "Almost none" is the state the speaker is
  // already in; the drill exists to make silence the reflex instead.
  assert.equal(evaluateDrill({ kind: "dolgu_yasagi", fillerSoundCount: 0, measured: measurement() }).passed, true);
  assert.equal(evaluateDrill({ kind: "dolgu_yasagi", fillerSoundCount: 1, measured: measurement() }).passed, false);
});

check("pausing is reported as success, not as a fault", () => {
  // The whole instruction is "stop instead of saying ııı", so a report that
  // scolded the speaker for pausing would train the opposite reflex.
  const result = evaluateDrill({
    kind: "dolgu_yasagi",
    fillerSoundCount: 0,
    measured: measurement({ pauseCount: 5, longestPauseSeconds: 2.2 })
  });
  assert.equal(result.passed, true);
  assert.ok(result.facts.some((fact) => /iyi işarettir/.test(fact)));
});

check("filler words are reported but do not fail the rep", () => {
  const result = evaluateDrill({
    kind: "dolgu_yasagi",
    fillerSoundCount: 0,
    fillerWordCount: 4,
    measured: measurement()
  });
  assert.equal(result.passed, true);
  assert.ok(result.facts.some((fact) => /dolgu kelimesi/.test(fact)));
});

/* ------------------------------------------------------------------ *
 * Metrics assembly
 * ------------------------------------------------------------------ */

console.log("Metrics");

check("waveform figures are used and filler counts are preserved", () => {
  const metrics = buildDrillMetrics({
    fillerSoundCount: 3,
    fillerWordCount: 1,
    measured: measurement({ wordsPerMinute: 151.2, pauseCount: 4 }),
    textAccuracy: 0.9123
  });
  assert.equal(metrics.metricsSource, "measured");
  assert.equal(metrics.wordsPerMinute, 151.2);
  assert.equal(metrics.pauseCount, 4);
  assert.equal(metrics.fillerSoundCount, 3);
  assert.equal(metrics.textAccuracy, 0.912);
});

check("an unreliable measurement is not passed off as measured", () => {
  for (const measured of [null, measurement({ reliable: false })]) {
    const metrics = buildDrillMetrics({ fillerSoundCount: 0, fillerWordCount: 0, measured, textAccuracy: null });
    assert.equal(metrics.metricsSource, "model");
    assert.equal(metrics.wordsPerMinute, null);
    assert.equal(metrics.textAccuracy, null);
  }
});

/* ------------------------------------------------------------------ *
 * Schema and prompts
 * ------------------------------------------------------------------ */

console.log("Schema and prompts");

check("the schema satisfies OpenAI strict mode throughout", () => {
  // Strict mode fails the entire call if any object anywhere breaks a rule, so
  // this walks the tree rather than checking the top level.
  (function walk(node, path) {
    if (!node || typeof node !== "object") {
      return;
    }
    if (node.type === "object") {
      assert.equal(node.additionalProperties, false, `${path} must set additionalProperties:false`);
      assert.deepEqual(
        new Set(node.required),
        new Set(Object.keys(node.properties)),
        `${path} must require every property`
      );
    }
    Object.entries(node.properties || {}).forEach(([key, value]) => walk(value, `${path}.${key}`));
    if (node.items) {
      walk(node.items, `${path}[]`);
    }
  })(drillJsonSchema, "root");
});

check("the coaching prompt is told the verdict, so it cannot contradict it", () => {
  // Without this the report could say "tempoyu tutturdun" next to a GEÇMEDİ
  // badge, and one visible contradiction costs the feature its credibility.
  const prompt = buildDrillAnalysisPrompt({
    kind: "tempo",
    targetText: PASSAGE,
    targetWordsPerMinute: 145,
    durationSeconds: 45,
    transcript: PASSAGE,
    evaluation: evaluateDrill({
      kind: "tempo",
      targetText: PASSAGE,
      targetWordsPerMinute: 145,
      transcript: PASSAGE,
      measured: measurement({ wordsPerMinute: 200 })
    })
  });
  assert.match(prompt, /SONUÇ: GEÇMEDİ/);
  assert.match(prompt, /geçmediyse geçti\s*\n?\s*deme/);
});

check("reading drills are told not to invent hesitation counts", () => {
  // Nothing listens for "ııı" on a tempo or twister rep, so a non-zero count
  // there would be fabricated — and would read as a real measurement.
  for (const kind of ["tempo", "tekerleme"]) {
    const prompt = buildDrillAnalysisPrompt({
      kind,
      targetText: PASSAGE,
      targetWordsPerMinute: 145,
      durationSeconds: 45,
      transcript: PASSAGE,
      evaluation: evaluateDrill({
        kind,
        targetText: PASSAGE,
        targetWordsPerMinute: 145,
        transcript: PASSAGE,
        measured: measurement()
      })
    });
    assert.match(prompt, /dolgu sesi ölçülmedi/);
    assert.match(prompt, /0 yaz/);
  }
});

check("the listening prompt keeps the filler/connective distinction", () => {
  const prompt = buildDrillListeningPrompt({ durationSeconds: 60 });
  assert.match(prompt, /ııı/);
  assert.match(prompt, /dolgu DEĞİLDİR/);
});

check("the system instruction asks for short answers", () => {
  assert.match(DRILL_SYSTEM_INSTRUCTION, /Kısa konuşursun/);
});

/* ------------------------------------------------------------------ *
 * Validation and limits
 * ------------------------------------------------------------------ */

console.log("Validation and limits");

check("only the three drill kinds are accepted", () => {
  assert.equal(validateDrillKind("tempo"), "tempo");
  throwsCode(() => validateDrillKind("baska"), "invalid_input");
  throwsCode(() => validateDrillKind(""), "invalid_input");
});

check("the tempo target is bounded on both sides", () => {
  // It is a divisor, so zero would produce Infinity; an unreachable target
  // would fail every rep for a reason the speaker cannot act on.
  assert.equal(validateOptionalWordsPerMinute("145"), 145);
  assert.equal(validateOptionalWordsPerMinute(""), null);
  throwsCode(() => validateOptionalWordsPerMinute(0), "invalid_input");
  throwsCode(() => validateOptionalWordsPerMinute(500), "invalid_input");
});

check("drills get a much larger daily quota than rhetoric sessions", () => {
  // Frequency is the entire premise. A quota that stops the fourth rep of the
  // day would defeat the feature.
  assert.ok(config.maxDailyDrillsPerUser >= 20);
  assert.ok(config.maxDailyDrillsPerUser > config.maxDailyRhetoricAnalysesPerUser * 3);
});

check("drill budgets are smaller than rhetoric ones", () => {
  assert.ok(config.maxDrillDurationSeconds < config.maxRhetoricDurationSeconds);
  assert.ok(config.openAiDrillTimeoutMs < config.openAiRhetoricTimeoutMs);
  assert.ok(config.openAiDrillMaxOutputTokens < config.openAiRhetoricMaxOutputTokens);
});

console.log(`\n${checks} checks passed.`);
