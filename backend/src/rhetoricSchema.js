/**
 * Response shape for the Turkish rhetoric ("hitabet") analysis.
 *
 * This is deliberately NOT the English speaking schema. That one measures
 * language accuracy — grammar mistakes, vocabulary suggestions, CEFR level.
 * Here the speaker is a native Turkish speaker, so language correctness is not
 * the point; the point is whether the speech lands: is it structured, is it
 * fluent, does it hold attention.
 *
 * Two kinds of output live side by side, and the difference matters:
 *
 *   scores  — the model's judgement. Useful, but it can drift between runs.
 *   metrics — counts and rates. The same speech always produces the same
 *             numbers, so these are what progress is actually tracked on.
 *
 * `segments` is what lets feedback point at a moment rather than describe one:
 * the app renders them as the marked-up transcript, and `startSeconds` makes
 * each mark clickable so the recording jumps there.
 *
 * OpenAI structured outputs run in strict mode, which requires every object to
 * set `additionalProperties: false` and to list every property in `required`.
 * Fields that may legitimately be empty use "" or [] rather than being omitted.
 */

const segmentKinds = [
  "speech", // ordinary delivery, nothing to flag
  "filler_sound", // "ııı", "eee", "mmm" — audible hesitation with no meaning
  "filler_word", // "yani", "şey", "hani", "işte" used as padding
  "long_pause", // silence long enough to read as a stall, not a beat
  "repetition", // the same word or phrase leaned on repeatedly
  "strong_moment" // a genuinely effective passage worth noticing
];

const feedbackPointSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "detail", "quote", "action"],
  properties: {
    title: { type: "string" },
    detail: { type: "string" },
    /** Quoted from the speech itself. "" only when no quote fits. */
    quote: { type: "string" },
    /** What to do differently next time. "" for strengths. */
    action: { type: "string" }
  }
};

const rhetoricJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "transcript",
    "segments",
    "scores",
    "metrics",
    "strengths",
    "improvements",
    "structureFeedback",
    "deliveryFeedback",
    "preparationFeedback",
    "timeManagement",
    "conceptAccuracy",
    "nextSessionFocus",
    "summary"
  ],
  properties: {
    /**
     * The model's own transcript of what it heard. The audio is the source of
     * truth, so this can differ from (and be better than) the separate
     * transcription pass — it keeps the hesitations a transcriber cleans away.
     */
    transcript: { type: "string" },

    segments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "kind", "startSeconds", "note"],
        properties: {
          text: { type: "string" },
          kind: { type: "string", enum: segmentKinds },
          /** Seconds from the start of the recording. */
          startSeconds: { type: "number" },
          /** Short Turkish explanation. "" for plain speech segments. */
          note: { type: "string" }
        }
      }
    },

    scores: {
      type: "object",
      additionalProperties: false,
      required: ["content", "structure", "fluency", "language", "impact", "voice", "overall"],
      properties: {
        /** İçerik ve argüman: is the claim clear, reasoned, exemplified. */
        content: { type: "integer" },
        /** Yapı ve akış: opening, ordering, transitions, closing. */
        structure: { type: "integer" },
        /** Akıcılık ve tempo: hesitation, stalling, rhythm. */
        fluency: { type: "integer" },
        /** Dil ve üslup: word range, sentence construction, clichés. */
        language: { type: "integer" },
        /** Etki ve anlatıcılık: story, imagery, holding attention. */
        impact: { type: "integer" },
        /** Ses kullanımı: intonation, emphasis, monotony — audible only. */
        voice: { type: "integer" },
        overall: { type: "integer" }
      }
    },

    metrics: {
      type: "object",
      additionalProperties: false,
      required: [
        "wordsPerMinute",
        "fillerWordCount",
        "fillerSoundCount",
        "pauseCount",
        "longestPauseSeconds",
        "silenceRatio",
        "uniqueWordRatio",
        "averageSentenceWords",
        "topFillers"
      ],
      properties: {
        wordsPerMinute: { type: "number" },
        /** "yani", "şey", "hani" ... counted only where they add nothing. */
        fillerWordCount: { type: "integer" },
        /** "ııı", "eee", "mmm" — heard, never read from a transcript. */
        fillerSoundCount: { type: "integer" },
        /** Silences long enough to register as a stop (roughly 0.8s+). */
        pauseCount: { type: "integer" },
        longestPauseSeconds: { type: "number" },
        /** Silent share of the whole recording, 0..1. */
        silenceRatio: { type: "number" },
        /** Distinct words / total words, 0..1. Vocabulary range. */
        uniqueWordRatio: { type: "number" },
        averageSentenceWords: { type: "number" },
        /** The specific crutches, most frequent first. */
        topFillers: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["text", "count"],
            properties: {
              text: { type: "string" },
              count: { type: "integer" }
            }
          }
        }
      }
    },

    strengths: { type: "array", items: feedbackPointSchema },
    improvements: { type: "array", items: feedbackPointSchema },

    structureFeedback: {
      type: "object",
      additionalProperties: false,
      required: ["opening", "body", "closing", "transitions"],
      properties: {
        opening: { type: "string" },
        body: { type: "string" },
        closing: { type: "string" },
        transitions: { type: "string" }
      }
    },

    deliveryFeedback: {
      type: "object",
      additionalProperties: false,
      required: ["pace", "intonation", "articulation", "energy"],
      properties: {
        /** Hız: too fast to follow, too slow to hold attention. */
        pace: { type: "string" },
        /** Tonlama: monotone vs varied. */
        intonation: { type: "string" },
        /** Diksiyon: swallowed syllables, mushy endings. NOT accent. */
        articulation: { type: "string" },
        /** Enerji: conviction, presence. */
        energy: { type: "string" }
      }
    },

    /**
     * Only meaningful when the speaker's preparation notes were sent. Without
     * them the arrays are empty and `comment` says notes were not provided.
     */
    preparationFeedback: {
      type: "object",
      additionalProperties: false,
      required: ["coveredPoints", "missedPoints", "improvisedPoints", "comment"],
      properties: {
        coveredPoints: { type: "array", items: { type: "string" } },
        missedPoints: { type: "array", items: { type: "string" } },
        /** Said well but absent from the notes — often the best material. */
        improvisedPoints: { type: "array", items: { type: "string" } },
        comment: { type: "string" }
      }
    },

    timeManagement: {
      type: "object",
      additionalProperties: false,
      required: ["targetSeconds", "actualSeconds", "comment"],
      properties: {
        targetSeconds: { type: "integer" },
        actualSeconds: { type: "integer" },
        comment: { type: "string" }
      }
    },

    /**
     * Did the speaker actually understand what they researched?
     *
     * Every other field in this schema judges delivery. This one judges the
     * substance, and it is the only part of the report that can tell a
     * confident speaker who understood the concept apart from a confident
     * speaker who did not — which is precisely what fifteen minutes of
     * research is supposed to produce.
     *
     * Filled only when a reference definition was sent with the request. With
     * no reference the model has nothing to check against, so the verdict is
     * "dogru", the lists are empty and `comment` says so; inventing a
     * correction from memory would be exactly the failure mode this field
     * exists to catch.
     */
    conceptAccuracy: {
      type: "object",
      additionalProperties: false,
      required: ["verdict", "correctPoints", "missedPoints", "errors", "extraPoints", "comment"],
      properties: {
        verdict: { type: "string", enum: ["dogru", "kismen", "yanlis"] },
        /** Reference points the speaker genuinely explained. */
        correctPoints: { type: "array", items: { type: "string" } },
        /** Reference points never mentioned. Missing is not the same as wrong. */
        missedPoints: { type: "array", items: { type: "string" } },
        /** Statements that are factually wrong. Only real errors, never omissions. */
        errors: { type: "array", items: { type: "string" } },
        /** Correct material beyond the reference list — the reference is not exhaustive. */
        extraPoints: { type: "array", items: { type: "string" } },
        comment: { type: "string" }
      }
    },

    /** One to three concrete things to work on in the next session. */
    nextSessionFocus: { type: "array", items: { type: "string" } },

    summary: { type: "string" }
  }
};

module.exports = { rhetoricJsonSchema, segmentKinds };
