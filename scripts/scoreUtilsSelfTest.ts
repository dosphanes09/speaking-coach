/**
 * Lightweight self-test for src/services/progress/scoreUtils.ts.
 *
 * Run with: npx tsx scripts/scoreUtilsSelfTest.ts
 * (mirrors the node:assert self-test style already used in backend/scripts/*.js)
 */
import assert from "node:assert/strict";
import {
  normalizeScoreValue,
  normalizeScores,
  formatScore100,
  scoreDelta,
  SCORE_METRICS,
  SCORE_LABELS
} from "../src/services/progress/scoreUtils";
import { SpeakingScores } from "../src/types/models";

function testNormalizeScoreValueScalesZeroToTenScale() {
  assert.equal(normalizeScoreValue(8.5), 85, "A 0-10 scale value should be multiplied by 10.");
  assert.equal(normalizeScoreValue(0), 0, "Zero should stay zero.");
  assert.equal(normalizeScoreValue(10), 100, "10 on a 0-10 scale should become 100.");
}

function testNormalizeScoreValueLeavesZeroToHundredScaleAlone() {
  assert.equal(normalizeScoreValue(87), 87, "A value already above 10 should be treated as a 0-100 score.");
  assert.equal(normalizeScoreValue(100), 100, "100 should stay 100.");
}

function testNormalizeScoreValueClampsOutOfRangeInput() {
  assert.equal(normalizeScoreValue(150), 100, "Values above 100 should be clamped to 100.");
  assert.equal(normalizeScoreValue(-20), 0, "Negative values should be clamped to 0.");
}

function testNormalizeScoreValueFallsBackForInvalidInput() {
  assert.equal(normalizeScoreValue(undefined, 4), 40, "Undefined should use the fallback (scaled like any other 0-10 value).");
  assert.equal(normalizeScoreValue(Number.NaN, 0), 0, "NaN should fall back to the provided default.");
  assert.equal(normalizeScoreValue(Number.POSITIVE_INFINITY, 5), 50, "Infinity should be treated as invalid and use the fallback.");
}

function testNormalizeScoresDefaultsPronunciationAndNaturalness() {
  const scores: SpeakingScores = {
    grammar: 9,
    vocabulary: 8,
    fluency: 7,
    coherence: 6,
    overall: 8
    // pronunciation and naturalness intentionally omitted
  };

  const normalized = normalizeScores(scores);

  assert.equal(normalized.pronunciation, normalized.fluency, "Missing pronunciation should default to the normalized fluency score.");
  assert.equal(normalized.naturalness, normalized.coherence, "Missing naturalness should default to the normalized coherence score.");
  assert.equal(normalized.grammar, 90);
  assert.equal(normalized.vocabulary, 80);
  assert.equal(normalized.overall, 80);
}

function testNormalizeScoresRespectsExplicitPronunciationAndNaturalness() {
  const scores: SpeakingScores = {
    grammar: 9,
    vocabulary: 8,
    fluency: 7,
    pronunciation: 5,
    coherence: 6,
    naturalness: 4,
    overall: 8
  };

  const normalized = normalizeScores(scores);

  assert.equal(normalized.pronunciation, 50, "An explicit pronunciation score should not be overridden by fluency.");
  assert.equal(normalized.naturalness, 40, "An explicit naturalness score should not be overridden by coherence.");
}

function testFormatScore100RoundsAndClamps() {
  assert.equal(formatScore100(87.4), "87", "Should round to the nearest whole number string.");
  assert.equal(formatScore100(87.5), "88", "Should round half up.");
  assert.equal(formatScore100(150), "100", "Should clamp above 100 before formatting.");
  assert.equal(formatScore100(-5), "0", "Should clamp below 0 before formatting.");
}

function testScoreDeltaComputesRoundedDifference() {
  assert.equal(scoreDelta(80, 70), 10, "Simple positive delta.");
  assert.equal(scoreDelta(70, 80), -10, "Simple negative delta.");
  assert.equal(scoreDelta(80.36, 80), 0.4, "Delta should round to one decimal place.");
}

function testScoreDeltaClampsInputsBeforeComparing() {
  assert.equal(scoreDelta(150, 70), 30, "Current score above 100 should be clamped before the delta is computed.");
  assert.equal(scoreDelta(80, -20), 80, "Previous score below 0 should be clamped before the delta is computed.");
}

function testScoreMetricsAndLabelsStayInSync() {
  for (const metric of SCORE_METRICS) {
    assert.ok(SCORE_LABELS[metric], `SCORE_LABELS is missing an entry for metric "${metric}".`);
  }
  assert.equal(SCORE_METRICS.length, Object.keys(SCORE_LABELS).length, "SCORE_METRICS and SCORE_LABELS should describe the same set of metrics.");
}

const tests = [
  testNormalizeScoreValueScalesZeroToTenScale,
  testNormalizeScoreValueLeavesZeroToHundredScaleAlone,
  testNormalizeScoreValueClampsOutOfRangeInput,
  testNormalizeScoreValueFallsBackForInvalidInput,
  testNormalizeScoresDefaultsPronunciationAndNaturalness,
  testNormalizeScoresRespectsExplicitPronunciationAndNaturalness,
  testFormatScore100RoundsAndClamps,
  testScoreDeltaComputesRoundedDifference,
  testScoreDeltaClampsInputsBeforeComparing,
  testScoreMetricsAndLabelsStayInSync
];

for (const test of tests) {
  test();
}

console.log(`scoreUtils self-test passed: ${tests.length} checks OK.`);
