/**
 * Response shape for a 60-second micro-drill.
 *
 * Small on purpose. The rhetoric schema carries a segmented transcript, six
 * scores and four feedback blocks because a five-minute speech deserves a
 * report; a drill deserves a verdict and one sentence. Anything longer would
 * not get read on the third rep of the day, which is the rep that matters.
 *
 * Note what is NOT here: pass/fail, tempo, and text accuracy. Those are
 * computed in `drillEvaluation.js` from the waveform and the expected text, so
 * the bar stays identical between runs. A model deciding whether today's rep
 * passed would make a daily streak meaningless.
 *
 * `fillerSoundCount` and `fillerWordCount` are only filled for the filler-ban
 * drill, the one kind where a model actually listens. For the reading drills
 * nothing listens for hesitation sounds, so they stay at zero and the app does
 * not show them — reporting an unheard zero as "no fillers" would be a lie.
 */

const drillJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["transcript", "fillerSoundCount", "fillerWordCount", "fillerMoments", "detail", "tip"],
  properties: {
    /** What was said, tidied only of transcription noise — never of hesitations. */
    transcript: { type: "string" },

    /** "ııı", "eee", "mmm". Zero unless a listening step actually ran. */
    fillerSoundCount: { type: "integer" },
    /** "yani", "şey", "hani" used as padding. Zero unless a listening step ran. */
    fillerWordCount: { type: "integer" },

    /**
     * Where each hesitation fell. The point of a drill is to notice a pattern —
     * that the "ııı" always arrives at the start of a sentence, say — and a
     * bare count cannot show that.
     */
    fillerMoments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "startSeconds"],
        properties: {
          text: { type: "string" },
          startSeconds: { type: "number" }
        }
      }
    },

    /** One or two sentences on what happened. Turkish. */
    detail: { type: "string" },
    /** One concrete change for the next rep. Not "daha akıcı ol". Turkish. */
    tip: { type: "string" }
  }
};

module.exports = { drillJsonSchema };
