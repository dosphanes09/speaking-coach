const assert = require("node:assert/strict");
const { calibrateAnalysisScores } = require("../src/scoringCalibrator");

function buildAnalysis(overrides = {}) {
  return {
    originalTranscript: overrides.transcript || "I like English.",
    correctedVersion: overrides.transcript || "I like English.",
    mistakes: [],
    vocabularySuggestions: [],
    connectorSuggestions: [],
    sentenceStructureSuggestions: [],
    speakingFeedback: {
      grammar: "Grammar was accurate.",
      vocabulary: "Vocabulary was clear.",
      fluency: "Fluency was understandable.",
      coherence: "The answer was understandable.",
      confidence: "Good confidence.",
      repetitionProblems: "No major repetition.",
      missingConnectors: "Add more connectors.",
      pronunciationNotes: "Transcript-based only."
    },
    scores: {
      grammar: 96,
      vocabulary: 94,
      fluency: 93,
      pronunciation: 90,
      coherence: 94,
      naturalness: 92,
      overall: 95
    },
    speakingAnalytics: {
      estimatedCEFRLevel: "B1",
      wordsPerMinute: 0,
      fillerWords: [],
      repeatedWords: [],
      averageSentenceLength: 0,
      transcriptWordCount: 0,
      responseDurationSeconds: 0,
      clarityNotesTR: ""
    },
    errorPatterns: [],
    progressTags: [],
    repeatedMistakeCandidates: [],
    grammarFocusFeedback: {
      expectedGrammarUsed: "",
      missedGrammarOpportunities: [],
      tenseAccuracy: "",
      betterSentenceAlternatives: [],
      levelAppropriateSuggestions: []
    },
    improvementPlan: {
      whatWentWell: "Grammar was good.",
      topProblems: [],
      tomorrowFocus: "",
      sentencePatterns: [],
      homework: ""
    }
  };
}

function testShortAnswerIsCapped() {
  const transcript = "I like English.";
  const calibrated = calibrateAnalysisScores(buildAnalysis({ transcript }), {
    transcript,
    durationSeconds: 4,
    expectedDurationSeconds: 60
  });

  assert.equal(calibrated.scores.grammar, 96, "Accurate grammar can remain high.");
  assert.ok(calibrated.scores.overall <= 45, `Short answer overall was not capped: ${calibrated.scores.overall}`);
  assert.ok(calibrated.scores.vocabulary <= 45, "Vocabulary range should be capped for tiny answers.");
  assert.match(calibrated.speakingFeedback.fluency, /too short/i);
  assert.match(calibrated.improvementPlan.homework, /main answer, reason, example/i);
}

function testDevelopedAnswerCanScoreHigh() {
  const transcript = [
    "I think learning English is important because it gives me more confidence at work.",
    "For example, I can explain my ideas in meetings and understand international videos.",
    "Sometimes I still make grammar mistakes, but I try to speak longer and organize my answer.",
    "First I give my opinion, then I add a reason, and finally I finish with an example.",
    "This helps me sound clearer and more natural."
  ].join(" ");
  const calibrated = calibrateAnalysisScores(buildAnalysis({ transcript }), {
    transcript,
    durationSeconds: 55,
    expectedDurationSeconds: 60
  });

  assert.ok(calibrated.scores.overall >= 80, `Developed answer should remain high: ${calibrated.scores.overall}`);
  assert.ok(calibrated.speakingAnalytics.transcriptWordCount >= 60);
}

testShortAnswerIsCapped();
testDevelopedAnswerCanScoreHigh();

console.log("Scoring self-test passed: short answers are capped and developed answers can still score high.");
