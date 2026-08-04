/**
 * Lightweight self-test for src/services/records/recordClassification.ts.
 *
 * Run with: npx tsx scripts/recordClassificationSelfTest.ts
 * (mirrors the node:assert self-test style already used in backend/scripts/*.js)
 */
import assert from "node:assert/strict";
import {
  getPracticeTypeFromTopic,
  getPracticeType,
  isGrammarPracticeRecord,
  isPictureDescriptionRecord,
  buildGrammarGroupFromTopic,
  getGrammarRecordLevel
} from "../src/services/records/recordClassification";
import { SpeakingRecord, Topic } from "../src/types/models";

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: "general-topic",
    title: "Talk about your weekend",
    level: "B1",
    category: "personal",
    ...overrides
  };
}

// Only the fields recordClassification actually reads are filled in; the rest are cast away.
function makeRecord(overrides: Partial<SpeakingRecord> = {}): SpeakingRecord {
  return {
    id: "record-1",
    topic: makeTopic(),
    ...overrides
  } as unknown as SpeakingRecord;
}

function testGeneralTopicYieldsGeneralPracticeType() {
  const topic = makeTopic({ id: "general-topic" });
  assert.equal(getPracticeTypeFromTopic(topic), "general");
}

function testPicturePromptContextForcesPictureDescription() {
  const topic = makeTopic({
    id: "some-random-id",
    picturePromptContext: { mode: "picture_description" } as unknown as Topic["picturePromptContext"]
  });

  assert.equal(getPracticeTypeFromTopic(topic), "picture_description");
}

function testPictureIdPatternForcesPictureDescriptionEvenWithoutContext() {
  const topic = makeTopic({ id: "picture-a2-cafe-reading-red-bag" });
  assert.equal(getPracticeTypeFromTopic(topic), "picture_description");
}

function testGrammarFocusForcesGrammarPracticeType() {
  const topic = makeTopic({
    id: "some-random-id",
    grammarFocus: {
      cefrLevel: "B2",
      grammarTopic: "Conditionals",
      expectedStructures: ["if + past simple, would + verb"],
      speakingPrompt: "Describe a hypothetical situation."
    }
  });

  assert.equal(getPracticeTypeFromTopic(topic), "grammar");
}

function testGrammarIdPatternForcesGrammarTypeWithoutExplicitFocus() {
  const topic = makeTopic({ id: "grammar-b1-past-continuous" });
  assert.equal(getPracticeTypeFromTopic(topic), "grammar");
}

function testPictureTakesPriorityOverGrammarWhenBothCouldMatch() {
  // A picture-prefixed id should win even if a (contrived) grammarFocus is also present,
  // because getPracticeTypeFromTopic checks the picture condition first.
  const topic = makeTopic({
    id: "picture-b1-something",
    grammarFocus: {
      cefrLevel: "B1",
      grammarTopic: "Conditionals",
      expectedStructures: [],
      speakingPrompt: ""
    }
  });

  assert.equal(getPracticeTypeFromTopic(topic), "picture_description");
}

function testGetPracticeTypePrefersExplicitRecordValueOverTopicDerivation() {
  const record = makeRecord({
    practiceType: "listening_picture_match",
    topic: makeTopic({ id: "grammar-b1-past-continuous" }) // would otherwise derive to "grammar"
  });

  assert.equal(getPracticeType(record), "listening_picture_match");
}

function testGetPracticeTypeFallsBackToTopicWhenRecordHasNoExplicitType() {
  const record = makeRecord({ topic: makeTopic({ id: "picture-a1-kitchen-breakfast" }) });
  assert.equal(getPracticeType(record), "picture_description");
}

function testIsGrammarAndIsPictureHelpersAgreeWithGetPracticeType() {
  const grammarRecord = makeRecord({ topic: makeTopic({ id: "grammar-a2-present-simple" }) });
  const pictureRecord = makeRecord({ topic: makeTopic({ id: "picture-b2-office-meeting-chart" }) });
  const generalRecord = makeRecord({ topic: makeTopic({ id: "general-topic" }) });

  assert.equal(isGrammarPracticeRecord(grammarRecord), true);
  assert.equal(isPictureDescriptionRecord(grammarRecord), false);

  assert.equal(isPictureDescriptionRecord(pictureRecord), true);
  assert.equal(isGrammarPracticeRecord(pictureRecord), false);

  assert.equal(isGrammarPracticeRecord(generalRecord), false);
  assert.equal(isPictureDescriptionRecord(generalRecord), false);
}

function testBuildGrammarGroupReturnsUndefinedForNonGrammarTopic() {
  const topic = makeTopic({ id: "general-topic" });
  assert.equal(buildGrammarGroupFromTopic(topic), undefined);
}

function testBuildGrammarGroupUsesExplicitGrammarFocus() {
  const topic = makeTopic({
    id: "some-custom-id",
    grammarFocus: {
      cefrLevel: "C1",
      grammarTopic: "Reported speech",
      expectedStructures: ["said that + past perfect"],
      speakingPrompt: "Report what your colleague told you."
    }
  });

  const group = buildGrammarGroupFromTopic(topic);

  assert.ok(group);
  assert.equal(group!.level, "C1");
  assert.equal(group!.grammarTopic, "Reported speech");
  assert.equal(group!.challengeId, undefined, "No grammar-*-* id pattern, so there is no challenge id to extract.");
}

function testBuildGrammarGroupDerivesLevelAndChallengeIdFromIdPattern() {
  const topic = makeTopic({ id: "grammar-b1-conditionals", level: "A2" });

  const group = buildGrammarGroupFromTopic(topic);

  assert.ok(group);
  assert.equal(group!.level, "B1", "Level should come from the id pattern, not the topic's general level.");
  assert.equal(group!.grammarTopic, "Grammar speaking challenge", "Should fall back to the default label when no grammarFocus is set.");
  assert.equal(group!.challengeId, "conditionals");
}

function testGetGrammarRecordLevelPrefersRecordGroupThenTopicFocusThenTopicLevel() {
  const withGroupLevel = makeRecord({
    grammarGroup: { level: "C2", grammarTopic: "X" },
    topic: makeTopic({ level: "A1", grammarFocus: { cefrLevel: "B1", grammarTopic: "Y", expectedStructures: [], speakingPrompt: "" } })
  });
  assert.equal(getGrammarRecordLevel(withGroupLevel), "C2");

  const withTopicFocusOnly = makeRecord({
    topic: makeTopic({ level: "A1", grammarFocus: { cefrLevel: "B1", grammarTopic: "Y", expectedStructures: [], speakingPrompt: "" } })
  });
  assert.equal(getGrammarRecordLevel(withTopicFocusOnly), "B1");

  const withTopicLevelOnly = makeRecord({ topic: makeTopic({ level: "A2" }) });
  assert.equal(getGrammarRecordLevel(withTopicLevelOnly), "A2");
}

const tests = [
  testGeneralTopicYieldsGeneralPracticeType,
  testPicturePromptContextForcesPictureDescription,
  testPictureIdPatternForcesPictureDescriptionEvenWithoutContext,
  testGrammarFocusForcesGrammarPracticeType,
  testGrammarIdPatternForcesGrammarTypeWithoutExplicitFocus,
  testPictureTakesPriorityOverGrammarWhenBothCouldMatch,
  testGetPracticeTypePrefersExplicitRecordValueOverTopicDerivation,
  testGetPracticeTypeFallsBackToTopicWhenRecordHasNoExplicitType,
  testIsGrammarAndIsPictureHelpersAgreeWithGetPracticeType,
  testBuildGrammarGroupReturnsUndefinedForNonGrammarTopic,
  testBuildGrammarGroupUsesExplicitGrammarFocus,
  testBuildGrammarGroupDerivesLevelAndChallengeIdFromIdPattern,
  testGetGrammarRecordLevelPrefersRecordGroupThenTopicFocusThenTopicLevel
];

for (const test of tests) {
  test();
}

console.log(`recordClassification self-test passed: ${tests.length} checks OK.`);
