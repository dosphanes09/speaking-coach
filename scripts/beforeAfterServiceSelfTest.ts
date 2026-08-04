/**
 * Lightweight self-test for src/services/progress/beforeAfterService.ts.
 *
 * Covers the "retry this question" flow added to RecordDetailScreen: a learner picks a past
 * record and deliberately re-answers the same question. findTopicAttempts() is what lets the
 * screen list every other attempt at that same question (not just the single most recent one
 * that buildLatestTopicComparison/findPreviousTopicRecord already used for the automatic
 * before/after card), so this test locks in that both stay consistent with each other after
 * the shared matching logic was factored out into recordsForSameTopic().
 *
 * Run with: npx tsx scripts/beforeAfterServiceSelfTest.ts
 * (mirrors the node:assert self-test style already used elsewhere in scripts/*.ts)
 */
import assert from "node:assert/strict";
import { buildLatestTopicComparison, findTopicAttempts } from "../src/services/progress/beforeAfterService";
import { AnalysisResult, SpeakingRecord, Topic } from "../src/types/models";

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: "general-topic-1",
    title: "Talk about your weekend",
    level: "B1",
    category: "personal",
    ...overrides
  };
}

function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    originalTranscript: "I go to park yesterday.",
    correctedVersion: "I went to the park yesterday.",
    mistakes: [],
    vocabularySuggestions: [],
    connectorSuggestions: [],
    speakingFeedback: {
      grammar: "",
      vocabulary: "",
      fluency: "",
      coherence: "",
      confidence: "",
      repetitionProblems: "",
      missingConnectors: "",
      pronunciationNotes: ""
    },
    scores: { grammar: 70, vocabulary: 70, fluency: 70, coherence: 70, overall: 70 },
    improvementPlan: { whatWentWell: "", topProblems: [], tomorrowFocus: "", sentencePatterns: [], homework: "" },
    generatedBy: "backend",
    createdAt: "2026-07-01T09:00:00.000Z",
    ...overrides
  };
}

function makeRecord(overrides: Partial<SpeakingRecord> = {}): SpeakingRecord {
  const topic = overrides.topic ?? makeTopic();
  return {
    id: `record-${Math.round(Number(overrides.createdAt ? Date.parse(overrides.createdAt) : 0))}`,
    createdAt: "2026-07-01T09:00:00.000Z",
    topic,
    media: { uri: "file://a.m4a", type: "audio", durationSeconds: 60, mimeType: "audio/m4a" },
    transcript: "I go to park yesterday.",
    correctedVersion: "I went to the park yesterday.",
    analysis: makeAnalysis(),
    scores: { grammar: 70, vocabulary: 70, fluency: 70, coherence: 70, overall: 70 },
    syncStatus: "local",
    ...overrides
  };
}

function testFindTopicAttemptsMatchesByTopicId() {
  const current = makeRecord({ id: "current", topic: makeTopic({ id: "topic-a" }), createdAt: "2026-07-10T09:00:00.000Z" });
  const sameTopicOlder = makeRecord({ id: "older", topic: makeTopic({ id: "topic-a" }), createdAt: "2026-07-01T09:00:00.000Z" });
  const differentTopic = makeRecord({ id: "other", topic: makeTopic({ id: "topic-b", title: "Talk about food" }) });

  const attempts = findTopicAttempts(current, [current, sameTopicOlder, differentTopic]);

  assert.deepEqual(attempts.map((record) => record.id), ["older"]);
}

function testFindTopicAttemptsExcludesTheCurrentRecordItself() {
  const current = makeRecord({ id: "current" });

  const attempts = findTopicAttempts(current, [current]);

  assert.deepEqual(attempts, [], "A record must never list itself as one of its own other attempts.");
}

function testFindTopicAttemptsMatchesByNormalizedTitleWhenIdsDiffer() {
  // Different topic.id values (e.g. regenerated ids) but the same question text should still
  // be treated as the same question, mirroring findPreviousTopicRecord's existing fallback.
  const current = makeRecord({ id: "current", topic: makeTopic({ id: "topic-x", title: "  Talk about your Weekend  " }) });
  const sameQuestionDifferentId = makeRecord({ id: "same-title", topic: makeTopic({ id: "topic-y", title: "talk about your weekend" }) });

  const attempts = findTopicAttempts(current, [current, sameQuestionDifferentId]);

  assert.deepEqual(attempts.map((record) => record.id), ["same-title"]);
}

function testFindTopicAttemptsSortsNewestFirstAndIncludesAllAttemptsNotJustTheLatest() {
  const topic = makeTopic({ id: "topic-a" });
  const current = makeRecord({ id: "current", topic, createdAt: "2026-07-20T09:00:00.000Z" });
  const middle = makeRecord({ id: "middle", topic, createdAt: "2026-07-10T09:00:00.000Z" });
  const oldest = makeRecord({ id: "oldest", topic, createdAt: "2026-07-01T09:00:00.000Z" });

  const attempts = findTopicAttempts(current, [oldest, current, middle]);

  assert.deepEqual(
    attempts.map((record) => record.id),
    ["middle", "oldest"],
    "findTopicAttempts should return every other attempt (not just the most recent one), newest first."
  );
}

function testBuildLatestTopicComparisonStillOnlyUsesTheSingleMostRecentAttempt() {
  const topic = makeTopic({ id: "topic-a" });
  const current = makeRecord({
    id: "current",
    topic,
    createdAt: "2026-07-20T09:00:00.000Z",
    scores: { grammar: 80, vocabulary: 80, fluency: 80, coherence: 80, overall: 80 }
  });
  const middle = makeRecord({
    id: "middle",
    topic,
    createdAt: "2026-07-10T09:00:00.000Z",
    scores: { grammar: 60, vocabulary: 60, fluency: 60, coherence: 60, overall: 60 }
  });
  const oldest = makeRecord({
    id: "oldest",
    topic,
    createdAt: "2026-07-01T09:00:00.000Z",
    scores: { grammar: 40, vocabulary: 40, fluency: 40, coherence: 40, overall: 40 }
  });

  const comparison = buildLatestTopicComparison(current, [oldest, middle]);

  assert.ok(comparison, "A previous attempt at the same topic exists, so a comparison must be built.");
  assert.equal(
    comparison!.beforeRecord.id,
    "middle",
    "The automatic before/after card must compare against the single most recent prior attempt, not the oldest one."
  );
}

function testBuildLatestTopicComparisonReturnsNullWithNoPriorAttempt() {
  const current = makeRecord({ id: "current" });

  const comparison = buildLatestTopicComparison(current, []);

  assert.equal(comparison, null);
}

const tests = [
  testFindTopicAttemptsMatchesByTopicId,
  testFindTopicAttemptsExcludesTheCurrentRecordItself,
  testFindTopicAttemptsMatchesByNormalizedTitleWhenIdsDiffer,
  testFindTopicAttemptsSortsNewestFirstAndIncludesAllAttemptsNotJustTheLatest,
  testBuildLatestTopicComparisonStillOnlyUsesTheSingleMostRecentAttempt,
  testBuildLatestTopicComparisonReturnsNullWithNoPriorAttempt
];

for (const test of tests) {
  test();
}

console.log(`beforeAfterService self-test passed: ${tests.length} checks OK.`);
