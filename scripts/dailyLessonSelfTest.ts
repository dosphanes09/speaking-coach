/**
 * Lightweight self-test for src/services/lesson/dailyLessonLogic.ts.
 *
 * Run with: npx tsx scripts/dailyLessonSelfTest.ts
 * (mirrors the node:assert self-test style already used elsewhere in scripts/*.ts)
 */
import assert from "node:assert/strict";
import {
  MAX_RECENT_LESSON_TOPICS,
  appendTopicSlug,
  buildLessonSpeakingTopic,
  buildMatchingDisplay,
  buildProfileSessionSummary,
  isLessonForDate,
  parseMarkedText,
  splitLessonParagraphs,
  stripLessonMarkers
} from "../src/services/lesson/dailyLessonLogic";
import { DailyLesson, LessonSpeakingTask } from "../src/types/models";

function makeTask(overrides: Partial<LessonSpeakingTask> = {}): LessonSpeakingTask {
  return {
    number: 1,
    duration: "45-60s",
    instruction: "Describe a time you had to fix something yourself.",
    targetPhrases: ["at first", "in the end"],
    assess: { vocabulary: ["resilient", "threshold"], grammar: "past simple" },
    roleplay: { scenario: "", learnerRole: "", appRole: "", goals: [] },
    ...overrides
  };
}

function makeLesson(overrides: Partial<DailyLesson> = {}): DailyLesson {
  return {
    id: "lesson_1",
    dateKey: "2026-08-23",
    createdAt: "2026-08-23T06:00:00.000Z",
    level: "B1",
    todayContext: "I fixed my bike chain",
    warnings: [],
    core: {
      topicSlug: "why-things-break",
      title: "Why things break",
      subtitle: "The engineering of failure",
      level: "B1",
      estimatedMinutes: 25,
      warmUp: [],
      reading: { text: "Some **resilient** text.", wordCount: 3 },
      vocabulary: [],
      pronunciation: { words: [], shadowing: [] },
      collocations: []
    },
    ...overrides
  };
}

function testParseMarkedTextSplitsTargetWords() {
  const segments = parseMarkedText("A **resilient** part of the **machine**.");

  assert.deepEqual(
    segments.map((segment) => [segment.text, segment.marked]),
    [
      ["A ", false],
      ["resilient", true],
      [" part of the ", false],
      ["machine", true],
      [".", false]
    ]
  );
}

function testParseMarkedTextHandlesTextWithoutMarkers() {
  assert.deepEqual(parseMarkedText("Plain text."), [{ text: "Plain text.", marked: false }]);
  assert.deepEqual(parseMarkedText(""), []);
}

function testStripMarkersAndParagraphs() {
  assert.equal(stripLessonMarkers("a **b** c"), "a b c");
  assert.deepEqual(splitLessonParagraphs("One.\n\nTwo.\n\n\nThree."), ["One.", "Two.", "Three."]);
}

function testTopicHistoryIsNewestFirstAndDeduplicated() {
  let history = appendTopicSlug([], "first-topic");
  history = appendTopicSlug(history, "second-topic");
  // The same lesson is saved twice (once per generation stage); that must not fill the history.
  history = appendTopicSlug(history, "Second-Topic");

  assert.deepEqual(history, ["second-topic", "first-topic"]);
}

function testTopicHistoryStaysWithinItsLimit() {
  let history: string[] = [];
  for (let index = 0; index < MAX_RECENT_LESSON_TOPICS + 5; index += 1) {
    history = appendTopicSlug(history, `topic-${index}`);
  }

  assert.equal(history.length, MAX_RECENT_LESSON_TOPICS);
  assert.equal(history[0], `topic-${MAX_RECENT_LESSON_TOPICS + 4}`);
}

function testEmptySlugDoesNotEnterHistory() {
  assert.deepEqual(appendTopicSlug(["a"], "   "), ["a"]);
}

function testIsLessonForDate() {
  assert.ok(isLessonForDate(makeLesson(), "2026-08-23"));
  assert.ok(!isLessonForDate(makeLesson(), "2026-08-24"));
  assert.ok(!isLessonForDate(null, "2026-08-23"));
}

function testSpeakingTopicCarriesTheTargetLanguage() {
  const topic = buildLessonSpeakingTopic(makeLesson(), makeTask());

  assert.equal(topic.id, "lesson-why-things-break-task-1");
  assert.equal(topic.level, "B1");
  assert.equal(topic.grammarFocus?.grammarTopic, "past simple");
  assert.deepEqual(topic.grammarFocus?.expectedStructures, ["resilient", "threshold", "at first", "in the end"]);
  assert.equal(topic.grammarFocus?.speakingPrompt, "Describe a time you had to fix something yourself.");
}

function testSpeakingTopicStaysInsideBackendFieldLimits() {
  const longInstruction = "word ".repeat(200);
  const topic = buildLessonSpeakingTopic(
    makeLesson(),
    makeTask({ number: 2, instruction: longInstruction })
  );

  // /api/analyze-speech rejects the whole recording when these overflow, and by then the
  // learner has already spoken.
  assert.ok(topic.title.length <= 200, `title was ${topic.title.length} characters`);
  assert.ok((topic.grammarFocus?.speakingPrompt.length ?? 0) <= 300);
  assert.equal(topic.category, "opinion");
}

function testRoleplayTaskBecomesTheSpeakingPrompt() {
  const topic = buildLessonSpeakingTopic(
    makeLesson(),
    makeTask({
      number: 3,
      roleplay: {
        scenario: "You are at a repair shop.",
        learnerRole: "the customer",
        appRole: "the mechanic",
        goals: ["explain the problem", "ask for a price", "agree on a date"]
      }
    })
  );

  assert.equal(topic.category, "story");
  assert.ok(topic.grammarFocus?.speakingPrompt.includes("repair shop"));
  assert.ok(topic.grammarFocus?.speakingPrompt.includes("ask for a price"));
}

function testMatchingDisplayShufflesButKeepsCorrectAnswers() {
  const pairs = Array.from({ length: 8 }, (_, index) => ({
    left: `left ${index}`,
    right: `right ${index}`
  }));

  const display = buildMatchingDisplay(pairs);

  assert.equal(display.prompts.length, 8);
  assert.equal(display.options.length, 8);
  assert.equal(new Set(display.options.map((option) => option.right)).size, 8, "every half appears exactly once");

  const optionsByLetter = new Map(display.options.map((option) => [option.letter, option.right]));
  for (const prompt of display.prompts) {
    const expectedRight = `right ${prompt.number - 1}`;
    assert.equal(
      optionsByLetter.get(prompt.answerLetter),
      expectedRight,
      `prompt ${prompt.number} must point at its own half`
    );
  }

  const isShuffled = display.options.some((option, index) => option.right !== `right ${index}`);
  assert.ok(isShuffled, "the right column must not be shown in the same order as the left one");
}

function testMatchingDisplayHandlesSmallAndEmptyExercises() {
  assert.deepEqual(buildMatchingDisplay([]), { prompts: [], options: [] });

  for (const count of [1, 2, 3, 4, 5, 6, 7, 9, 12]) {
    const pairs = Array.from({ length: count }, (_, index) => ({ left: `l${index}`, right: `r${index}` }));
    const display = buildMatchingDisplay(pairs);

    assert.equal(display.options.length, count, `count ${count}`);
    assert.equal(new Set(display.options.map((option) => option.right)).size, count, `count ${count} is a permutation`);

    const optionsByLetter = new Map(display.options.map((option) => [option.letter, option.right]));
    for (const prompt of display.prompts) {
      assert.equal(optionsByLetter.get(prompt.answerLetter), `r${prompt.number - 1}`, `count ${count} answers`);
    }
  }
}

function testProfileSummaryIncludesTheAnswerAndContext() {
  const summary = buildProfileSessionSummary(makeLesson(), "  I like fixing things.  ");

  assert.ok(summary.includes("Why things break"));
  assert.ok(summary.includes("I fixed my bike chain"));
  assert.ok(summary.includes("I like fixing things."));
}

const tests = [
  testParseMarkedTextSplitsTargetWords,
  testParseMarkedTextHandlesTextWithoutMarkers,
  testStripMarkersAndParagraphs,
  testTopicHistoryIsNewestFirstAndDeduplicated,
  testTopicHistoryStaysWithinItsLimit,
  testEmptySlugDoesNotEnterHistory,
  testIsLessonForDate,
  testSpeakingTopicCarriesTheTargetLanguage,
  testSpeakingTopicStaysInsideBackendFieldLimits,
  testRoleplayTaskBecomesTheSpeakingPrompt,
  testMatchingDisplayShufflesButKeepsCorrectAnswers,
  testMatchingDisplayHandlesSmallAndEmptyExercises,
  testProfileSummaryIncludesTheAnswerAndContext
];

for (const test of tests) {
  test();
}

console.log(`dailyLesson self-test passed: ${tests.length} checks OK.`);
