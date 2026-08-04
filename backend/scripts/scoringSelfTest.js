const assert = require("node:assert/strict");
const {
  calibrateAnalysisScores,
  analyzeTranscriptShape,
  computeTaskCompletionScore,
  getShortAnswerCap,
  computeFillerRepetitionDensity,
  capForFillerRepetitionDensity,
  capForTargetStructureUsage,
  capForTopicRelevance,
  buildFillerRepetitionExercise
} = require("../src/scoringCalibrator");

function buildAnalysis(overrides = {}) {
  const transcript = overrides.transcript !== undefined ? overrides.transcript : "I like English.";
  return {
    originalTranscript: transcript,
    correctedVersion: transcript,
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

function testEmptyTranscriptDoesNotCrashAndScoresLow() {
  const calibrated = calibrateAnalysisScores(buildAnalysis({ transcript: "" }), {
    transcript: "",
    durationSeconds: 1,
    expectedDurationSeconds: 60
  });

  assert.ok(calibrated.scores.overall <= 45, `Empty transcript should still be capped low: ${calibrated.scores.overall}`);
  assert.equal(calibrated.speakingAnalytics.transcriptWordCount, 0);
}

function testGetShortAnswerCapTiersIncreaseWithWordCount() {
  const tiny = getShortAnswerCap(analyzeTranscriptShape("One two three.", 5, 60));
  const short = getShortAnswerCap(analyzeTranscriptShape(Array(20).fill("word").join(" ") + ".", 20, 60));
  const longer = getShortAnswerCap(analyzeTranscriptShape(Array(40).fill("word").join(" ") + ".", 40, 60));

  assert.ok(tiny < short, `Cap should increase as word count grows: tiny=${tiny}, short=${short}`);
  assert.ok(short <= longer, `Cap should not decrease as word count keeps growing: short=${short}, longer=${longer}`);
}

function testComputeTaskCompletionScoreRewardsUsingAvailableTime() {
  const barelyUsedTime = analyzeTranscriptShape("A short answer.", 5, 60);
  const fullyUsedTime = analyzeTranscriptShape(
    Array(70).fill("word").join(" ") + ". " + Array(20).fill("more").join(" ") + ".",
    58,
    60
  );

  const lowScore = computeTaskCompletionScore(barelyUsedTime);
  const highScore = computeTaskCompletionScore(fullyUsedTime);

  assert.ok(highScore > lowScore, `Using more of the available time and words should score higher: low=${lowScore}, high=${highScore}`);
}

const DEVELOPED_TRANSCRIPT = [
  "I think learning English is important because it gives me more confidence at work.",
  "For example, I can explain my ideas in meetings and understand international videos.",
  "Sometimes I still make grammar mistakes, but I try to speak longer and organize my answer.",
  "First I give my opinion, then I add a reason, and finally I finish with an example.",
  "This helps me sound clearer and more natural."
].join(" ");

function testHighFillerRepetitionDensityCapsFluencyAndNaturalness() {
  const analysis = buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT });
  // ~68 words in DEVELOPED_TRANSCRIPT; push filler/repeated counts well past the 25% threshold.
  analysis.speakingAnalytics.fillerWords = [{ word: "like", count: 10 }, { word: "um", count: 8 }];
  analysis.speakingAnalytics.repeatedWords = [{ word: "think", count: 5 }];

  const calibrated = calibrateAnalysisScores(analysis, {
    transcript: DEVELOPED_TRANSCRIPT,
    durationSeconds: 55,
    expectedDurationSeconds: 60
  });

  assert.ok(calibrated.scores.fluency <= 60, `Fluency should be capped by filler/repetition density: ${calibrated.scores.fluency}`);
  assert.ok(calibrated.scores.naturalness <= 60, `Naturalness should be capped by filler/repetition density: ${calibrated.scores.naturalness}`);
  assert.match(calibrated.speakingFeedback.repetitionProblems, /filler words or repeated words/i);
  assert.ok(
    calibrated.improvementPlan.topProblems.some((problem) => /filler words or repeated words/i.test(problem)),
    "Should surface the filler/repetition issue as a top problem."
  );
}

function testLowFillerRepetitionDensityDoesNotCap() {
  const analysis = buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT });
  analysis.speakingAnalytics.fillerWords = [{ word: "um", count: 1 }];
  analysis.speakingAnalytics.repeatedWords = [];

  const calibrated = calibrateAnalysisScores(analysis, {
    transcript: DEVELOPED_TRANSCRIPT,
    durationSeconds: 55,
    expectedDurationSeconds: 60
  });

  assert.equal(calibrated.scores.fluency, 93, "A single filler word should not trigger the density cap.");
  assert.equal(calibrated.scores.naturalness, 92, "A single filler word should not trigger the density cap.");
}

function testComputeFillerRepetitionDensityAndCapThresholds() {
  assert.equal(computeFillerRepetitionDensity(null, 50), 0, "No speakingAnalytics should mean zero density.");
  assert.equal(computeFillerRepetitionDensity({ fillerWords: [], repeatedWords: [] }, 0), 0, "Zero word count should not divide by zero.");

  const density = computeFillerRepetitionDensity(
    { fillerWords: [{ word: "um", count: 5 }], repeatedWords: [{ word: "like", count: 5 }] },
    40
  );
  assert.equal(density, 0.25, "Density should be (fillerCount + repeatedCount) / wordCount.");

  assert.equal(capForFillerRepetitionDensity(0.3), 60);
  assert.equal(capForFillerRepetitionDensity(0.2), 75);
  assert.equal(capForFillerRepetitionDensity(0.05), 100);
}

function testTargetStructureNotUsedCapsGrammar() {
  const analysis = buildAnalysis({ transcript: "I like English." });
  analysis.grammarFocusFeedback.targetStructureUsage = "not_used";

  const calibrated = calibrateAnalysisScores(analysis, {
    transcript: "I like English.",
    durationSeconds: 4,
    expectedDurationSeconds: 60
  });

  assert.ok(calibrated.scores.grammar <= 70, `Grammar should be capped when the target structure was not used: ${calibrated.scores.grammar}`);
  assert.match(calibrated.speakingFeedback.grammar, /targeted by this practice was not used/i);
}

function testTargetStructureUsedWithErrorsCapsGrammar() {
  const analysis = buildAnalysis({ transcript: "I like English." });
  analysis.grammarFocusFeedback.targetStructureUsage = "used_with_errors";

  const calibrated = calibrateAnalysisScores(analysis, {
    transcript: "I like English.",
    durationSeconds: 4,
    expectedDurationSeconds: 60
  });

  assert.ok(calibrated.scores.grammar <= 82, `Grammar should be capped when the target structure was used with errors: ${calibrated.scores.grammar}`);
}

function testTargetStructureNotApplicableOrCorrectDoesNotCapGrammar() {
  const notApplicable = buildAnalysis({ transcript: "I like English." });
  notApplicable.grammarFocusFeedback.targetStructureUsage = "not_applicable";
  const calibratedNotApplicable = calibrateAnalysisScores(notApplicable, {
    transcript: "I like English.",
    durationSeconds: 4,
    expectedDurationSeconds: 60
  });
  assert.equal(calibratedNotApplicable.scores.grammar, 96, "No grammar focus was targeted, so grammar should not be capped.");

  const usedCorrectly = buildAnalysis({ transcript: "I like English." });
  usedCorrectly.grammarFocusFeedback.targetStructureUsage = "used_correctly";
  const calibratedUsedCorrectly = calibrateAnalysisScores(usedCorrectly, {
    transcript: "I like English.",
    durationSeconds: 4,
    expectedDurationSeconds: 60
  });
  assert.equal(calibratedUsedCorrectly.scores.grammar, 96, "Correct target structure use should not cap grammar.");

  assert.equal(capForTargetStructureUsage(undefined), 100, "Missing/older records without this field must not be penalized.");
}

testShortAnswerIsCapped();
testDevelopedAnswerCanScoreHigh();
testEmptyTranscriptDoesNotCrashAndScoresLow();
testGetShortAnswerCapTiersIncreaseWithWordCount();
testComputeTaskCompletionScoreRewardsUsingAvailableTime();
testHighFillerRepetitionDensityCapsFluencyAndNaturalness();
testLowFillerRepetitionDensityDoesNotCap();
testComputeFillerRepetitionDensityAndCapThresholds();
testTargetStructureNotUsedCapsGrammar();
testTargetStructureUsedWithErrorsCapsGrammar();
testTargetStructureNotApplicableOrCorrectDoesNotCapGrammar();

function testPronunciationAffectsOverallOnlyWhenAudioGrounded() {
  const lowPronunciation = buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT });
  lowPronunciation.scores.pronunciation = 40;
  const highPronunciation = buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT });
  highPronunciation.scores.pronunciation = 95;

  const callOptions = {
    transcript: DEVELOPED_TRANSCRIPT,
    durationSeconds: 55,
    expectedDurationSeconds: 60
  };

  const lowNotGrounded = calibrateAnalysisScores(lowPronunciation, callOptions);
  const highNotGrounded = calibrateAnalysisScores(highPronunciation, callOptions);
  assert.equal(
    lowNotGrounded.scores.overall,
    highNotGrounded.scores.overall,
    "Without pronunciationIsAudioGrounded, pronunciation must not affect overall at all (unchanged legacy behavior)."
  );

  const lowGrounded = calibrateAnalysisScores(lowPronunciation, { ...callOptions, pronunciationIsAudioGrounded: true });
  const highGrounded = calibrateAnalysisScores(highPronunciation, { ...callOptions, pronunciationIsAudioGrounded: true });
  assert.ok(
    highGrounded.scores.overall > lowGrounded.scores.overall,
    `When audio-grounded, a higher pronunciation score should raise overall: low=${lowGrounded.scores.overall}, high=${highGrounded.scores.overall}`
  );
}

function testPronunciationNotesExplainWhetherItCountsTowardOverall() {
  const grounded = calibrateAnalysisScores(buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT }), {
    transcript: DEVELOPED_TRANSCRIPT,
    durationSeconds: 55,
    expectedDurationSeconds: 60,
    pronunciationIsAudioGrounded: true
  });
  assert.match(grounded.speakingFeedback.pronunciationNotes, /now also counts toward your overall score/i);

  const notGrounded = calibrateAnalysisScores(buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT }), {
    transcript: DEVELOPED_TRANSCRIPT,
    durationSeconds: 55,
    expectedDurationSeconds: 60
  });
  assert.match(notGrounded.speakingFeedback.pronunciationNotes, /does not count toward your overall score yet/i);
}

testPronunciationAffectsOverallOnlyWhenAudioGrounded();
testPronunciationNotesExplainWhetherItCountsTowardOverall();

function testOffTopicAnswerCapsOverallAndAddsFeedback() {
  const analysis = buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT });
  analysis.topicRelevance = { addressedTopic: "off_topic", explanation: "Talked about a different subject entirely." };
  const callOptions = { transcript: DEVELOPED_TRANSCRIPT, durationSeconds: 55, expectedDurationSeconds: 60 };

  const calibrated = calibrateAnalysisScores(analysis, callOptions);
  const baseline = calibrateAnalysisScores(buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT }), callOptions);

  assert.ok(
    calibrated.scores.overall < baseline.scores.overall,
    `Off-topic answers should score lower than an otherwise-identical on-topic answer: off-topic=${calibrated.scores.overall}, baseline=${baseline.scores.overall}`
  );
  assert.match(calibrated.speakingFeedback.coherence, /did not really address the given topic/i);
  assert.ok(
    calibrated.improvementPlan.topProblems.some((problem) => /did not fully address the given topic/i.test(problem)),
    "Should surface the topic-relevance issue as a top problem."
  );
}

function testPartiallyRelevantAnswerCapsOverallLessThanOffTopic() {
  const offTopic = buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT });
  offTopic.topicRelevance = { addressedTopic: "off_topic", explanation: "" };
  const partiallyRelevant = buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT });
  partiallyRelevant.topicRelevance = { addressedTopic: "partially_relevant", explanation: "" };

  const callOptions = { transcript: DEVELOPED_TRANSCRIPT, durationSeconds: 55, expectedDurationSeconds: 60 };
  const offTopicCalibrated = calibrateAnalysisScores(offTopic, callOptions);
  const partiallyRelevantCalibrated = calibrateAnalysisScores(partiallyRelevant, callOptions);

  assert.ok(
    partiallyRelevantCalibrated.scores.overall >= offTopicCalibrated.scores.overall,
    `Partially relevant should not score below fully off-topic: partial=${partiallyRelevantCalibrated.scores.overall}, off=${offTopicCalibrated.scores.overall}`
  );
}

function testFullyRelevantOrMissingTopicRelevanceDoesNotCap() {
  const noField = buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT });
  const calibratedNoField = calibrateAnalysisScores(noField, {
    transcript: DEVELOPED_TRANSCRIPT,
    durationSeconds: 55,
    expectedDurationSeconds: 60
  });

  const fullyRelevant = buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT });
  fullyRelevant.topicRelevance = { addressedTopic: "fully_relevant", explanation: "Directly answered the prompt." };
  const calibratedFullyRelevant = calibrateAnalysisScores(fullyRelevant, {
    transcript: DEVELOPED_TRANSCRIPT,
    durationSeconds: 55,
    expectedDurationSeconds: 60
  });

  assert.equal(
    calibratedNoField.scores.overall,
    calibratedFullyRelevant.scores.overall,
    "Missing topicRelevance (older records) must score the same as an explicit fully_relevant value."
  );
  assert.equal(capForTopicRelevance(undefined), 100, "Missing/older records without this field must not be penalized.");
  assert.equal(capForTopicRelevance("fully_relevant"), 100);
  assert.equal(capForTopicRelevance("off_topic"), 40);
  assert.equal(capForTopicRelevance("partially_relevant"), 70);
}

function testFillerRepetitionExerciseNamesActualWordsAndIsAddedToHomework() {
  const analysis = buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT });
  analysis.speakingAnalytics.fillerWords = [{ word: "like", count: 10 }, { word: "um", count: 8 }];
  analysis.speakingAnalytics.repeatedWords = [{ word: "think", count: 5 }];

  const calibrated = calibrateAnalysisScores(analysis, {
    transcript: DEVELOPED_TRANSCRIPT,
    durationSeconds: 55,
    expectedDurationSeconds: 60
  });

  assert.match(calibrated.improvementPlan.homework, /extra drill/i);
  assert.match(calibrated.improvementPlan.homework, /"like"/);

  const direct = buildFillerRepetitionExercise({
    fillerWords: [{ word: "like", count: 10 }],
    repeatedWords: []
  });
  assert.match(direct, /"like"/);

  const noWords = buildFillerRepetitionExercise(null);
  assert.match(noWords, /your most repeated word/i);
}

function testLowFillerRepetitionDensityDoesNotAddExerciseToHomework() {
  const analysis = buildAnalysis({ transcript: DEVELOPED_TRANSCRIPT });
  analysis.speakingAnalytics.fillerWords = [{ word: "um", count: 1 }];
  analysis.speakingAnalytics.repeatedWords = [];

  const calibrated = calibrateAnalysisScores(analysis, {
    transcript: DEVELOPED_TRANSCRIPT,
    durationSeconds: 55,
    expectedDurationSeconds: 60
  });

  assert.doesNotMatch(calibrated.improvementPlan.homework, /extra drill/i);
}

testOffTopicAnswerCapsOverallAndAddsFeedback();
testPartiallyRelevantAnswerCapsOverallLessThanOffTopic();
testFullyRelevantOrMissingTopicRelevanceDoesNotCap();
testFillerRepetitionExerciseNamesActualWordsAndIsAddedToHomework();
testLowFillerRepetitionDensityDoesNotAddExerciseToHomework();

console.log(
  "Scoring self-test passed: short answers are capped, developed answers can still score high, filler/repetition density and targeted-grammar usage now affect scores, audio-grounded pronunciation affects overall only when flagged as such, off-topic answers are capped with a dedicated topic-relevance signal, filler/repetition now generates a concrete practice drill, and edge cases behave as expected."
);
