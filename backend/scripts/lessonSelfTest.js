/**
 * Self-test for the daily lesson verification layer.
 *
 * Run with: npm run test:lesson
 * (mirrors the node:assert self-test style already used by scoringSelfTest.js)
 *
 * These checks are the reason the feature can trust generated lessons at all: they are what
 * catches a vocabulary list that does not match the reading, or an answer key that has drifted
 * out of step with the exercises above it.
 */
const assert = require("node:assert/strict");
const {
  countWords,
  extractMarkedWords,
  readingContainsWord,
  validateLessonCore,
  validateLessonPractice,
  normalizeLessonCore,
  normalizeLessonPractice
} = require("../src/lessonValidation");

function buildReading(wordCount, markedWords = []) {
  const filler = [];
  for (let index = 0; index < wordCount - markedWords.length; index += 1) {
    filler.push("word");
  }

  const marked = markedWords.map((word) => `**${word}**`);
  return [...filler, ...marked].join(" ");
}

function buildValidCore(overrides = {}) {
  const markedWords = [
    "resilient",
    "deliberate",
    "threshold",
    "sustain",
    "fragile",
    "margin",
    "endure",
    "assemble",
    "precise",
    "component",
    "anticipate",
    "reliable"
  ];

  return {
    topic_slug: "why-engines-are-tested-to-failure",
    title: "Testing to failure",
    subtitle: "Why engineers break the thing on purpose",
    level: "A2",
    estimated_minutes: 25,
    warm_up: ["Question one?", "Question two?", "Question three?"],
    reading: { text: buildReading(300, markedWords), word_count: 300 },
    vocabulary: markedWords.map((word) => ({
      word,
      pos: "adjective",
      definition: "a definition",
      translation: "bir çeviri",
      example: "A brand new example sentence."
    })),
    pronunciation: {
      words: [
        { word: "resilient", respelling: "ri-ZIL-yuhnt", stress: "second", l1_error: "an error" },
        { word: "threshold", respelling: "THRESH-hohld", stress: "first", l1_error: "an error" }
      ],
      shadowing: ["ONE sentence.", "TWO sentence.", "THREE sentence."]
    },
    collocations: Array.from({ length: 5 }, (_, index) => ({
      phrase: `phrase ${index}`,
      meaning: "a meaning",
      register: "neutral"
    })),
    ...overrides
  };
}

function buildValidPractice(itemCount = 8) {
  const items = Array.from({ length: itemCount }, (_, index) => `Sentence ${index} with a ___ gap.`);

  return {
    grammar: {
      structure: "Present perfect",
      core_idea: "An idea.",
      form: [{ type: "positive", pattern: "have + past participle", example: "I have finished." }],
      usage: [{ context: "context", explanation: "explanation", example: "example" }],
      common_errors: [{ wrong: "I am here since Monday.", right: "I have been here since Monday.", why: "reason" }]
    },
    exercises: {
      comprehension: [
        { q: "An open question?", type: "open", options: [] },
        { q: "A multiple choice question?", type: "mcq", options: ["a", "b", "c"] }
      ],
      matching: Array.from({ length: itemCount }, (_, index) => ({ left: `left ${index}`, right: `right ${index}` })),
      gap_fill_vocab: { word_bank: ["resilient"], items },
      grammar_practice: {
        gap_fill: items.map((sentence) => ({ sentence, verb: "go" })),
        transformation: Array.from({ length: 4 }, (_, index) => ({ prompt: `prompt ${index}`, cue: "cue" }))
      },
      error_correction: Array.from({ length: 5 }, (_, index) => `Wrong sentence ${index}.`)
    },
    speaking_tasks: [1, 2, 3].map((number) => ({
      number,
      duration: "45-60s",
      instruction: `Instruction ${number}`,
      target_phrases: ["phrase one", "phrase two"],
      assess: { vocabulary: ["resilient"], grammar: "present perfect" },
      roleplay:
        number === 3
          ? { scenario: "At a hotel desk.", learner_role: "guest", app_role: "receptionist", goals: ["a", "b", "c"] }
          : { scenario: "", learner_role: "", app_role: "", goals: [] }
    })),
    follow_up_questions: ["one?", "two?", "three?", "four?"],
    answer_key: {
      comprehension: [
        { answer: "A model answer.", note: "Other answers work too." },
        { answer: "b", note: "" }
      ],
      gap_fill_vocab: items.map((_, index) => `answer ${index}`),
      grammar_practice: {
        gap_fill: items.map((_, index) => `answer ${index}`),
        transformation: Array.from({ length: 4 }, (_, index) => `answer ${index}`)
      },
      error_correction: Array.from({ length: 5 }, (_, index) => ({
        corrected: `Right sentence ${index}.`,
        note: "note"
      }))
    },
    profile_question: "What made you pick this?"
  };
}

function testWordCountIgnoresMarkers() {
  assert.equal(countWords("one **two** three"), 3);
  assert.equal(extractMarkedWords("one **two** three **four**").join(","), "two,four");
}

function testReadingContainsWordHandlesInflection() {
  const reading = "The engineers **deliberately** closed the valves and the rockets were running hot.";

  assert.ok(readingContainsWord(reading, "deliberately"));
  // The vocabulary entry is usually the dictionary form of a word the text inflects.
  assert.ok(readingContainsWord(reading, "close"), "closed should satisfy the entry 'close'");
  assert.ok(readingContainsWord(reading, "run"), "running should satisfy the entry 'run'");
  assert.ok(readingContainsWord(reading, "engineer"), "engineers should satisfy the entry 'engineer'");
  assert.ok(readingContainsWord(reading, "closed the valves"), "multi-word phrases are checked word by word");
  assert.ok(!readingContainsWord(reading, "turbine"));
}

function testValidCoreProducesNoIssues() {
  const { issues } = validateLessonCore(buildValidCore(), { lessonLevel: "A2", recentTopics: ["something-else"] });

  assert.deepEqual(issues, []);
}

function testCoreRejectsVocabularyThatIsNotInTheText() {
  const core = buildValidCore();
  core.vocabulary.push({
    word: "turbine",
    pos: "noun",
    definition: "d",
    translation: "t",
    example: "e"
  });

  const { issues } = validateLessonCore(core, { lessonLevel: "A2", recentTopics: [] });

  assert.ok(
    issues.some((issue) => issue.includes("turbine")),
    "a vocabulary word missing from the reading must block the lesson"
  );
}

function testCoreRejectsWrongReadingLength() {
  const core = buildValidCore({ reading: { text: buildReading(80, ["resilient", "deliberate", "threshold"]), word_count: 80 } });

  const { issues } = validateLessonCore(core, { lessonLevel: "A2", recentTopics: [] });

  assert.ok(issues.some((issue) => issue.includes("reading text")));
}

function testCoreRejectsRepeatedTopic() {
  const core = buildValidCore();

  const { issues } = validateLessonCore(core, {
    lessonLevel: "A2",
    recentTopics: ["WHY-ENGINES-ARE-TESTED-TO-FAILURE"]
  });

  assert.ok(
    issues.some((issue) => issue.includes("already used")),
    "topic repetition must be caught regardless of case"
  );
}

function testValidPracticeProducesNoIssues() {
  const { issues } = validateLessonPractice(buildValidPractice(), buildValidCore());

  assert.deepEqual(issues, []);
}

function testPracticeRejectsAnswerKeyLengthMismatch() {
  const practice = buildValidPractice();
  practice.answer_key.gap_fill_vocab.pop();

  const { issues } = validateLessonPractice(practice, buildValidCore());

  assert.ok(
    issues.some((issue) => issue.includes("vocabulary gap-fill")),
    "an answer key that is out of step with the exercise must block the lesson"
  );
}

function testPracticeRejectsMissingGapMarker() {
  const practice = buildValidPractice();
  practice.exercises.gap_fill_vocab.items[0] = "This sentence has no gap at all.";

  const { issues } = validateLessonPractice(practice, buildValidCore());

  assert.ok(issues.some((issue) => issue.includes("___")));
}

function testPracticeRejectsWrongTaskCount() {
  const practice = buildValidPractice();
  practice.speaking_tasks.pop();

  const { issues } = validateLessonPractice(practice, buildValidCore());

  assert.ok(issues.some((issue) => issue.includes("speaking tasks")));
}

function testNormalizationRecomputesWordCountAndCamelCases() {
  const core = buildValidCore({ reading: { text: buildReading(300, ["resilient"]), word_count: 9999 } });

  const normalized = normalizeLessonCore(core);

  assert.equal(normalized.reading.wordCount, 300, "the model's own word count is never trusted");
  assert.equal(normalized.topicSlug, core.topic_slug);
  assert.equal(normalized.pronunciation.words[0].l1Error, core.pronunciation.words[0].l1_error);
}

function testPracticeNormalizationKeepsExerciseAndAnswerOrder() {
  const normalized = normalizeLessonPractice(buildValidPractice());

  assert.equal(normalized.exercises.gapFillVocab.items.length, normalized.answerKey.gapFillVocab.length);
  assert.equal(normalized.speakingTasks.length, 3);
  assert.equal(normalized.speakingTasks[2].roleplay.learnerRole, "guest");
  assert.equal(normalized.exercises.comprehension[0].question, "An open question?");
}

const tests = [
  testWordCountIgnoresMarkers,
  testReadingContainsWordHandlesInflection,
  testValidCoreProducesNoIssues,
  testCoreRejectsVocabularyThatIsNotInTheText,
  testCoreRejectsWrongReadingLength,
  testCoreRejectsRepeatedTopic,
  testValidPracticeProducesNoIssues,
  testPracticeRejectsAnswerKeyLengthMismatch,
  testPracticeRejectsMissingGapMarker,
  testPracticeRejectsWrongTaskCount,
  testNormalizationRecomputesWordCountAndCamelCases,
  testPracticeNormalizationKeepsExerciseAndAnswerOrder
];

for (const test of tests) {
  test();
}

console.log(`lesson self-test passed: ${tests.length} checks OK.`);
