const wordFrequencySchema = {
  type: "object",
  additionalProperties: false,
  required: ["word", "count"],
  properties: {
    word: { type: "string" },
    count: { type: "number" }
  }
};

const errorCategoryEnum = [
  "grammar",
  "vocabulary",
  "fluency",
  "pronunciation",
  "coherence",
  "naturalness",
  "turkish-transfer",
  "other"
];

const errorSeverityEnum = ["low", "medium", "high"];

const topicRelevanceEnum = ["off_topic", "partially_relevant", "fully_relevant"];

// Independent, structured judgment of whether the learner actually addressed the assigned
// topic/prompt, instead of folding "content & relevance" into coherence/naturalness scores
// with no dedicated check of on-topic-ness at all.
const topicRelevanceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["addressedTopic", "explanation"],
  properties: {
    addressedTopic: { type: "string", enum: topicRelevanceEnum },
    explanation: { type: "string" }
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
    category: { type: "string", enum: errorCategoryEnum },
    label: { type: "string" },
    explanationTR: { type: "string" },
    exampleOriginal: { type: "string" },
    exampleCorrected: { type: "string" },
    severity: { type: "string", enum: errorSeverityEnum },
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
    "levelAppropriateSuggestions",
    "targetStructureUsage"
  ],
  properties: {
    expectedGrammarUsed: { type: "string" },
    missedGrammarOpportunities: { type: "array", items: { type: "string" } },
    tenseAccuracy: { type: "string" },
    betterSentenceAlternatives: { type: "array", items: { type: "string" } },
    levelAppropriateSuggestions: { type: "array", items: { type: "string" } },
    // Structured signal for whether the learner actually used the targeted grammar
    // structure, so scoring can react to it directly instead of parsing free text.
    // "not_applicable" must be used whenever no grammar focus was given for this attempt.
    targetStructureUsage: {
      type: "string",
      enum: ["not_applicable", "not_used", "used_with_errors", "used_correctly"]
    }
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
    "improvementPlan",
    "topicRelevance"
  ],
  properties: {
    originalTranscript: { type: "string" },
    correctedVersion: { type: "string" },
    mistakes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "originalSentence",
          "problem",
          "correctVersion",
          "explanation",
          "category",
          "severity",
          "isTurkishTransferError"
        ],
        properties: {
          id: { type: "string" },
          originalSentence: { type: "string" },
          problem: { type: "string" },
          correctVersion: { type: "string" },
          explanation: { type: "string" },
          // Same classification vocabulary as errorPatterns, filled in directly by you here
          // so the Grammar Corrections list and the recurring-pattern grouping always agree
          // (the app derives error patterns mechanically from these fields).
          category: { type: "string", enum: errorCategoryEnum },
          severity: { type: "string", enum: errorSeverityEnum },
          isTurkishTransferError: { type: "boolean" }
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
    topicRelevance: topicRelevanceSchema,
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
