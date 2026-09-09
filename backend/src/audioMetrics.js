/**
 * Deterministic speech measurements, taken from the waveform rather than from
 * a model's impression of it.
 *
 * Why this file exists
 * --------------------
 * Pause count, longest pause, silence ratio and speaking tempo used to come
 * back inside the model's JSON. That made them judgements: the same recording
 * could be "4 pauses" today and "6 pauses" tomorrow. The rhetoric progress
 * chart is built on exactly these numbers, so a drift between runs shows up as
 * an improvement the speaker never made — the one failure mode that makes a
 * progress chart worse than no chart at all.
 *
 * ffmpeg's `silencedetect` filter answers the same question from the samples.
 * Run it on the same file a hundred times and it returns the same boundaries a
 * hundred times. That is the whole point: measurements must be a fixed ruler,
 * even while the scores stay a judgement.
 *
 * What stays with the model: interpretation. "You stopped for 4.2 seconds at
 * 2:14, mid-sentence, and it read as a stall" is still the model's line — it
 * just no longer invents the 4.2.
 *
 * The binary is already here: ffmpeg-static ships with the backend and runs on
 * every request to produce the WAV. This adds no dependency and no token cost.
 */

const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

/**
 * A silence shorter than this is a breath or a beat between words, not a
 * pause worth reporting. Matches the threshold the prompts already describe
 * to the model, so the two never disagree about what counts.
 */
const MIN_PAUSE_SECONDS = 0.8;

/**
 * Where to put the silence threshold, relative to the file's own levels.
 *
 * A fixed dB threshold does not survive contact with real recordings: a laptop
 * microphone at arm's length and a headset at the lips differ by more than
 * 20 dB, and every real room has a noise floor — a fan, a fridge, traffic —
 * that a fixed threshold either sits above (and everything reads as speech) or
 * below (and everything reads as silence).
 *
 * Both anchors are needed and the lower one wins:
 *
 *   peak - 20 dB   guards against a recording that is mostly silence, where the
 *                  mean collapses and would drag the threshold into the noise.
 *   mean - 15 dB   guards against a recording with no quiet passages at all,
 *                  where the peak is a single clipped consonant and says
 *                  nothing about the speaking level.
 *
 * This was not a guess: a first version used peak - 35 dB alone and measured a
 * recording with a -52 dBFS noise floor as having no pauses whatsoever, because
 * that threshold landed underneath the room tone.
 */
const SILENCE_BELOW_PEAK_DB = 20;
const SILENCE_BELOW_MEAN_DB = 15;

/** Clamps for the adaptive threshold, so a pathological file cannot produce a
 *  nonsensical one (an all-silent file, or one clipped to 0 dB throughout). */
const MIN_NOISE_FLOOR_DB = -60;
const MAX_NOISE_FLOOR_DB = -18;

/**
 * The self-check that decides whether this measurement can be trusted at all.
 *
 * Amplitude cannot separate speech from noise when the two are close together:
 * a recording whose room tone sits only ~24 dB under the voice has no threshold
 * that finds the pauses without also eating the speech. That is physics, not a
 * bug, and the honest response is to say "not measured" rather than to report
 * a confident zero.
 *
 * The diagnostic: run the detector at a 0.1 s floor. Real speech is full of
 * gaps that short — between words, before plosives — so they normally cover
 * 15-25% of a recording. Finding almost none of them means the threshold is
 * sitting underneath the noise floor and everything reads as sound.
 *
 * An earlier version instead retried at a shifted threshold and kept whichever
 * answer looked tidier. That turned out to be actively harmful: a genuinely
 * pause-heavy recording (2 s of speech between 6 s silences) tripped the
 * "too much silence" rule, got retried at a threshold buried in the noise, and
 * came back reported as having no pauses at all. A measurement that quietly
 * replaces a correct answer with a wrong one is worse than no measurement.
 */
const RELIABILITY_PROBE_SECONDS = 0.1;
const MIN_MICRO_SILENCE_RATIO = 0.01;

function resolveFfmpegPath() {
  try {
    // eslint-disable-next-line global-require
    const ffmpegStaticPath = require("ffmpeg-static");
    if (ffmpegStaticPath) {
      return ffmpegStaticPath;
    }
  } catch {
    // Fall through to a system ffmpeg on PATH.
  }

  return "ffmpeg";
}

const FFMPEG_PATH = resolveFfmpegPath();

/**
 * ffmpeg writes filter output to stderr and exits non-zero on some builds even
 * when the analysis succeeded, so stderr is captured and returned rather than
 * treated as failure by itself.
 */
async function runFilter(filePath, filterSpec) {
  try {
    const { stderr } = await execFileAsync(
      FFMPEG_PATH,
      ["-hide_banner", "-nostats", "-i", filePath, "-af", filterSpec, "-f", "null", "-"],
      { maxBuffer: 8 * 1024 * 1024 }
    );
    return stderr || "";
  } catch (error) {
    if (typeof error?.stderr === "string" && error.stderr.length > 0) {
      return error.stderr;
    }
    throw error;
  }
}

/** Peak and average level in dBFS. Either can be absent on an odd input. */
function parseVolumeDb(stderr) {
  const max = /max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/.exec(stderr);
  const mean = /mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/.exec(stderr);
  return {
    maxDb: max ? Number(max[1]) : null,
    meanDb: mean ? Number(mean[1]) : null
  };
}

/**
 * The duration ffmpeg itself decoded, in seconds.
 *
 * This does double duty. It is more trustworthy than the duration the client
 * reports — a browser MediaRecorder blob routinely mis-reports its own length —
 * and its absence is the reliable signal that ffmpeg never opened a valid
 * input at all. Without that second use a missing or corrupt file came back
 * looking like a perfectly silent recording rather than a failed measurement.
 */
function parseDurationSeconds(stderr) {
  const match = /Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(stderr);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

/**
 * `silencedetect` prints one line when a silent run begins and another when it
 * ends. A run that is still open when the file ends gets no `silence_end`
 * line, which is why the trailing case is closed explicitly below.
 */
function parseSilenceRanges(stderr, totalSeconds) {
  const ranges = [];
  let openStart = null;

  const linePattern = /silence_(start|end):\s*(-?\d+(?:\.\d+)?)/g;
  let match = linePattern.exec(stderr);

  while (match) {
    const kind = match[1];
    const at = Number(match[2]);

    if (kind === "start") {
      openStart = Math.max(0, at);
    } else if (openStart !== null) {
      ranges.push({ startSeconds: openStart, endSeconds: Math.min(at, totalSeconds) });
      openStart = null;
    }

    match = linePattern.exec(stderr);
  }

  if (openStart !== null && totalSeconds > openStart) {
    ranges.push({ startSeconds: openStart, endSeconds: totalSeconds });
  }

  return ranges.filter((range) => range.endSeconds > range.startSeconds);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Measures a recording.
 *
 * `totalSeconds` is the duration the client reported. It is used only to close
 * a trailing silence and to bound the ratios; the boundaries themselves all
 * come from ffmpeg.
 *
 * Returns null rather than throwing when the measurement cannot be made. A
 * failed measurement must degrade to the model's estimate, never fail the
 * analysis the speaker just waited five minutes for.
 */
async function measureSpeechMetrics(filePath, { totalSeconds, transcript = "" } = {}) {
  if (!filePath) {
    return null;
  }

  let volumeStderr;
  try {
    volumeStderr = await runFilter(filePath, "volumedetect");
  } catch {
    return null;
  }

  // No decoded duration means ffmpeg never opened a valid input — a missing
  // file, a truncated upload, a container it cannot read. That has to come back
  // as "not measured", not as a silent recording.
  const decodedSeconds = parseDurationSeconds(volumeStderr);
  const reportedSeconds = Number(totalSeconds);
  const duration = decodedSeconds ?? (Number.isFinite(reportedSeconds) ? reportedSeconds : null);
  if (decodedSeconds === null || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  const { maxDb, meanDb } = parseVolumeDb(volumeStderr);
  const candidates = [];
  if (maxDb !== null) {
    candidates.push(maxDb - SILENCE_BELOW_PEAK_DB);
  }
  if (meanDb !== null) {
    candidates.push(meanDb - SILENCE_BELOW_MEAN_DB);
  }
  const firstThreshold = candidates.length
    ? clamp(Math.min(...candidates), MIN_NOISE_FLOOR_DB, MAX_NOISE_FLOOR_DB)
    : -30;

  // Can this threshold see silence at all? Asked before the real measurement,
  // because a "no pauses" answer means two very different things depending on
  // the reply, and the speaker deserves to be told which one they got.
  const microSilenceRatio = await probeMicroSilence(filePath, firstThreshold, duration);
  if (microSilenceRatio === null) {
    return null;
  }

  const result = await detectAt(filePath, firstThreshold, duration, transcript);
  if (!result) {
    return null;
  }

  return {
    ...result,
    microSilenceRatio: round(microSilenceRatio, 3),
    // The caller must check this. An unreliable measurement is not a measurement
    // and must not overwrite anything.
    reliable: microSilenceRatio >= MIN_MICRO_SILENCE_RATIO,
    unreliableReason:
      microSilenceRatio >= MIN_MICRO_SILENCE_RATIO
        ? ""
        : "Kayittaki arka plan gurultusu konusma seviyesine cok yakin; sessizlik esigi guvenilir sekilde yerlestirilemedi."
  };
}

/**
 * Total share of the recording covered by very short silences.
 *
 * Returns null when ffmpeg fails, so the caller can tell "could not measure"
 * apart from "measured, and found nothing".
 */
async function probeMicroSilence(filePath, noiseFloorDb, duration) {
  let stderr;
  try {
    stderr = await runFilter(
      filePath,
      `silencedetect=noise=${round(noiseFloorDb, 1)}dB:d=${RELIABILITY_PROBE_SECONDS}`
    );
  } catch {
    return null;
  }

  const total = parseSilenceRanges(stderr, duration).reduce(
    (sum, range) => sum + (range.endSeconds - range.startSeconds),
    0
  );

  return duration > 0 ? total / duration : 0;
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

/** One silencedetect pass, turned into the measurement object. */
async function detectAt(filePath, noiseFloorDb, duration, transcript) {
  let silenceStderr;
  try {
    silenceStderr = await runFilter(
      filePath,
      `silencedetect=noise=${round(noiseFloorDb, 1)}dB:d=${MIN_PAUSE_SECONDS}`
    );
  } catch {
    return null;
  }

  const silences = parseSilenceRanges(silenceStderr, duration);

  // Silence before the first word and after the last one is dead air around the
  // speech, not a pause inside it. Counting it would punish someone for taking a
  // breath before starting, and would wreck the silence ratio on a recording
  // that was stopped a few seconds late.
  const leading = silences.find((range) => range.startSeconds <= 0.35) ?? null;
  const trailing = silences.find((range) => range.endSeconds >= duration - 0.35) ?? null;

  const speechStart = leading ? leading.endSeconds : 0;
  const speechEnd = trailing ? trailing.startSeconds : duration;
  const speechSpanSeconds = Math.max(0, speechEnd - speechStart);

  const internalPauses = silences
    .filter((range) => range !== leading && range !== trailing)
    .filter((range) => range.startSeconds >= speechStart && range.endSeconds <= speechEnd)
    .map((range) => ({
      startSeconds: round(range.startSeconds),
      durationSeconds: round(range.endSeconds - range.startSeconds)
    }))
    .sort((a, b) => a.startSeconds - b.startSeconds);

  const pausedSeconds = internalPauses.reduce((total, pause) => total + pause.durationSeconds, 0);
  const voicedSeconds = Math.max(0, speechSpanSeconds - pausedSeconds);

  const wordCount = countWords(transcript);
  // Measured over the speech span, not the file length: a recording the speaker
  // stopped ten seconds late should not read as a slower delivery.
  const wordsPerMinute =
    wordCount > 0 && speechSpanSeconds > 0 ? round((wordCount / speechSpanSeconds) * 60, 1) : null;
  // How fast they talk while actually talking, with pauses removed. A fast
  // talker who pauses a lot and a slow talker who never stops can share a
  // wordsPerMinute; these two numbers tell them apart.
  const articulationWordsPerMinute =
    wordCount > 0 && voicedSeconds > 0 ? round((wordCount / voicedSeconds) * 60, 1) : null;

  return {
    source: "ffmpeg",
    noiseFloorDb: round(noiseFloorDb, 1),
    totalSeconds: round(duration),
    speechStartSeconds: round(speechStart),
    speechEndSeconds: round(speechEnd),
    speechSpanSeconds: round(speechSpanSeconds),
    voicedSeconds: round(voicedSeconds),
    pauseCount: internalPauses.length,
    longestPauseSeconds: internalPauses.reduce((longest, pause) => Math.max(longest, pause.durationSeconds), 0),
    silenceRatio: speechSpanSeconds > 0 ? round(pausedSeconds / speechSpanSeconds, 3) : 0,
    leadingSilenceSeconds: leading ? round(leading.endSeconds - leading.startSeconds) : 0,
    trailingSilenceSeconds: trailing ? round(trailing.endSeconds - trailing.startSeconds) : 0,
    wordCount,
    wordsPerMinute,
    articulationWordsPerMinute,
    pauses: internalPauses
  };
}

/**
 * Word count for the tempo figures.
 *
 * Turkish is agglutinative, so a "word" here is a whitespace-delimited token
 * with at least one letter — punctuation, standalone digits' separators and
 * the bracketed hesitation markers a transcript may carry are not words.
 */
function countWords(text) {
  return String(text || "")
    .replace(/\[[^\]]*\]/g, " ")
    .split(/\s+/)
    .filter((token) => /\p{L}/u.test(token)).length;
}

/** d:ss, matching the timestamps the prompts ask the model to use. */
function formatTimestamp(seconds) {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * Renders the measurements as the prompt block both model steps receive.
 *
 * The timestamps are the reason this is worth sending rather than just
 * overwriting the numbers afterwards: the marked transcript makes every pause
 * clickable, and a segment whose `startSeconds` the model guessed sends the
 * speaker to the wrong moment in their own recording.
 */
function describeMeasuredMetrics(metrics) {
  if (!metrics) {
    return "";
  }

  const pauseLines = metrics.pauses.length
    ? metrics.pauses
        .map((pause) => `  - ${formatTimestamp(pause.startSeconds)} — ${pause.durationSeconds.toFixed(1)} sn`)
        .join("\n")
    : "  - yok";

  return `ÖLÇÜLEN DEĞERLER (ses dalgasından, tahmin değil):

Bu sayılar ffmpeg ile kaydın kendisinden ölçüldü. Tartışmaya açık değiller.
Bunları OLDUĞU GİBİ kullan; kendi tahminini yazma.

  duraklama sayısı        : ${metrics.pauseCount}   (0.8 sn'den uzun, konuşma içi)
  en uzun duraklama       : ${metrics.longestPauseSeconds.toFixed(1)} sn
  sessizlik oranı         : %${Math.round(metrics.silenceRatio * 100)}
  konuşma hızı            : ${metrics.wordsPerMinute ?? "—"} kelime/dk
  duraklamalar hariç hız  : ${metrics.articulationWordsPerMinute ?? "—"} kelime/dk
  konuşulan süre          : ${metrics.speechSpanSeconds.toFixed(1)} sn

DURAKLAMALARIN TAM YERİ:
${pauseLines}

Bu listeyi iki iş için kullan:
  1. long_pause segmentlerinin startSeconds değerlerini buradan al. Kullanıcı
     bu sayıya tıklayıp kendi kaydında o ana atlıyor; uydurulmuş bir zaman
     damgası onu yanlış yere götürür.
  2. Duraklamanın nerede olduğunu yorumla — cümle arasında mı, cümle ortasında
     mı, vurgu için mi yoksa takılma mı. Yorum senin işin; sayı değil.

Not: Bu ölçüm sessizliği duyar, sesi tanımaz. "ııı" gibi dolgu sesleri
sessizlik DEĞİLDİR ve bu listede görünmezler — onları duyarak saymaya devam et.`;
}

/**
 * Replaces the model's estimates with the measured values.
 *
 * Only the four numbers ffmpeg can actually answer are touched. Filler sounds
 * and filler words are deliberately left alone: "ııı" is sound, not silence,
 * and no amount of amplitude analysis can find it — claiming otherwise here
 * would be the same mistake this whole module exists to undo, in the opposite
 * direction.
 *
 * An unreliable measurement changes nothing. Overwriting a model's rough guess
 * with a confident zero would be strictly worse than the guess.
 */
function applyMeasuredMetrics(modelMetrics, measured) {
  const base = modelMetrics && typeof modelMetrics === "object" ? modelMetrics : {};
  if (!measured || !measured.reliable) {
    return { ...base, metricsSource: "model" };
  }

  return {
    ...base,
    pauseCount: measured.pauseCount,
    longestPauseSeconds: measured.longestPauseSeconds,
    silenceRatio: measured.silenceRatio,
    // Only when there was a transcript to count; an empty one leaves the
    // model's figure rather than replacing it with zero.
    wordsPerMinute: measured.wordsPerMinute ?? base.wordsPerMinute,
    metricsSource: "measured"
  };
}

module.exports = {
  measureSpeechMetrics,
  describeMeasuredMetrics,
  applyMeasuredMetrics,
  countWords,
  MIN_PAUSE_SECONDS
};
