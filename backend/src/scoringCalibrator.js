const SCORE_KEYS = ["grammar", "vocabulary", "fluency", "pronunciation", "coherence", "naturalness", "overall"];

function countWords(transcript) {
  return (String(transcript || "").match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).length;
}

function countSentences(transcript, wordCount = countWords(transcript)) {
  const punctuationSentences = (String(transcript || "").match(/[.!?]+/g) || []).length;
  if (punctuationSentences > 0) {
    return punctuationSentences;
  }

  if (wordCount <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(wordCount / 14));
}

function clampScore(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function ratioToScore(value, target) {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }
  return clampScore((Math.min(1, value / target) * 100));
}

function analyzeTranscriptShape(transcript, durationSeconds, expectedDurationSeconds) {
  const wordCount = countWords(transcript);
  const sentenceCount = countSentences(transcript, wordCount);
  const averageSentenceLength = sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0;
  const expectedDuration = Math.max(Number(durationSeconds) || 1, Number(expectedDurationSeconds) || durationSeconds || 1);
  const targetSpeakingSeconds = Math.max(10, Math.round(expectedDuration * 0.75));
  const targetWords = Math.max(12, Math.round(expectedDuration * 1.25));
  const targetSentences = expectedDuration >= 55 ? 4 : expectedDuration >= 40 ? 3 : 2;

  return {
    wordCount,
    sentenceCount,
    averageSentenceLength,
    durationSeconds: Math.max(1, Number(durationSeconds) || 1),
    expectedDurationSeconds: expectedDuration,
    targetSpeakingSeconds,
    targetWords,
    targetSentences,
    wordsPerMinute: Math.round((wordCount / Math.max(1, Number(durationSeconds) || 1)) * 60)
  };
}

function getShortAnswerCap(stats) {
  let cap = 100;

  if (stats.wordCount < 8 || (stats.sentenceCount <= 1 && stats.wordCount < 12)) {
    cap = Math.min(cap, 45);
  } else if (stats.wordCount < 15 || stats.sentenceCount <= 1) {
    cap = Math.min(cap, 55);
  } else if (stats.wordCount < 30) {
    cap = Math.min(cap, 68);
  } else if (stats.expectedDurationSeconds >= 45 && stats.wordCount < 45) {
    cap = Math.min(cap, 78);
  }

  if (stats.expectedDurationSeconds >= 30) {
    const durationRatio = stats.durationSeconds / stats.expectedDurationSeconds;
    if (durationRatio < 0.25) {
      cap = Math.min(cap, 50);
    } else if (durationRatio < 0.5) {
      cap = Math.min(cap, 65);
    }
  }

  return cap;
}

function capForVocabulary(stats) {
  if (stats.wordCount < 8) {
    return 45;
  }
  if (stats.wordCount < 15) {
    return 55;
  }
  if (stats.wordCount < 30) {
    return 70;
  }
  return 100;
}

function capForDevelopment(stats) {
  if (stats.wordCount < 8 || stats.sentenceCount <= 1) {
    return 52;
  }
  if (stats.wordCount < 15) {
    return 60;
  }
  if (stats.wordCount < 30) {
    return 72;
  }
  return 100;
}

function sumFrequencyList(list) {
  if (!Array.isArray(list)) {
    return 0;
  }

  return list.reduce((total, item) => total + (Number(item && item.count) || 0), 0);
}

// Filler words and repeated words are already detected by the model (speakingAnalytics),
// but until now that data was only ever displayed, never scored: a learner could pad an
// answer with filler or repeated words to inflate word count without penalty. This turns
// that density into an actual cap on fluency/naturalness.
function computeFillerRepetitionDensity(speakingAnalytics, wordCount) {
  if (!speakingAnalytics || wordCount <= 0) {
    return 0;
  }

  const fillerCount = sumFrequencyList(speakingAnalytics.fillerWords);
  const repeatedCount = sumFrequencyList(speakingAnalytics.repeatedWords);

  return (fillerCount + repeatedCount) / wordCount;
}

function capForFillerRepetitionDensity(density) {
  if (density >= 0.25) {
    return 60;
  }
  if (density >= 0.15) {
    return 75;
  }
  return 100;
}

// The learner's use of the grammar structure targeted by this practice session used to be
// pure narrative (grammarFocusFeedback.expectedGrammarUsed) with zero effect on the grammar
// score. targetStructureUsage is a structured signal from the model itself (schema-enforced),
// so this is not free-text parsing: "not_applicable" (no target was set) never penalizes.
function capForTargetStructureUsage(targetStructureUsage) {
  if (targetStructureUsage === "not_used") {
    return 70;
  }
  if (targetStructureUsage === "used_with_errors") {
    return 82;
  }
  return 100;
}

// "Content & relevance" used to be entirely implicit (derived only from coherence/naturalness
// and answer length), with no direct check of whether the learner actually addressed the given
// topic/prompt. topicRelevance.addressedTopic is a structured, schema-enforced judgment from the
// model itself, so this is not free-text parsing. Missing/older records (no topicRelevance field)
// are treated as "fully_relevant" so they are never penalized retroactively.
function capForTopicRelevance(addressedTopic) {
  if (addressedTopic === "off_topic") {
    return 40;
  }
  if (addressedTopic === "partially_relevant") {
    return 70;
  }
  return 100;
}

// Picks the words that most drove the filler/repetition density, so the practice drill below
// can name the learner's own actual words instead of a generic instruction.
function pickTopFrequencyWords(speakingAnalytics, limit = 2) {
  const fillerWords = Array.isArray(speakingAnalytics?.fillerWords) ? speakingAnalytics.fillerWords : [];
  const repeatedWords = Array.isArray(speakingAnalytics?.repeatedWords) ? speakingAnalytics.repeatedWords : [];

  return [...fillerWords, ...repeatedWords]
    .filter((item) => item && typeof item.word === "string" && item.word.trim())
    .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0))
    .slice(0, limit)
    .map((item) => item.word.trim());
}

// A dedicated, concrete practice drill for filler/repeated-word density, rather than only a
// general observation that it limited the score. Uses the model's own already-detected words.
function buildFillerRepetitionExercise(speakingAnalytics) {
  const topWords = pickTopFrequencyWords(speakingAnalytics);
  const wordList = topWords.length > 0 ? topWords.map((word) => `"${word}"`).join(" and ") : "your most repeated word";

  return `Extra drill: record a new 30-45 second answer and consciously avoid saying ${wordList} more than once. Pause silently for a second or two instead of using it when you need a moment to think.`;
}

function computeTaskCompletionScore(stats) {
  const durationUseScore = ratioToScore(stats.durationSeconds, stats.targetSpeakingSeconds);
  const wordUseScore = ratioToScore(stats.wordCount, stats.targetWords);
  const sentenceUseScore = ratioToScore(stats.sentenceCount, stats.targetSentences);

  return clampScore(durationUseScore * 0.3 + wordUseScore * 0.45 + sentenceUseScore * 0.25);
}

function buildSupportiveFindings(stats) {
  const findings = [];

  if (stats.wordCount < Math.min(30, stats.targetWords * 0.5)) {
    findings.push("Answer was too short to show your real speaking level.");
  }

  if (stats.expectedDurationSeconds >= 30 && stats.durationSeconds < stats.targetSpeakingSeconds) {
    findings.push(`Try to speak for at least ${stats.targetSpeakingSeconds} seconds next time.`);
  }

  if (stats.sentenceCount < stats.targetSentences) {
    findings.push("Add reasons, examples, and details so the answer feels complete.");
  }

  return findings;
}

function appendFeedback(existing, addition) {
  const current = String(existing || "").trim();
  if (!addition) {
    return current;
  }
  if (!current) {
    return addition;
  }
  if (current.includes(addition)) {
    return current;
  }
  return `${current} ${addition}`;
}

function uniqueList(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function calibrateAnalysisScores(analysis, options = {}) {
  // True only when this analysis actually came from the direct audio-based path (the model
  // listened to the real recording), not when it fell back to transcript-only analysis. Only
  // then is the pronunciation score grounded in real audio evidence rather than a guess from
  // the words alone, so only then is it fair to let it affect the overall score.
  const pronunciationIsAudioGrounded = Boolean(options.pronunciationIsAudioGrounded);
  const transcript = options.transcript || analysis?.originalTranscript || "";
  const durationSeconds = Number(options.durationSeconds || analysis?.speakingAnalytics?.responseDurationSeconds || 1);
  const expectedDurationSeconds = Number(options.expectedDurationSeconds || durationSeconds);
  const stats = analyzeTranscriptShape(transcript, durationSeconds, expectedDurationSeconds);
  const rawScores = analysis?.scores || {};
  const adjustedScores = {};

  for (const key of SCORE_KEYS) {
    adjustedScores[key] = clampScore(rawScores[key], key === "overall" ? 0 : 50);
  }

  const completionScore = computeTaskCompletionScore(stats);
  const shortAnswerCap = getShortAnswerCap(stats);
  const developmentCap = capForDevelopment(stats);
  const contentAdequacyScore = clampScore(
    ratioToScore(stats.wordCount, stats.targetWords) * 0.6 +
      ratioToScore(stats.sentenceCount, stats.targetSentences) * 0.4
  );
  const fillerRepetitionDensity = computeFillerRepetitionDensity(analysis?.speakingAnalytics, stats.wordCount);
  const fillerRepetitionCap = capForFillerRepetitionDensity(fillerRepetitionDensity);
  const targetStructureUsage = analysis?.grammarFocusFeedback?.targetStructureUsage;
  const targetStructureCap = capForTargetStructureUsage(targetStructureUsage);
  const topicRelevance = analysis?.topicRelevance?.addressedTopic;
  const topicRelevanceCap = capForTopicRelevance(topicRelevance);

  adjustedScores.vocabulary = Math.min(adjustedScores.vocabulary, capForVocabulary(stats));
  adjustedScores.fluency = Math.min(adjustedScores.fluency, developmentCap, fillerRepetitionCap);
  adjustedScores.coherence = Math.min(adjustedScores.coherence, developmentCap);
  adjustedScores.naturalness = Math.min(adjustedScores.naturalness, developmentCap, fillerRepetitionCap);
  adjustedScores.pronunciation = Math.min(adjustedScores.pronunciation, stats.wordCount < 8 ? 60 : 100);
  adjustedScores.grammar = Math.min(adjustedScores.grammar, targetStructureCap);

  const grammarAccuracyScore = adjustedScores.grammar;
  const fluencyCoherenceScore = clampScore(
    adjustedScores.fluency * 0.45 + adjustedScores.coherence * 0.35 + adjustedScores.naturalness * 0.2
  );
  const contentRelevanceScore = Math.min(
    clampScore(adjustedScores.coherence * 0.65 + adjustedScores.naturalness * 0.35),
    Math.max(35, contentAdequacyScore),
    topicRelevanceCap
  );
  const vocabularyRangeScore = adjustedScores.vocabulary;
  const pronunciationScore = adjustedScores.pronunciation;

  // When pronunciation is grounded in real audio, give it a modest 10% share of the overall
  // score (borrowed evenly from grammar/fluency&coherence/content&relevance/vocabulary) instead
  // of excluding it entirely. When it is only a transcript-based guess, keep the original
  // weighting exactly as before so nothing changes for the common case.
  adjustedScores.overall = pronunciationIsAudioGrounded
    ? clampScore(
        grammarAccuracyScore * 0.22 +
          fluencyCoherenceScore * 0.22 +
          contentRelevanceScore * 0.22 +
          vocabularyRangeScore * 0.14 +
          completionScore * 0.1 +
          pronunciationScore * 0.1
      )
    : clampScore(
        grammarAccuracyScore * 0.25 +
          fluencyCoherenceScore * 0.25 +
          contentRelevanceScore * 0.25 +
          vocabularyRangeScore * 0.15 +
          completionScore * 0.1
      );
  adjustedScores.overall = Math.min(adjustedScores.overall, shortAnswerCap);

  const findings = buildSupportiveFindings(stats);
  const lengthFeedback =
    findings.length > 0
      ? `Your grammar may be accurate, but the response was too short and did not use the available speaking time effectively. ${findings.join(" ")}`
      : "";
  const fillerRepetitionFeedback =
    fillerRepetitionDensity >= 0.15
      ? "A large share of your words were filler words or repeated words, which limited your fluency and naturalness scores. Try picking 2-3 key words before you answer instead of repeating the same ones."
      : "";
  const targetStructureFeedback =
    targetStructureUsage === "not_used"
      ? "The grammar structure targeted by this practice was not used at all, which limited the grammar score even if the rest of your sentences were correct."
      : targetStructureUsage === "used_with_errors"
        ? "You attempted the targeted grammar structure, but not accurately yet, which limited the grammar score."
        : "";
  const pronunciationScoreImpactNote = pronunciationIsAudioGrounded
    ? "Because this was scored directly from your recording, pronunciation now also counts toward your overall score."
    : "This pronunciation feedback is estimated from the transcript only, so it is shown separately and does not count toward your overall score yet.";
  const topicRelevanceFeedback =
    topicRelevance === "off_topic"
      ? "Your answer did not really address the given topic, which limited your content and relevance score. Re-read the prompt and make sure your main sentence responds to it directly."
      : topicRelevance === "partially_relevant"
        ? "Your answer touched on the topic but did not fully address it, which limited your content and relevance score. Add details that respond more directly to what was asked."
        : "";
  const fillerRepetitionExercise =
    fillerRepetitionDensity >= 0.15 ? buildFillerRepetitionExercise(analysis?.speakingAnalytics) : "";

  const speakingFeedback = {
    ...(analysis.speakingFeedback || {})
  };

  if (lengthFeedback) {
    speakingFeedback.fluency = appendFeedback(speakingFeedback.fluency, lengthFeedback);
    speakingFeedback.coherence = appendFeedback(
      speakingFeedback.coherence,
      "The answer needs more development: give a reason, one example, and a short conclusion."
    );
    speakingFeedback.vocabulary = appendFeedback(
      speakingFeedback.vocabulary,
      "Because the answer was short, it did not show enough vocabulary range yet."
    );
  }

  if (fillerRepetitionFeedback) {
    speakingFeedback.fluency = appendFeedback(speakingFeedback.fluency, fillerRepetitionFeedback);
    speakingFeedback.repetitionProblems = appendFeedback(speakingFeedback.repetitionProblems, fillerRepetitionFeedback);
  }

  if (targetStructureFeedback) {
    speakingFeedback.grammar = appendFeedback(speakingFeedback.grammar, targetStructureFeedback);
  }

  speakingFeedback.pronunciationNotes = appendFeedback(speakingFeedback.pronunciationNotes, pronunciationScoreImpactNote);

  if (topicRelevanceFeedback) {
    speakingFeedback.coherence = appendFeedback(speakingFeedback.coherence, topicRelevanceFeedback);
  }

  const speakingAnalytics = {
    ...(analysis.speakingAnalytics || {}),
    transcriptWordCount: stats.wordCount,
    responseDurationSeconds: stats.durationSeconds,
    availableDurationSeconds: stats.expectedDurationSeconds,
    wordsPerMinute: stats.wordsPerMinute,
    averageSentenceLength: stats.averageSentenceLength,
    clarityNotesTR: appendFeedback(
      analysis.speakingAnalytics?.clarityNotesTR,
      lengthFeedback
        ? `Your grammar may be fine, but the score was limited because the answer was too short. Try speaking for at least ${stats.targetSpeakingSeconds} seconds and add a reason, an example, and more detail.`
        : ""
    )
  };

  const improvementPlan = {
    ...(analysis.improvementPlan || {}),
    topProblems: uniqueList([
      ...(lengthFeedback
        ? [
            "Answer was too short for the available speaking time.",
            "Add examples, reasons, and details before finishing."
          ]
        : []),
      ...(fillerRepetitionFeedback ? ["Too many filler words or repeated words for a fluent answer."] : []),
      ...(targetStructureFeedback ? ["The targeted grammar structure for this practice was not used correctly."] : []),
      ...(topicRelevanceFeedback ? ["The answer did not fully address the given topic."] : []),
      ...((analysis.improvementPlan && analysis.improvementPlan.topProblems) || [])
    ]),
    tomorrowFocus: appendFeedback(
      analysis.improvementPlan?.tomorrowFocus,
      lengthFeedback ? `Aim for at least ${stats.targetSpeakingSeconds} seconds with 3-4 connected sentences.` : ""
    ),
    homework: appendFeedback(
      appendFeedback(
        analysis.improvementPlan?.homework,
        lengthFeedback
          ? "Retry the same task using this structure: main answer, reason, example, detail, final sentence."
          : ""
      ),
      fillerRepetitionExercise
    )
  };

  return {
    ...analysis,
    scores: adjustedScores,
    speakingFeedback,
    speakingAnalytics,
    improvementPlan
  };
}

module.exports = {
  analyzeTranscriptShape,
  calibrateAnalysisScores,
  computeTaskCompletionScore,
  getShortAnswerCap,
  computeFillerRepetitionDensity,
  capForFillerRepetitionDensity,
  capForTargetStructureUsage,
  capForTopicRelevance,
  buildFillerRepetitionExercise
};
