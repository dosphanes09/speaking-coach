/**
 * Checks the waveform measurements against recordings whose answer is known.
 *
 * No API key and no network: the test builds its own WAV files in pure Node,
 * so the pause structure is not something the test guesses at, it is something
 * the test constructed. That is the whole design — a measurement can only be
 * validated against a recording where the right answer was decided in advance.
 *
 * It does need ffmpeg, which is what it is testing.
 *
 * The expectations below are DERIVED from the build plan rather than typed in.
 * The first version of this test hardcoded a pause start of 11.1s; the code
 * correctly measured 12.0s and the test called it a bug. Deriving them removes
 * a whole class of test that is wrong about working code.
 *
 * Run: npm run test:audio-metrics
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  measureSpeechMetrics,
  applyMeasuredMetrics,
  describeMeasuredMetrics,
  countWords,
  MIN_PAUSE_SECONDS
} = require("../src/audioMetrics");

const RATE = 16000;
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-metrics-"));

let checks = 0;

/**
 * Awaited, and every call site awaits it in turn.
 *
 * The first version called `fn()` without awaiting. Half the checks here are
 * async, so their assertions resolved into unhandled rejections after the
 * runner had already printed "ok" — a suite that reported passing no matter
 * what the code did. A test harness that cannot fail is worse than no harness,
 * because it is trusted.
 */
async function check(name, fn) {
  await fn();
  checks += 1;
  console.log(`  ok  ${name}`);
}

/* ------------------------------------------------------------------ *
 * Synthetic recordings
 * ------------------------------------------------------------------ */

/**
 * Writes a 16 kHz mono WAV from a plan of alternating sound and silence.
 *
 * The "speech" is two tones with a slow amplitude wobble rather than a pure
 * sine: a bare sine sits at a constant level, which is not what a voice does
 * and lets a detector look better than it is.
 */
function buildWav(fileName, plan, { noiseDb = null, speechDb = -6 } = {}) {
  const speechAmplitude = 10 ** (speechDb / 20);
  const samples = [];

  for (const [kind, seconds] of plan) {
    const count = Math.round(RATE * seconds);
    for (let i = 0; i < count; i += 1) {
      if (kind === "ses") {
        const t = i / RATE;
        const tone = (Math.sin(2 * Math.PI * 180 * t) + 0.6 * Math.sin(2 * Math.PI * 430 * t)) / 1.6;
        samples.push(tone * (0.75 + 0.25 * Math.sin(2 * Math.PI * 3.1 * t)) * speechAmplitude);
      } else {
        samples.push(0);
      }
    }
  }

  if (noiseDb !== null) {
    const noiseAmplitude = 10 ** (noiseDb / 20);
    // Deterministic pseudo-noise, so a failure can be reproduced exactly.
    let seed = 12345;
    for (let i = 0; i < samples.length; i += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      samples[i] += ((seed / 0x7fffffff) * 2 - 1) * noiseAmplitude;
    }
  }

  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);

  const filePath = path.join(workDir, fileName);
  fs.writeFileSync(filePath, Buffer.concat([header, data]));
  return filePath;
}

/** Turns a build plan into the answer the measurement should produce. */
function expectationsFrom(plan) {
  let at = 0;
  const gaps = [];
  for (const [kind, seconds] of plan) {
    if (kind === "sessiz") {
      gaps.push({ start: at, end: at + seconds, seconds });
    }
    at += seconds;
  }

  const total = at;
  const leading = gaps.find((gap) => gap.start === 0) ?? null;
  const trailing = gaps.find((gap) => Math.abs(gap.end - total) < 1e-6) ?? null;
  const internal = gaps.filter(
    (gap) => gap !== leading && gap !== trailing && gap.seconds >= MIN_PAUSE_SECONDS
  );
  const speechStart = leading ? leading.end : 0;
  const speechEnd = trailing ? trailing.start : total;
  const paused = internal.reduce((sum, gap) => sum + gap.seconds, 0);

  return {
    totalSeconds: total,
    pauseCount: internal.length,
    longestPauseSeconds: internal.length ? Math.max(...internal.map((gap) => gap.seconds)) : 0,
    speechStartSeconds: speechStart,
    speechEndSeconds: speechEnd,
    silenceRatio: paused / (speechEnd - speechStart),
    pauseStarts: internal.map((gap) => gap.start)
  };
}

// 1.0 lead | 3.0 speech | 2.5 PAUSE | 2.5 speech | 0.4 too-short | 2.6 speech |
// 4.2 PAUSE | 1.8 speech | 1.5 trail
const PLAN = [
  ["sessiz", 1.0],
  ["ses", 3.0],
  ["sessiz", 2.5],
  ["ses", 2.5],
  ["sessiz", 0.4],
  ["ses", 2.6],
  ["sessiz", 4.2],
  ["ses", 1.8],
  ["sessiz", 1.5]
];

const EXPECTED = expectationsFrom(PLAN);
const TRANSCRIPT = "bir iki üç dört beş altı yedi sekiz dokuz on ".repeat(9);

function near(actual, expected, tolerance) {
  assert.ok(
    typeof actual === "number" && Math.abs(actual - expected) <= tolerance,
    `expected ${expected} ± ${tolerance}, got ${actual}`
  );
}

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */

async function main() {
  console.log("Waveform measurement");

  // Three microphone situations that all describe the same performance. A
  // measurement that only survives one of them is not a measurement.
  const profiles = [
    ["temiz kayıt", { }],
    ["gürültülü oda (-52 dB taban)", { noiseDb: -52 }],
    ["kısık kayıt (-28 dB konuşma)", { noiseDb: -70, speechDb: -28 }]
  ];

  for (const [label, options] of profiles) {
    const file = buildWav(`${label.replace(/\W+/g, "-")}.wav`, PLAN, options);
    // eslint-disable-next-line no-await-in-loop
    const measured = await measureSpeechMetrics(file, { totalSeconds: 19.5, transcript: TRANSCRIPT });

    await check(`${label}: measures the same speech identically`, () => {
      assert.ok(measured, "measurement returned null");
      assert.equal(measured.reliable, true);
      assert.equal(measured.pauseCount, EXPECTED.pauseCount);
      near(measured.longestPauseSeconds, EXPECTED.longestPauseSeconds, 0.25);
      near(measured.speechStartSeconds, EXPECTED.speechStartSeconds, 0.25);
      near(measured.speechEndSeconds, EXPECTED.speechEndSeconds, 0.25);
      near(measured.silenceRatio, EXPECTED.silenceRatio, 0.03);
      EXPECTED.pauseStarts.forEach((start, index) => {
        near(measured.pauses[index]?.startSeconds, start, 0.25);
      });
    });
  }

  const clean = buildWav("clean.wav", PLAN);

  await check("a gap shorter than the floor is not a pause", async () => {
    // The 0.4s gap at 9.0s is a beat between words, not a stall.
    const measured = await measureSpeechMetrics(clean, { totalSeconds: 19.5 });
    assert.ok(!measured.pauses.some((pause) => Math.abs(pause.startSeconds - 9.0) < 0.3));
  });

  await check("the decoded duration wins over the client's claim", async () => {
    // Browser MediaRecorder blobs routinely mis-report their own length.
    const measured = await measureSpeechMetrics(clean, { totalSeconds: 999, transcript: TRANSCRIPT });
    near(measured.totalSeconds, EXPECTED.totalSeconds, 0.2);
  });

  // Determinism is the entire justification for this module, so prove it rather
  // than assert it. Without this the numbers are just a different guess.
  const repeats = [];
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    repeats.push(JSON.stringify(await measureSpeechMetrics(clean, { totalSeconds: 19.5, transcript: TRANSCRIPT })));
  }
  await check("five runs on one file produce byte-identical results", () => {
    assert.ok(repeats.every((run) => run === repeats[0]));
  });

  /* ---------------- Degenerate inputs ---------------- */

  await check("a missing file measures as null, not as silence", async () => {
    // The dangerous failure: reporting "0 pauses" for a file ffmpeg never opened.
    assert.equal(await measureSpeechMetrics(path.join(workDir, "yok.wav"), { totalSeconds: 10 }), null);
  });

  await check("a corrupt file measures as null", async () => {
    const broken = path.join(workDir, "bozuk.wav");
    fs.writeFileSync(broken, Buffer.from("not audio at all"));
    assert.equal(await measureSpeechMetrics(broken, { totalSeconds: 10 }), null);
  });

  await check("noise too close to the voice is reported as unmeasurable", async () => {
    // Room tone only ~24 dB under the speech: no amplitude threshold separates
    // them. Saying so is correct; reporting a confident zero would not be.
    const harsh = buildWav("harsh.wav", PLAN, { noiseDb: -30 });
    const measured = await measureSpeechMetrics(harsh, { totalSeconds: 19.5 });
    assert.ok(measured);
    assert.equal(measured.reliable, false);
    assert.ok(measured.unreliableReason.length > 0);
  });

  await check("a genuinely pause-heavy recording is not 'corrected' into silence", async () => {
    // Regression guard for a real bug. An earlier version retried at a shifted
    // threshold whenever a recording looked too silent, and kept whichever
    // answer came back tidier. This file — 2s of speech between 6s silences —
    // tripped that rule and came back reported as having no pauses at all.
    const pausey = buildWav(
      "pausey.wav",
      [["ses", 2.0], ["sessiz", 6.0], ["ses", 2.0], ["sessiz", 6.0], ["ses", 2.0]],
      { noiseDb: -50 }
    );
    const measured = await measureSpeechMetrics(pausey, { totalSeconds: 18 });
    assert.equal(measured.reliable, true);
    assert.equal(measured.pauseCount, 2);
    near(measured.longestPauseSeconds, 6.0, 0.3);
    assert.ok(measured.silenceRatio > 0.6, "a mostly-silent recording must report as mostly silent");
  });

  await check("continuous speech reports no pauses without being called unreliable", async () => {
    const nonstop = buildWav("nonstop.wav", [["sessiz", 0.5], ["ses", 40.0], ["sessiz", 0.5]], {
      noiseDb: -50
    });
    const measured = await measureSpeechMetrics(nonstop, { totalSeconds: 41 });
    assert.equal(measured.pauseCount, 0);
    assert.equal(measured.reliable, true);
  });

  /* ---------------- Wiring into the analysis ---------------- */

  const measured = await measureSpeechMetrics(clean, { totalSeconds: 19.5, transcript: TRANSCRIPT });
  const modelMetrics = {
    wordsPerMinute: 999,
    fillerSoundCount: 14,
    fillerWordCount: 6,
    pauseCount: 99,
    longestPauseSeconds: 99,
    silenceRatio: 0.99,
    uniqueWordRatio: 0.4,
    averageSentenceWords: 12,
    topFillers: [{ text: "yani", count: 4 }]
  };

  await check("measured values replace the model's guesses", () => {
    const merged = applyMeasuredMetrics(modelMetrics, measured);
    assert.equal(merged.metricsSource, "measured");
    assert.equal(merged.pauseCount, measured.pauseCount);
    assert.equal(merged.longestPauseSeconds, measured.longestPauseSeconds);
    assert.equal(merged.silenceRatio, measured.silenceRatio);
    assert.equal(merged.wordsPerMinute, measured.wordsPerMinute);
  });

  await check("filler counts are never overwritten", () => {
    // "ııı" is sound, not silence. Claiming to have measured it here would be
    // the same mistake this module exists to undo, pointing the other way.
    const merged = applyMeasuredMetrics(modelMetrics, measured);
    assert.equal(merged.fillerSoundCount, 14);
    assert.equal(merged.fillerWordCount, 6);
    assert.deepEqual(merged.topFillers, modelMetrics.topFillers);
  });

  await check("an unreliable or absent measurement changes nothing", () => {
    // Overwriting a rough guess with a confident zero is strictly worse.
    for (const useless of [null, { ...measured, reliable: false }]) {
      const merged = applyMeasuredMetrics(modelMetrics, useless);
      assert.equal(merged.metricsSource, "model");
      assert.equal(merged.pauseCount, 99);
      assert.equal(merged.silenceRatio, 0.99);
    }
  });

  await check("the prompt block carries clickable timestamps, not just totals", () => {
    // Each pause becomes a tappable mark that seeks the recording, so a
    // timestamp the model invented sends the speaker to the wrong moment.
    const block = describeMeasuredMetrics(measured);
    assert.match(block, /0:04/);
    assert.match(block, /0:12/);
    assert.match(block, /startSeconds/);
    // And it must not let the model think silence detection hears "ııı".
    assert.match(block, /sessizlik DEĞİLDİR/);
    assert.equal(describeMeasuredMetrics(null), "");
  });

  await check("word counting ignores punctuation and bracketed markers", () => {
    assert.equal(countWords("bir iki üç"), 3);
    assert.equal(countWords("bir [1.8 sn] iki"), 2);
    assert.equal(countWords("bir, iki. üç!"), 3);
    assert.equal(countWords(""), 0);
  });

  console.log(`\n${checks} checks passed.`);
}

main()
  .catch((error) => {
    console.error(`\nFAILED: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });
