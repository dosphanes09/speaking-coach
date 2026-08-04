/**
 * Lightweight self-test for src/utils/practiceTiming.ts.
 *
 * Run with: npx tsx scripts/practiceTimingSelfTest.ts
 * (mirrors the node:assert self-test style already used elsewhere in scripts/*.ts)
 */
import assert from "node:assert/strict";
import {
  MIN_RECORDING_SECONDS,
  MAX_RECORDING_SECONDS,
  getRecommendedRecordingSeconds,
  clampRecordingSeconds
} from "../src/utils/practiceTiming";
import { Topic } from "../src/types/models";

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: "topic-1",
    title: "Talk",
    level: "A1",
    category: "personal",
    ...overrides
  };
}

function testMinRecordingSecondsIsAtLeast90() {
  assert.ok(
    MIN_RECORDING_SECONDS >= 90,
    "The app-wide speaking floor must never be less than 90 seconds (60s proved too short)."
  );
}

function testSimplestTopicGetsExactlyTheMinimum() {
  // Very short title, lowest-complexity level, no grammar focus, non opinion/story category
  // -> lowest possible complexity score -> should land on the floor, never below it.
  const topic = makeTopic({ title: "Talk", level: "A1", category: "personal" });

  const seconds = getRecommendedRecordingSeconds(topic);

  assert.equal(seconds, MIN_RECORDING_SECONDS);
  assert.ok(seconds >= 90, "Even the simplest topic must give the learner at least 90 seconds.");
}

function testEveryTopicShapeStaysAtOrAboveTheMinimum() {
  const levels: Topic["level"][] = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const categories: Topic["category"][] = ["personal", "work", "education", "opinion", "story"];
  const titles = ["Talk", "Describe your last holiday trip in detail", "Explain a difficult decision you made"];

  for (const level of levels) {
    for (const category of categories) {
      for (const title of titles) {
        const topic = makeTopic({
          title,
          level,
          category,
          grammarFocus: {
            cefrLevel: level,
            grammarTopic: "present perfect",
            expectedStructures: ["have/has + past participle", "for/since"],
            speakingPrompt: "Speak about your experience."
          }
        });

        const seconds = getRecommendedRecordingSeconds(topic);

        assert.ok(
          seconds >= MIN_RECORDING_SECONDS,
          `getRecommendedRecordingSeconds must never return less than ${MIN_RECORDING_SECONDS}s (got ${seconds}s for level=${level}, category=${category}).`
        );
        assert.ok(seconds <= MAX_RECORDING_SECONDS, `Recommended seconds should never exceed the ${MAX_RECORDING_SECONDS}s cap.`);
      }
    }
  }
}

function testComplexityTiersAreStillDistinctAboveTheFloor() {
  // Low complexity -> floor.
  const simple = getRecommendedRecordingSeconds(makeTopic({ title: "Talk", level: "A1", category: "personal" }));
  // Medium complexity: higher level + a couple of expected structures pushes it into the mid tier.
  const medium = getRecommendedRecordingSeconds(
    makeTopic({
      title: "Describe a memorable trip",
      level: "B2",
      category: "personal",
      grammarFocus: {
        cefrLevel: "B2",
        grammarTopic: "conditionals",
        expectedStructures: ["if + past simple, would + base form", "unless"],
        speakingPrompt: "Speak."
      }
    })
  );
  // High complexity: long opinion/story topic at an advanced level with several expected structures.
  const complex = getRecommendedRecordingSeconds(
    makeTopic({
      title: "Discuss the advantages and disadvantages of remote work for young professionals today",
      level: "C1",
      category: "opinion",
      grammarFocus: {
        cefrLevel: "C1",
        grammarTopic: "mixed conditionals",
        expectedStructures: ["had + past participle, would + base form", "were it not for", "as long as"],
        speakingPrompt: "Speak."
      }
    })
  );

  assert.equal(simple, MIN_RECORDING_SECONDS);
  assert.ok(medium > simple, "A moderately complex topic should still get more time than the simplest one.");
  assert.ok(complex >= medium, "The most complex topic should get at least as much time as a medium one.");
  assert.equal(complex, MAX_RECORDING_SECONDS);
}

function testClampRecordingSecondsNeverGoesBelowTheFloor() {
  assert.equal(clampRecordingSeconds(10), MIN_RECORDING_SECONDS);
  assert.equal(clampRecordingSeconds(0), MIN_RECORDING_SECONDS);
  assert.equal(clampRecordingSeconds(Number.NaN), MIN_RECORDING_SECONDS);
}

function testClampRecordingSecondsCapsAtTheMaximum() {
  assert.equal(clampRecordingSeconds(999), MAX_RECORDING_SECONDS);
}

function testClampRecordingSecondsPassesThroughValidValues() {
  assert.equal(clampRecordingSeconds(100), 100);
}

const tests = [
  testMinRecordingSecondsIsAtLeast90,
  testSimplestTopicGetsExactlyTheMinimum,
  testEveryTopicShapeStaysAtOrAboveTheMinimum,
  testComplexityTiersAreStillDistinctAboveTheFloor,
  testClampRecordingSecondsNeverGoesBelowTheFloor,
  testClampRecordingSecondsCapsAtTheMaximum,
  testClampRecordingSecondsPassesThroughValidValues
];

for (const test of tests) {
  test();
}

console.log(`practiceTiming self-test passed: ${tests.length} checks OK.`);
