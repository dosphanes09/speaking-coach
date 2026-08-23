/**
 * The verification layer for generated lessons.
 *
 * Models are good at writing lessons and bad at keeping an answer key in sync with the
 * exercises above it, so nothing generated here is trusted on its word: the checks below run
 * on every generated part. Blocking problems ("issues") trigger exactly one regeneration with
 * the problems fed back into the prompt; cosmetic ones ("warnings") are reported to the app
 * but do not throw the lesson away.
 *
 * This module deliberately has no dependencies (not even config) so it can be exercised by a
 * plain `node` self-test without any environment set up.
 */

const READING_WORD_RANGES = {
  A2: { min: 250, max: 350 },
  B1: { min: 400, max: 550 },
  B2: { min: 650, max: 850 },
  C1: { min: 900, max: 1100 }
};

const TARGET_WORD_RANGE = { min: 12, max: 18 };

// The model is asked for an exact word count; the check allows this much slack around the
// level's range before treating the length as a real problem, because a lesson that is 5%
// long is fine and regenerating it costs the learner a minute of waiting.
const WORD_COUNT_TOLERANCE = 0.1;

function countWords(text) {
  return String(text || "")
    .replace(/\*\*/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function stripMarkers(text) {
  return String(text || "").replace(/\*\*/g, "");
}

function extractMarkedWords(text) {
  const matches = String(text || "").match(/\*\*([^*]+)\*\*/g) || [];
  return matches.map((match) => match.slice(2, -2).trim()).filter(Boolean);
}

function normalizeWordForm(value) {
  let word = String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z' -]/g, "")
    .trim();

  if (word.endsWith("'s")) {
    word = word.slice(0, -2);
  }

  word = word.replace(/ies$/, "y").replace(/(ing|ed|es|s)$/, "");

  // running -> runn -> run
  if (word.length > 3 && /(.)\1$/.test(word)) {
    word = word.slice(0, -1);
  }

  // close/closes/closed all collapse to the same stem.
  if (word.length > 3 && word.endsWith("e")) {
    word = word.slice(0, -1);
  }

  return word;
}

function tokenizeReading(text) {
  return stripMarkers(text)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .split(/[^a-z']+/)
    .filter(Boolean);
}

function readingContainsWord(readingText, word) {
  const phrase = String(word || "").trim();
  if (!phrase) {
    return false;
  }

  const readingTokens = new Set(tokenizeReading(readingText).map(normalizeWordForm));
  const parts = phrase.split(/\s+/).filter(Boolean);

  return parts.every((part) => readingTokens.has(normalizeWordForm(part)));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function validateLessonCore(core, { lessonLevel, recentTopics = [] } = {}) {
  const issues = [];
  const warnings = [];

  if (!core || typeof core !== "object") {
    return { issues: ["The lesson was empty or not an object."], warnings };
  }

  const range = READING_WORD_RANGES[lessonLevel] || READING_WORD_RANGES.B1;
  const readingText = core.reading?.text || "";
  const actualWordCount = countWords(readingText);
  const minAllowed = Math.floor(range.min * (1 - WORD_COUNT_TOLERANCE));
  const maxAllowed = Math.ceil(range.max * (1 + WORD_COUNT_TOLERANCE));

  if (actualWordCount < minAllowed || actualWordCount > maxAllowed) {
    issues.push(
      `The reading text is ${actualWordCount} words. For level ${lessonLevel} it must be ${range.min}-${range.max} words.`
    );
  }

  const markedWords = extractMarkedWords(readingText);
  if (markedWords.length < Math.floor(TARGET_WORD_RANGE.min / 2)) {
    issues.push(
      `Only ${markedWords.length} target words are marked with ** ** in the reading text. Mark ${TARGET_WORD_RANGE.min}-${TARGET_WORD_RANGE.max}.`
    );
  } else if (markedWords.length < TARGET_WORD_RANGE.min || markedWords.length > TARGET_WORD_RANGE.max) {
    warnings.push(
      `The reading marks ${markedWords.length} target words instead of ${TARGET_WORD_RANGE.min}-${TARGET_WORD_RANGE.max}.`
    );
  }

  const vocabulary = asArray(core.vocabulary);
  const missingWords = vocabulary
    .map((item) => String(item?.word || "").trim())
    .filter((word) => word && !readingContainsWord(readingText, word));

  if (missingWords.length > 0) {
    issues.push(
      `These vocabulary words do not appear in the reading text: ${missingWords.slice(0, 6).join(", ")}. Every vocabulary word must be used in the text and marked with ** **.`
    );
  }

  if (vocabulary.length !== markedWords.length) {
    warnings.push(
      `The vocabulary list has ${vocabulary.length} entries but ${markedWords.length} words are marked in the reading.`
    );
  }

  // Only full sentences are checked: a very short string would match the text by coincidence
  // and report a copied example that was never copied.
  const duplicateExamples = vocabulary.filter((item) => {
    const example = String(item?.example || "").trim();
    return example.length >= 20 && stripMarkers(readingText).includes(example);
  });
  if (duplicateExamples.length > 0) {
    warnings.push(`${duplicateExamples.length} vocabulary examples were copied from the reading text instead of being new.`);
  }

  const slug = String(core.topic_slug || "").trim().toLowerCase();
  if (slug && recentTopics.some((topic) => String(topic || "").trim().toLowerCase() === slug)) {
    issues.push(`The topic "${slug}" was already used in a recent lesson. Choose a genuinely different topic.`);
  }

  if (asArray(core.warm_up).length !== 3) {
    warnings.push(`There are ${asArray(core.warm_up).length} warm-up questions instead of 3.`);
  }

  const pronunciationWords = asArray(core.pronunciation?.words);
  if (pronunciationWords.length < 2 || pronunciationWords.length > 3) {
    warnings.push(`The pronunciation section covers ${pronunciationWords.length} words instead of 2-3.`);
  }

  if (asArray(core.pronunciation?.shadowing).length !== 3) {
    warnings.push("The pronunciation section does not have exactly 3 shadowing sentences.");
  }

  const collocations = asArray(core.collocations);
  if (collocations.length < 5 || collocations.length > 7) {
    warnings.push(`There are ${collocations.length} collocations instead of 5-7.`);
  }

  return { issues, warnings };
}

function validateLessonPractice(practice, core) {
  const issues = [];
  const warnings = [];

  if (!practice || typeof practice !== "object") {
    return { issues: ["The practice part was empty or not an object."], warnings };
  }

  const exercises = practice.exercises || {};
  const answerKey = practice.answer_key || {};

  const comprehension = asArray(exercises.comprehension);
  const comprehensionAnswers = asArray(answerKey.comprehension);
  if (comprehension.length !== comprehensionAnswers.length) {
    issues.push(
      `There are ${comprehension.length} comprehension questions but ${comprehensionAnswers.length} answers. They must match one to one, in order.`
    );
  }

  const mcqWithoutOptions = comprehension.filter(
    (item) => item?.type === "mcq" && asArray(item.options).length < 2
  );
  if (mcqWithoutOptions.length > 0) {
    issues.push(`${mcqWithoutOptions.length} multiple-choice comprehension questions have fewer than 2 options.`);
  }

  const vocabItems = asArray(exercises.gap_fill_vocab?.items);
  const vocabAnswers = asArray(answerKey.gap_fill_vocab);
  if (vocabItems.length !== vocabAnswers.length) {
    issues.push(
      `There are ${vocabItems.length} vocabulary gap-fill sentences but ${vocabAnswers.length} answers. They must match one to one, in order.`
    );
  }

  const vocabItemsWithoutGap = vocabItems.filter((item) => !String(item || "").includes("___"));
  if (vocabItemsWithoutGap.length > 0) {
    issues.push(`${vocabItemsWithoutGap.length} vocabulary gap-fill sentences do not contain a ___ gap.`);
  }

  const grammarGapFill = asArray(exercises.grammar_practice?.gap_fill);
  const grammarGapFillAnswers = asArray(answerKey.grammar_practice?.gap_fill);
  if (grammarGapFill.length !== grammarGapFillAnswers.length) {
    issues.push(
      `There are ${grammarGapFill.length} grammar gap-fill items but ${grammarGapFillAnswers.length} answers. They must match one to one, in order.`
    );
  }

  const grammarItemsWithoutGap = grammarGapFill.filter((item) => !String(item?.sentence || "").includes("___"));
  if (grammarItemsWithoutGap.length > 0) {
    issues.push(`${grammarItemsWithoutGap.length} grammar gap-fill sentences do not contain a ___ gap.`);
  }

  const transformation = asArray(exercises.grammar_practice?.transformation);
  const transformationAnswers = asArray(answerKey.grammar_practice?.transformation);
  if (transformation.length !== transformationAnswers.length) {
    issues.push(
      `There are ${transformation.length} transformation items but ${transformationAnswers.length} answers. They must match one to one, in order.`
    );
  }

  const errorCorrection = asArray(exercises.error_correction);
  const errorCorrectionAnswers = asArray(answerKey.error_correction);
  if (errorCorrection.length !== errorCorrectionAnswers.length) {
    issues.push(
      `There are ${errorCorrection.length} error-correction sentences but ${errorCorrectionAnswers.length} answers. They must match one to one, in order.`
    );
  }

  const speakingTasks = asArray(practice.speaking_tasks);
  if (speakingTasks.length !== 3) {
    issues.push(`There are ${speakingTasks.length} speaking tasks instead of exactly 3.`);
  }

  const tasksWithoutInstruction = speakingTasks.filter((task) => !String(task?.instruction || "").trim());
  if (tasksWithoutInstruction.length > 0) {
    issues.push(`${tasksWithoutInstruction.length} speaking tasks have no instruction.`);
  }

  const roleplayTask = speakingTasks[speakingTasks.length - 1];
  if (roleplayTask && !String(roleplayTask.roleplay?.scenario || "").trim()) {
    warnings.push("The last speaking task has no roleplay scenario.");
  }

  const matching = asArray(exercises.matching);
  if (matching.length < 4) {
    warnings.push(`The matching exercise has ${matching.length} pairs instead of 8.`);
  }

  if (asArray(practice.follow_up_questions).length < 3) {
    warnings.push("There are fewer than 3 follow-up questions.");
  }

  if (!String(practice.profile_question || "").trim()) {
    warnings.push("The lesson has no profile question, so tomorrow's lesson learns nothing new.");
  }

  // Vocabulary only transfers if the learner meets it somewhere other than the reading, so a
  // practice part that never reuses the target words is worth flagging even though the lesson
  // is still usable.
  const targetWords = asArray(core?.vocabulary).map((item) => String(item?.word || "").toLowerCase());
  const practiceText = JSON.stringify(practice).toLowerCase();
  const reusedWords = targetWords.filter((word) => word && practiceText.includes(word));
  if (targetWords.length > 0 && reusedWords.length < Math.ceil(targetWords.length / 3)) {
    warnings.push("The exercises barely reuse the target vocabulary from the reading.");
  }

  return { issues, warnings };
}

/**
 * The model answers in the snake_case shape of the prompt pack. Everything past this point —
 * the HTTP response, the app, the stored lesson — uses the camelCase shape the rest of the
 * codebase already uses, so the conversion happens exactly once, here.
 */
function normalizeLessonCore(core) {
  const readingText = core.reading?.text || "";

  return {
    topicSlug: String(core.topic_slug || "").trim(),
    title: String(core.title || "").trim(),
    subtitle: String(core.subtitle || "").trim(),
    level: String(core.level || "").trim(),
    estimatedMinutes: Number(core.estimated_minutes) || 25,
    warmUp: asArray(core.warm_up).map((item) => String(item)),
    reading: {
      text: readingText,
      // Recomputed rather than trusted: the model's own count is frequently a few words off
      // and the app shows this number to the learner.
      wordCount: countWords(readingText)
    },
    vocabulary: asArray(core.vocabulary).map((item) => ({
      word: String(item?.word || ""),
      pos: String(item?.pos || ""),
      definition: String(item?.definition || ""),
      translation: String(item?.translation || ""),
      example: String(item?.example || "")
    })),
    pronunciation: {
      words: asArray(core.pronunciation?.words).map((item) => ({
        word: String(item?.word || ""),
        respelling: String(item?.respelling || ""),
        stress: String(item?.stress || ""),
        l1Error: String(item?.l1_error || "")
      })),
      shadowing: asArray(core.pronunciation?.shadowing).map((item) => String(item))
    },
    collocations: asArray(core.collocations).map((item) => ({
      phrase: String(item?.phrase || ""),
      meaning: String(item?.meaning || ""),
      register: String(item?.register || "neutral")
    }))
  };
}

function normalizeLessonPractice(practice) {
  return {
    grammar: {
      structure: String(practice.grammar?.structure || ""),
      coreIdea: String(practice.grammar?.core_idea || ""),
      form: asArray(practice.grammar?.form).map((item) => ({
        type: String(item?.type || ""),
        pattern: String(item?.pattern || ""),
        example: String(item?.example || "")
      })),
      usage: asArray(practice.grammar?.usage).map((item) => ({
        context: String(item?.context || ""),
        explanation: String(item?.explanation || ""),
        example: String(item?.example || "")
      })),
      commonErrors: asArray(practice.grammar?.common_errors).map((item) => ({
        wrong: String(item?.wrong || ""),
        right: String(item?.right || ""),
        why: String(item?.why || "")
      }))
    },
    exercises: {
      comprehension: asArray(practice.exercises?.comprehension).map((item) => ({
        question: String(item?.q || ""),
        type: item?.type === "mcq" ? "mcq" : "open",
        options: asArray(item?.options).map((option) => String(option))
      })),
      matching: asArray(practice.exercises?.matching).map((item) => ({
        left: String(item?.left || ""),
        right: String(item?.right || "")
      })),
      gapFillVocab: {
        wordBank: asArray(practice.exercises?.gap_fill_vocab?.word_bank).map((item) => String(item)),
        items: asArray(practice.exercises?.gap_fill_vocab?.items).map((item) => String(item))
      },
      grammarPractice: {
        gapFill: asArray(practice.exercises?.grammar_practice?.gap_fill).map((item) => ({
          sentence: String(item?.sentence || ""),
          verb: String(item?.verb || "")
        })),
        transformation: asArray(practice.exercises?.grammar_practice?.transformation).map((item) => ({
          prompt: String(item?.prompt || ""),
          cue: String(item?.cue || "")
        }))
      },
      errorCorrection: asArray(practice.exercises?.error_correction).map((item) => String(item))
    },
    speakingTasks: asArray(practice.speaking_tasks).map((task, index) => ({
      number: Number(task?.number) || index + 1,
      duration: String(task?.duration || ""),
      instruction: String(task?.instruction || ""),
      targetPhrases: asArray(task?.target_phrases).map((item) => String(item)),
      assess: {
        vocabulary: asArray(task?.assess?.vocabulary).map((item) => String(item)),
        grammar: String(task?.assess?.grammar || "")
      },
      roleplay: {
        scenario: String(task?.roleplay?.scenario || ""),
        learnerRole: String(task?.roleplay?.learner_role || ""),
        appRole: String(task?.roleplay?.app_role || ""),
        goals: asArray(task?.roleplay?.goals).map((item) => String(item))
      }
    })),
    followUpQuestions: asArray(practice.follow_up_questions).map((item) => String(item)),
    answerKey: {
      comprehension: asArray(practice.answer_key?.comprehension).map((item) => ({
        answer: String(item?.answer || ""),
        note: String(item?.note || "")
      })),
      gapFillVocab: asArray(practice.answer_key?.gap_fill_vocab).map((item) => String(item)),
      grammarPractice: {
        gapFill: asArray(practice.answer_key?.grammar_practice?.gap_fill).map((item) => String(item)),
        transformation: asArray(practice.answer_key?.grammar_practice?.transformation).map((item) => String(item))
      },
      errorCorrection: asArray(practice.answer_key?.error_correction).map((item) => ({
        corrected: String(item?.corrected || ""),
        note: String(item?.note || "")
      }))
    },
    profileQuestion: String(practice.profile_question || "")
  };
}

function normalizeLearnerProfileFromModel(profile, fallback) {
  const interests = asArray(profile?.interests).map((item) => String(item).trim()).filter(Boolean);
  const weakPoints = asArray(profile?.weak_points).map((item) => String(item).trim()).filter(Boolean);
  const context = asArray(profile?.context).map((item) => String(item).trim()).filter(Boolean);

  return {
    level: String(profile?.level || fallback.level),
    nativeLanguage: String(profile?.native_language || fallback.nativeLanguage),
    interests: interests.slice(0, 12),
    goal: String(profile?.goal || fallback.goal || ""),
    weakPoints: weakPoints.slice(0, 8),
    context: context.slice(0, 12)
  };
}

module.exports = {
  READING_WORD_RANGES,
  TARGET_WORD_RANGE,
  countWords,
  stripMarkers,
  extractMarkedWords,
  readingContainsWord,
  validateLessonCore,
  validateLessonPractice,
  normalizeLessonCore,
  normalizeLessonPractice,
  normalizeLearnerProfileFromModel
};
