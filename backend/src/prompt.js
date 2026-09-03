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

/* ------------------------------------------------------------------ *
 * Step 1: listening
 * ------------------------------------------------------------------ */

/**
 * The audio model cannot return JSON at all — it rejects `response_format` in
 * both strict and loose form — so it is asked for a plain-text report and a
 * text model turns that into the schema afterwards. See
 * `scripts/audioAnalysisDiagnostic.js` for the checks that established this.
 *
 * For English the report is about a learner, so it must capture the things a
 * transcript destroys: which words were mispronounced and how, where stress
 * landed, where the speaker hesitated or restarted. Those are exactly what the
 * pronunciation score is meant to be grounded in.
 */
const ENGLISH_AUDIO_OBSERVATION_SYSTEM_INSTRUCTION =
  "You transcribe and describe what you hear in a recording. You do not grade, score or advise. " +
  "You report only what is audible.";

function buildEnglishAudioObservationPrompt({ durationSeconds }) {
  return `Listen to the attached recording of an English learner speaking. The recording is
${durationSeconds} seconds long. Write down what you hear using EXACTLY the headings below.

This is a record, not an assessment. Do not score, judge or give advice. Another
model will read your notes and do that. Be complete and honest.

Use m:ss timestamps (for example 1:24).

TRANSCRIPT:
The full text of what was said. Do NOT clean it up: keep hesitations ("uh", "um",
"er"), false starts and repeated words exactly where they occur. Mark silences
longer than 0.8 seconds as [1.4s].

PRONUNCIATION:
Words that were mispronounced or hard to understand, one per line:
"- 0:34 \"comfortable\" -> said as com-for-TABLE, stress on wrong syllable"
Include sounds that were substituted or dropped (word endings, th, r/l, vowels).
Write "- none" if there were none worth noting.

HESITATIONS:
Every filler sound and pause: "- 0:12 uh" or "- 1:05 pause 2.1s"
Write "- none" if there were none.

SELF-CORRECTIONS:
Places where the speaker restarted or repaired a sentence:
"- 1:40 started 'I was go...' then corrected to 'I went'"
Write "- none" if there were none.

DELIVERY:
pace: (fast/slow/steady, does it change)
intonation: (flat or varied, does it match the meaning)
rhythm: (natural stress and linking, or word-by-word)
confidence: (assured, hesitant, trailing off at sentence ends)

NUMBERS:
total words: (approximate)
speaking time: (seconds, excluding long silences)
estimated silence share: (percent)`;
}

function buildSpeakingAnalysisPrompt(topic, transcript, level, durationSeconds, analysisContext, options = {}) {
  const { grammarFocus, pictureDescription } = normalizeAnalysisContext(analysisContext);
  const expectedDurationSeconds = Number(options.expectedDurationSeconds || durationSeconds);
  // The report from the listening step. Its presence is what "audio-grounded"
  // means from here on: the model never receives the recording itself, but the
  // report was written by a model that did hear it.
  const audioObservation = String(options.audioObservation || "").trim();
  const audioAttached = audioObservation.length > 0;

  return `You are an English speaking coach. ${
    audioAttached
      ? "A detailed report from listening to the learner's recording is included below. Use it to analyze the answer like a professional language teacher."
      : "Analyze the following speaking transcript like a professional language teacher."
  }

Learner level: ${level}
Actual speaking duration seconds: ${durationSeconds}
Available speaking time / expected duration seconds: ${expectedDurationSeconds}

Targeted grammar focus:
${formatGrammarFocus(grammarFocus)}

Picture description context:
${formatPictureDescriptionContext(pictureDescription)}

Topic:
${topic}
${
  audioAttached
    ? `
A model that listened to the recording wrote the report below. It is the SOURCE OF TRUTH.

You cannot hear the recording, but the report was written by something that could. Take
pronunciation, intonation, rhythm, hesitation, self-correction and confidence from it rather
than guessing them from the words. Those judgments are the entire reason the recording was
listened to at all.

Produce "originalTranscript" from the TRANSCRIPT section of the report, keeping its hesitations
and false starts rather than tidying them away.

LISTENING REPORT:
"""
${audioObservation}
"""

A separate speech-to-text pass also produced the transcript below. Use it only to resolve a word
the report left unclear; prefer the report wherever the two disagree.

Secondary reference transcript (may be imperfect):
${transcript || "(not available)"}
`
    : `
Transcript:
${transcript}
`
}
Return detailed but mobile-readable feedback:
1. Original transcript
2. Corrected and more natural version
3. Grammar mistakes table entries. For each mistake, also classify it directly with:
   - category: one of grammar, vocabulary, fluency, pronunciation, coherence, naturalness, turkish-transfer, other
   - severity: low, medium, or high
   - isTurkishTransferError: true only when the mistake clearly comes from translating Turkish thinking word-for-word
     (literal translation, Turkish word order, a false friend, or a structure that does not exist in English but does in Turkish)
   Use "turkish-transfer" as the category whenever isTurkishTransferError is true.
   Pay deliberate, explicit attention to verb tense choice, separately from other grammar issues — learners routinely pick the
   wrong tense without noticing (e.g. present simple for a finished past event, past simple where present perfect is required,
   present continuous for a habitual action, or the wrong tense in a conditional/time clause). Scan every sentence in the
   transcript specifically for tense mistakes, not just the more obvious agreement/word-order errors.
   For every mistake that is a tense error, follow this exact format so the learner can see the wrong and right forms side by side:
   - "problem" must name both tenses explicitly, e.g. "Used present simple instead of past simple" or "Used past simple instead
     of present perfect."
   - "explanation" must give the specific reason that tense is required here (finished vs. unfinished time, a specific past
     time marker like "yesterday", an action continuing up to now, sequence relative to another event, etc.), then show the
     learner's original wrong-tense sentence and the corrected sentence right next to each other so the contrast is obvious,
     e.g. "Wrong: 'I go there yesterday.' Correct: 'I went there yesterday.' Past simple is needed because 'yesterday' marks a
     finished point in the past, not an ongoing or habitual action."
   Never leave a tense mistake with only a generic "grammar mistake" explanation — always state which tense was used, which
   tense should have been used, and why.
4. At least 8 vocabulary upgrades with simple phrase, stronger alternative, and example sentence
5. Fluency, coherence, confidence, repetition, connectors, and ${audioAttached ? "audio-based" : "transcript-based"} pronunciation notes
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
   ${
     audioAttached
       ? "You have a listening report, so ground pronunciation feedback in what it records (stress, intonation, sound accuracy, rhythm, hesitation), not just in the words themselves."
       : "If transcription confidence is unavailable, do not pretend to know exact pronunciation quality; make pronunciation feedback transcript-based."
   }
9. speakingAnalytics:
   - estimatedCEFRLevel
   - wordsPerMinute, calculated from the transcript word count (yours, from the audio, if attached) and recording duration
   - fillerWords as { word, count } items
   - repeatedWords as { word, count } items
   - averageSentenceLength
   - transcriptWordCount
   - responseDurationSeconds
   - clarityNotesTR in English (the field name is legacy; write the content in clear English)
10. errorPatterns with stable ids, category, an English explanation, examples, severity, and a Turkish-transfer flag (isTurkishTransferError).
    Keep this list consistent with how you classified the mistakes above: group mistakes that share the same category into one
    pattern where it makes sense, and reuse the exact same category/severity/isTurkishTransferError values you gave those mistakes.
    Do not introduce a different classification here than you already gave the matching mistake.
11. progressTags using only: interview, daily-conversation, erasmus, business, grammar, fluency, pronunciation, vocabulary
12. repeatedMistakeCandidates for patterns from this answer that are likely to repeat in future attempts
13. grammarFocusFeedback:
   - expectedGrammarUsed: explain whether the expected grammar was used, or say no targeted grammar focus was provided
   - missedGrammarOpportunities: places where the learner could have used the target structures
   - tenseAccuracy: short English explanation of tense accuracy
   - betterSentenceAlternatives: improved sentences using the target grammar
   - levelAppropriateSuggestions: practical English suggestions for the learner level
   - targetStructureUsage: one of not_applicable, not_used, used_with_errors, used_correctly
     Use "not_applicable" whenever no targeted grammar focus was provided above (this is the normal value for general/picture-description
     practice). When a grammar focus WAS provided, choose "used_correctly" only if the learner actually produced the target structure(s)
     correctly at least once, "used_with_errors" if they attempted it but got it wrong, and "not_used" if they avoided it entirely.
14. Teacher-like improvement plan for tomorrow with concrete homework
15. topicRelevance: an independent judgment of whether the learner actually addressed the assigned topic/prompt above
   (and the picture description target / grammar speaking prompt, when provided), separate from grammar or fluency quality.
   - addressedTopic: one of off_topic, partially_relevant, fully_relevant
     Use "off_topic" when the answer is mostly unrelated to what was asked, "partially_relevant" when it touches the topic
     but misses the main point or answers a different question than the one asked, and "fully_relevant" when it genuinely
     responds to the topic/prompt (this does not require covering every detail, just genuinely addressing it).
   - explanation: one short, specific sentence on why, referencing what was/was not addressed

If picture description context is provided, compare the learner's transcript with the picture description target. Do not require perfect coverage, but give level-appropriate feedback about:
- picture description accuracy
- whether the learner mentioned the main subject, foreground, background, actions, and mood
- important visible details the learner missed
- vocabulary range for objects, actions, background, and inference
- target grammar use
- whether the learner made reasonable inferences supported by visual details
- better sentence alternatives for describing the picture
Place this feedback inside the existing JSON fields: speakingFeedback, vocabularySuggestions, connectorSuggestions, sentenceStructureSuggestions, grammarFocusFeedback, improvementPlan, personalizedExercises, and dailyStudyPlan. Do not add new JSON fields.

${
  audioAttached
    ? "For pronunciation, base your notes on the PRONUNCIATION, HESITATIONS and SELF-CORRECTIONS sections of the listening report. Be explicit that it is based on listening to the recording."
    : "For pronunciation, only infer from transcript evidence such as missing endings, repeated wording, unclear phrasing, or likely stress/rhythm issues. Be explicit that it is transcript-based."
}
Write explanationTR and clarityNotesTR in clear, simple English (these field names are legacy and do not indicate the content language). Keep English examples clear and short.
Do not return a weekly plan, seven-day plan, or any field not present in the JSON schema.

Be supportive, honest, specific, and practical.`;
}

function buildChatSystemPrompt(level) {
  return `You are a friendly, encouraging English speaking coach chatting with a ${level}-level English learner over text and voice messages.

Reply in clear, natural English at a level the learner can follow, using short paragraphs (2-4 sentences).
Gently correct any noticeable grammar or word-choice mistakes by modeling the natural version in your reply, without being harsh or listing errors like a report.
Keep the conversation going: after responding to what the learner said, ask one short, engaging follow-up question that invites them to keep speaking English.
Do not use Markdown formatting, bullet points, or numbered lists. Write as if you are texting a supportive teacher.
Keep replies concise: usually 2-4 sentences plus the follow-up question.`;
}

module.exports = {
  ENGLISH_AUDIO_OBSERVATION_SYSTEM_INSTRUCTION,
  buildEnglishAudioObservationPrompt, buildSpeakingAnalysisPrompt, buildChatSystemPrompt };
