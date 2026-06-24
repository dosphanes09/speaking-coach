function formatGrammarFocus(grammarFocus) {
  if (!grammarFocus) {
    return "No targeted grammar focus was provided.";
  }

  return `CEFR level: ${grammarFocus.cefrLevel || "not provided"}
Grammar topic: ${grammarFocus.grammarTopic || "not provided"}
Expected structures: ${grammarFocus.expectedGrammarStructures || "not provided"}
Speaking prompt: ${grammarFocus.speakingPrompt || "not provided"}`;
}

function normalizeAnalysisContext(analysisContext) {
  if (!analysisContext) {
    return {
      grammarFocus: null,
      pictureDescription: null
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(analysisContext, "grammarFocus") ||
    Object.prototype.hasOwnProperty.call(analysisContext, "pictureDescription")
  ) {
    return {
      grammarFocus: analysisContext.grammarFocus || null,
      pictureDescription: analysisContext.pictureDescription || null
    };
  }

  return {
    grammarFocus: analysisContext,
    pictureDescription: null
  };
}

function formatPictureDescriptionContext(pictureDescription) {
  if (!pictureDescription) {
    return "No picture description context was provided.";
  }

  return `Mode: ${pictureDescription.mode || "picture_description"}
Picture prompt id: ${pictureDescription.picturePromptId || "not provided"}
Picture description target: ${pictureDescription.pictureDescriptionTarget || "not provided"}
Learner guide: ${pictureDescription.pictureLearnerInstructions || "not provided"}
Detail checklist: ${pictureDescription.pictureDetailChecklist || "not provided"}
Possible inferences: ${pictureDescription.picturePossibleInferences || "not provided"}
Common learner mistakes to watch for: ${pictureDescription.pictureCommonMistakes || "not provided"}
Expected vocabulary categories: ${pictureDescription.expectedVocabularyCategories || "not provided"}
Expected grammar structures: ${pictureDescription.expectedGrammarStructures || "not provided"}
Speaking prompt: ${pictureDescription.speakingPrompt || "not provided"}`;
}

function buildSpeakingAnalysisPrompt(topic, transcript, level, durationSeconds, analysisContext, options = {}) {
  const { grammarFocus, pictureDescription } = normalizeAnalysisContext(analysisContext);
  const expectedDurationSeconds = Number(options.expectedDurationSeconds || durationSeconds);

  return `You are an English speaking coach. Analyze the following speaking transcript like a professional language teacher.

Learner level: ${level}
Actual speaking duration seconds: ${durationSeconds}
Available speaking time / expected duration seconds: ${expectedDurationSeconds}

Targeted grammar focus:
${formatGrammarFocus(grammarFocus)}

Picture description context:
${formatPictureDescriptionContext(pictureDescription)}

Topic:
${topic}

Transcript:
${transcript}

Return detailed but mobile-readable feedback:
1. Original transcript
2. Corrected and more natural version
3. Grammar mistakes table entries
4. At least 8 vocabulary upgrades with simple phrase, stronger alternative, and example sentence
5. Fluency, coherence, confidence, repetition, connectors, and transcript-based pronunciation notes
6. Connector suggestions for adding, contrast, reason, example, and conclusion
7. At least 5 sentence-building patterns with formula and example
8. Scores from 0 to 100 for grammar, vocabulary, fluency, pronunciation, coherence, naturalness, and overall
   Use this CEFR/IELTS-inspired scoring structure:
   - Grammar Accuracy: 25%
   - Fluency & Coherence: 25%
   - Content & Relevance: 25%
   - Vocabulary Range: 15%
   - Task Completion: 10%
   Task Completion includes answer completeness, level of detail, effective use of available speaking time, and whether the topic was adequately addressed.
   Do not give a high overall score merely because a short sentence is grammatically correct.
   Penalize very short answers even when grammar is accurate. One simple sentence should not score above the intermediate range.
   Compare transcript length, sentence count, and actual speaking duration with the available speaking time.
   If the learner used only a small part of the available time, lower fluency/coherence/content/task completion and explain it supportively.
   Use feedback like: "Your grammar was accurate, but the response was too short and did not use the available speaking time effectively."
   If transcription confidence is unavailable, do not pretend to know exact pronunciation quality; make pronunciation feedback transcript-based.
9. speakingAnalytics:
   - estimatedCEFRLevel
   - wordsPerMinute, calculated from transcript word count and recording duration
   - fillerWords as { word, count } items
   - repeatedWords as { word, count } items
   - averageSentenceLength
   - transcriptWordCount
   - responseDurationSeconds
   - clarityNotesTR in Turkish
10. errorPatterns with stable ids, category, Turkish explanation, examples, severity, and Turkish transfer flag
11. progressTags using only: interview, daily-conversation, erasmus, business, grammar, fluency, pronunciation, vocabulary
12. repeatedMistakeCandidates for patterns from this answer that are likely to repeat in future attempts
13. grammarFocusFeedback:
   - expectedGrammarUsed: explain whether the expected grammar was used, or say no targeted grammar focus was provided
   - missedGrammarOpportunities: places where the learner could have used the target structures
   - tenseAccuracy: short Turkish explanation of tense accuracy
   - betterSentenceAlternatives: improved sentences using the target grammar
   - levelAppropriateSuggestions: practical Turkish suggestions for the learner level
14. Teacher-like improvement plan for tomorrow with concrete homework

If picture description context is provided, compare the learner's transcript with the picture description target. Do not require perfect coverage, but give level-appropriate feedback about:
- picture description accuracy
- whether the learner mentioned the main subject, foreground, background, actions, and mood
- important visible details the learner missed
- vocabulary range for objects, actions, background, and inference
- target grammar use
- whether the learner made reasonable inferences supported by visual details
- better sentence alternatives for describing the picture
Place this feedback inside the existing JSON fields: speakingFeedback, vocabularySuggestions, connectorSuggestions, sentenceStructureSuggestions, grammarFocusFeedback, improvementPlan, personalizedExercises, and dailyStudyPlan. Do not add new JSON fields.

For pronunciation, only infer from transcript evidence such as missing endings, repeated wording, unclear phrasing, or likely stress/rhythm issues. Be explicit that it is transcript-based.
Use Turkish for explanationTR and clarityNotesTR. Keep English examples clear and short.
Do not return a weekly plan, seven-day plan, or any field not present in the JSON schema.

Be supportive, honest, specific, and practical.`;
}

module.exports = { buildSpeakingAnalysisPrompt };
