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

  adjustedScores.vocabulary = Math.min(adjustedScores.vocabulary, capForVocabulary(stats));
  adjustedScores.fluency = Math.min(adjustedScores.fluency, developmentCap);
  adjustedScores.coherence = Math.min(adjustedScores.coherence, developmentCap);
  adjustedScores.naturalness = Math.min(adjustedScores.naturalness, developmentCap);
  adjustedScores.pronunciation = Math.min(adjustedScores.pronunciation, stats.wordCount < 8 ? 60 : 100);

  const grammarAccuracyScore = adjustedScores.grammar;
  const fluencyCoherenceScore = clampScore(
    adjustedScores.fluency * 0.45 + adjustedScores.coherence * 0.35 + adjustedScores.naturalness * 0.2
  );
  const contentRelevanceScore = Math.min(
    clampScore(adjustedScores.coherence * 0.65 + adjustedScores.naturalness * 0.35),
    Math.max(35, contentAdequacyScore)
  );
  const vocabularyRangeScore = adjustedScores.vocabulary;

  adjustedScores.overall = clampScore(
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
        ? `Dilbilgin iyi olabilir; ancak cevap çok kısa kaldığı için skor sınırlandı. En az ${stats.targetSpeakingSeconds} saniye konuşup neden, örnek ve detay eklemeye çalış.`
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
      ...((analysis.improvementPlan && analysis.improvementPlan.topProblems) || [])
    ]),
    tomorrowFocus: appendFeedback(
      analysis.improvementPlan?.tomorrowFocus,
      lengthFeedback ? `Aim for at least ${stats.targetSpeakingSeconds} seconds with 3-4 connected sentences.` : ""
    ),
    homework: appendFeedback(
      analysis.improvementPlan?.homework,
      lengthFeedback
        ? "Retry the same task using this structure: main answer, reason, example, detail, final sentence."
        : ""
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
  getShortAnswerCap
};
