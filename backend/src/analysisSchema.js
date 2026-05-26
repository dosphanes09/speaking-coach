const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "originalTranscript",
    "correctedVersion",
    "mistakes",
    "vocabularySuggestions",
    "connectorSuggestions",
    "sentenceStructureSuggestions",
    "speakingFeedback",
    "scores",
    "improvementPlan"
  ],
  properties: {
    originalTranscript: { type: "string" },
    correctedVersion: { type: "string" },
    mistakes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "originalSentence", "problem", "correctVersion", "explanation"],
        properties: {
          id: { type: "string" },
          originalSentence: { type: "string" },
          problem: { type: "string" },
          correctVersion: { type: "string" },
          explanation: { type: "string" }
        }
      }
    },
    vocabularySuggestions: { type: "array", items: { type: "string" } },
    connectorSuggestions: { type: "array", items: { type: "string" } },
    sentenceStructureSuggestions: { type: "array", items: { type: "string" } },
    speakingFeedback: {
      type: "object",
      additionalProperties: false,
      required: [
        "grammar",
        "vocabulary",
        "fluency",
        "coherence",
        "confidence",
        "repetitionProblems",
        "missingConnectors",
        "pronunciationNotes"
      ],
      properties: {
        grammar: { type: "string" },
        vocabulary: { type: "string" },
        fluency: { type: "string" },
        coherence: { type: "string" },
        confidence: { type: "string" },
        repetitionProblems: { type: "string" },
        missingConnectors: { type: "string" },
        pronunciationNotes: { type: "string" }
      }
    },
    scores: {
      type: "object",
      additionalProperties: false,
      required: ["grammar", "vocabulary", "fluency", "coherence", "overall"],
      properties: {
        grammar: { type: "number" },
        vocabulary: { type: "number" },
        fluency: { type: "number" },
        coherence: { type: "number" },
        overall: { type: "number" }
      }
    },
    improvementPlan: {
      type: "object",
      additionalProperties: false,
      required: ["whatWentWell", "topProblems", "tomorrowFocus", "sentencePatterns", "homework"],
      properties: {
        whatWentWell: { type: "string" },
        topProblems: { type: "array", items: { type: "string" } },
        tomorrowFocus: { type: "string" },
        sentencePatterns: { type: "array", items: { type: "string" } },
        homework: { type: "string" }
      }
    }
  }
};

module.exports = { analysisJsonSchema };
