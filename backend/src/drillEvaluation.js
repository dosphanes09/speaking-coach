/**
 * Pass or fail for a micro-drill, decided in code.
 *
 * The verdict is deliberately kept away from the model. A drill is a rep the
 * speaker repeats daily and compares against yesterday, so the bar has to be
 * the same bar every time: if a model decides, an identical performance passes
 * on Tuesday and fails on Wednesday, and the streak counter — the only thing
 * that makes a daily habit stick — becomes noise.
 *
 * The model still writes the two sentences of coaching. That is the split this
 * codebase keeps arriving at: numbers and verdicts from arithmetic, language
 * and interpretation from the model.
 *
 * Two of the three drills need no judgement at all:
 *
 *   tempo       words / speaking time, against a target the speaker chose.
 *   tekerleme   what was transcribed, compared with what was written.
 *
 * Only `dolgu_yasagi` depends on hearing, because "ııı" is a sound and no
 * amount of waveform analysis finds it.
 */

/** Within this much of the target pace still counts as hitting it. */
const TEMPO_TOLERANCE = 0.12;

/** Word-level match with the written text required to call a twister clean. */
const TWISTER_PASS_ACCURACY = 0.85;

/**
 * Turkish-aware normalisation for comparing spoken text with written text.
 *
 * `toLowerCase()` alone is wrong here: in Turkish "I" lowercases to "ı" and "İ"
 * to "i", and the default mapping gets both backwards. A transcript that says
 * "Kırk" would then fail to match a text that says "KIRK" for a reason that has
 * nothing to do with how it was said.
 */
function normalizeForComparison(text) {
  return String(text || "")
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const normalized = normalizeForComparison(text);
  return normalized ? normalized.split(" ") : [];
}

/**
 * Word-level similarity, 0..1, via the longest common subsequence.
 *
 * LCS rather than a set intersection because order matters in a tongue twister:
 * "kartal kalkar dal sarkar" and "dal kalkar kartal sarkar" use identical words
 * and are not the same performance. LCS also degrades gracefully — a single
 * swallowed word costs one match, not the alignment of everything after it.
 */
function sequenceSimilarity(expected, actual) {
  const a = tokenize(expected);
  const b = tokenize(actual);

  if (a.length === 0) {
    return null;
  }
  if (b.length === 0) {
    return 0;
  }

  // Rolling two-row LCS: the full table for a long passage would be needlessly
  // large, and only the previous row is ever read.
  let previous = new Array(b.length + 1).fill(0);
  let current = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = a[i - 1] === b[j - 1] ? previous[j - 1] + 1 : Math.max(previous[j], current[j - 1]);
    }
    const swap = previous;
    previous = current;
    current = swap;
    current.fill(0);
  }

  const matched = previous[b.length];
  // Divided by the longer side, so padding the reading with extra words cannot
  // raise the score.
  return matched / Math.max(a.length, b.length);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Scores one drill.
 *
 * `measured` is the ffmpeg result and may be null or unreliable; the tempo
 * drill needs it and says so plainly rather than guessing when it is missing.
 */
function evaluateDrill({
  kind,
  targetText = "",
  targetWordsPerMinute = null,
  transcript = "",
  fillerSoundCount = 0,
  fillerWordCount = 0,
  measured = null
}) {
  const usable = measured && measured.reliable ? measured : null;
  const textAccuracy = targetText ? sequenceSimilarity(targetText, transcript) : null;

  if (kind === "tempo") {
    return evaluateTempo({ targetWordsPerMinute, textAccuracy, usable });
  }

  if (kind === "tekerleme") {
    return evaluateTwister({ textAccuracy, usable });
  }

  return evaluateFillerBan({ fillerSoundCount, fillerWordCount, usable });
}

function evaluateTempo({ targetWordsPerMinute, textAccuracy, usable }) {
  const target = Number(targetWordsPerMinute);
  const actual = usable?.wordsPerMinute ?? null;

  if (!usable || actual === null || !Number.isFinite(target) || target <= 0) {
    return {
      passed: false,
      undecided: true,
      headline: "Hız ölçülemedi",
      facts: ["Kayıttan konuşma hızı çıkarılamadı."],
      textAccuracy
    };
  }

  const drift = (actual - target) / target;
  const passed = Math.abs(drift) <= TEMPO_TOLERANCE;
  const direction = drift > 0 ? "hızlı" : "yavaş";
  const offBy = Math.abs(Math.round(actual - target));

  // A reading that hit the pace by skipping words is not a hit, so accuracy
  // gates the pass rather than merely being reported next to it.
  const readEverything = textAccuracy === null || textAccuracy >= 0.75;

  return {
    passed: passed && readEverything,
    undecided: false,
    headline: passed && readEverything ? "Tempo tutturuldu" : `${offBy} kelime/dk ${direction}`,
    facts: [
      `Hedef ${target}, ölçülen ${Math.round(actual)} kelime/dk.`,
      usable.articulationWordsPerMinute
        ? `Duraklamalar hariç ${Math.round(usable.articulationWordsPerMinute)} kelime/dk.`
        : "",
      textAccuracy !== null ? `Metne bağlılık %${Math.round(textAccuracy * 100)}.` : "",
      !readEverything ? "Metnin bir kısmı atlanmış; hız bu yüzden yanıltıcı." : ""
    ].filter(Boolean),
    textAccuracy
  };
}

function evaluateTwister({ textAccuracy, usable }) {
  if (textAccuracy === null) {
    return {
      passed: false,
      undecided: true,
      headline: "Karşılaştırılamadı",
      facts: ["Tekerleme metni gönderilmedi."],
      textAccuracy
    };
  }

  const passed = textAccuracy >= TWISTER_PASS_ACCURACY;
  return {
    passed,
    undecided: false,
    headline: passed ? "Heceler yerinde" : `Metne bağlılık %${Math.round(textAccuracy * 100)}`,
    facts: [
      `Söylenenler yazılanla %${Math.round(textAccuracy * 100)} örtüşüyor (geçme sınırı %${Math.round(
        TWISTER_PASS_ACCURACY * 100
      )}).`,
      usable?.articulationWordsPerMinute
        ? `Duraklamalar hariç hız ${Math.round(usable.articulationWordsPerMinute)} kelime/dk.`
        : "",
      // A mismatch is ambiguous by nature and saying so is more useful than
      // picking one explanation: the recogniser and the mouth both get a vote.
      passed ? "" : "Düşük örtüşme ya yutulan hece ya da atlanan kelime demektir; kaydı dinleyip hangisi olduğuna bak."
    ].filter(Boolean),
    textAccuracy
  };
}

function evaluateFillerBan({ fillerSoundCount, fillerWordCount, usable }) {
  const sounds = Number(fillerSoundCount) || 0;
  const words = Number(fillerWordCount) || 0;
  const passed = sounds === 0;

  return {
    passed,
    undecided: false,
    headline: passed ? "Temiz geçti" : `${sounds} dolgu sesi`,
    facts: [
      passed ? "Hiç dolgu sesi duyulmadı." : `${sounds} kez dolgu sesi çıkardın.`,
      words > 0 ? `Ayrıca ${words} dolgu kelimesi ("yani", "şey" gibi).` : "",
      // The point of the drill is replacing the sound with silence, so silence
      // is evidence of success rather than something to apologise for.
      usable && usable.pauseCount > 0
        ? `${usable.pauseCount} kez durakladın (en uzunu ${usable.longestPauseSeconds.toFixed(
            1
          )} sn) — bu egzersizde duraklama iyi işarettir.`
        : ""
    ].filter(Boolean),
    textAccuracy: null
  };
}

/**
 * Builds the metrics block stored with the record.
 *
 * Mirrors the rhetoric rule: waveform figures replace the model's, filler
 * counts never do.
 */
function buildDrillMetrics({ fillerSoundCount, fillerWordCount, measured, textAccuracy }) {
  const usable = measured && measured.reliable ? measured : null;

  return {
    fillerSoundCount: Number(fillerSoundCount) || 0,
    fillerWordCount: Number(fillerWordCount) || 0,
    wordsPerMinute: usable?.wordsPerMinute ?? null,
    articulationWordsPerMinute: usable?.articulationWordsPerMinute ?? null,
    pauseCount: usable?.pauseCount ?? 0,
    longestPauseSeconds: usable?.longestPauseSeconds ?? 0,
    textAccuracy: textAccuracy === null || textAccuracy === undefined ? null : round(textAccuracy, 3),
    metricsSource: usable ? "measured" : "model"
  };
}

module.exports = {
  evaluateDrill,
  buildDrillMetrics,
  sequenceSimilarity,
  normalizeForComparison,
  TEMPO_TOLERANCE,
  TWISTER_PASS_ACCURACY
};
