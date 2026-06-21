const wordFrequencySchema = {
  type: "object",
  additionalProperties: false,
  required: ["word", "count"],
  properties: {
    word: { type: "string" },
    count: { type: "number" }
  }
};

const errorPatternSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "category",
    "label",
    "explanationTR",
    "exampleOriginal",
    "exampleCorrected",
    "severity",
    "isTurkishTransferError"
  ],
  properties: {
    id: { type: "string" },
    category: {
      type: "string",
      enum: [
        "grammar",
        "vocabulary",
        "fluency",
        "pronunciation",
        "coherence",
        "naturalness",
        "turkish-transfer",
        "other"
      ]
    },
    label: { type: "string" },
    explanationTR: { type: "string" },
    exampleOriginal: { type: "string" },
    exampleCorrected: { type: "string" },
    severity: { type: "string", enum: ["low", "medium", "high"] },
    isTurkishTransferError: { type: "boolean" }
  }
};

const grammarFocusFeedbackSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "expectedGrammarUsed",
    "missedGrammarOpportunities",
    "tenseAccuracy",
    "betterSentenceAlternatives",
    "levelAppropriateSuggestions"
  ],
  properties: {
    expectedGrammarUsed: { type: "string" },
    missedGrammarOpportunities: { type: "array", items: { type: "string" } },
    tenseAccuracy: { type: "string" },
    betterSentenceAlternatives: { type: "array", items: { type: "string" } },
    levelAppropriateSuggestions: { type: "array", items: { type: "string" } }
  }
};

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
    "speakingAnalytics",
    "errorPatterns",
    "progressTags",
    "repeatedMistakeCandidates",
    "grammarFocusFeedback",
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
      required: ["grammar", "vocabulary", "fluency", "pronunciation", "coherence", "naturalness", "overall"],
      properties: {
        grammar: { type: "number" },
        vocabulary: { type: "number" },
        fluency: { type: "number" },
        pronunciation: { type: "number" },
        coherence: { type: "number" },
        naturalness: { type: "number" },
        overall: { type: "number" }
      }
    },
    speakingAnalytics: {
      type: "object",
      additionalProperties: false,
      required: [
        "estimatedCEFRLevel",
        "wordsPerMinute",
        "fillerWords",
        "repeatedWords",
        "averageSentenceLength",
        "transcriptWordCount",
        "responseDurationSeconds",
        "clarityNotesTR"
      ],
      properties: {
        estimatedCEFRLevel: { type: "string" },
        wordsPerMinute: { type: "number" },
        fillerWords: { type: "array", items: wordFrequencySchema },
        repeatedWords: { type: "array", items: wordFrequencySchema },
        averageSentenceLength: { type: "number" },
        transcriptWordCount: { type: "number" },
        responseDurationSeconds: { type: "number" },
        clarityNotesTR: { type: "string" }
      }
    },
    errorPatterns: {
      type: "array",
      items: errorPatternSchema
    },
    progressTags: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "interview",
          "daily-conversation",
          "erasmus",
          "business",
          "grammar",
          "fluency",
          "pronunciation",
          "vocabulary"
        ]
      }
    },
    repeatedMistakeCandidates: {
      type: "array",
      items: errorPatternSchema
    },
    grammarFocusFeedback: grammarFocusFeedbackSchema,
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
