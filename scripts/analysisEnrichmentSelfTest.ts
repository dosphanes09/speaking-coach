/**
 * Lightweight self-test for src/services/progress/analysisEnrichmentService.ts.
 *
 * Focuses on the mistakes[] <-> errorPatterns[] consistency guarantee: when the backend
 * has classified each mistake (category/severity/isTurkishTransferError), errorPatterns[]
 * must be derived mechanically from those same values rather than trusting a separately
 * AI-generated list (which could, in principle, disagree with the mistakes table).
 *
 * Run with: npx tsx scripts/analysisEnrichmentSelfTest.ts
 * (mirrors the node:assert self-test style already used in backend/scripts/*.js)
 */
import assert from "node:assert/strict";
import { deriveErrorPatterns, enrichAnalysisForProgress } from "../src/services/progress/analysisEnrichmentService";
import { AnalysisResult, Mistake, RecordedMedia, Topic } from "../src/types/models";

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: "general-topic",
    title: "Talk about your weekend",
    level: "B1",
    category: "personal",
    ...overrides
  };
}

function makeMedia(overrides: Partial<RecordedMedia> = {}): RecordedMedia {
  return {
    uri: "file://recording.m4a",
    type: "audio",
    durationSeconds: 45,
    mimeType: "audio/m4a",
    ...overrides
  };
}

function makeMistake(overrides: Partial<Mistake> = {}): Mistake {
  return {
    id: "mistake-1",
    originalSentence: "I go to school yesterday.",
    problem: "Wrong past tense",
    correctVersion: "I went to school yesterday.",
    explanation: "Use the past simple form 'went' for a completed past action.",
    ...overrides
  };
}

function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    originalTranscript: "I go to school yesterday.",
    correctedVersion: "I went to school yesterday.",
    mistakes: [],
    vocabularySuggestions: [],
    connectorSuggestions: [],
    speakingFeedback: {
      grammar: "Some tense errors.",
      vocabulary: "Fine.",
      fluency: "Fine.",
      coherence: "Fine.",
      confidence: "Fine.",
      repetitionProblems: "None.",
      missingConnectors: "None.",
      pronunciationNotes: "Transcript-based only."
    },
    scores: {
      grammar: 60,
      vocabulary: 80,
      fluency: 80,
      pronunciation: 80,
      coherence: 80,
      naturalness: 80,
      overall: 75
    },
    // Deliberately a mismatched/independent AI-written list, to prove the derived
    // patterns override it rather than passing it through when mistakes carry
    // their own classification.
    errorPatterns: [
      {
        id: "vocabulary:unrelated-ai-pattern",
        category: "vocabulary",
        label: "An unrelated AI-written pattern",
        explanationTR: "This should be ignored once mistakes carry their own classification.",
        exampleOriginal: "",
        exampleCorrected: "",
        severity: "low",
        isTurkishTransferError: false
      }
    ],
    progressTags: [],
    repeatedMistakeCandidates: [],
    improvementPlan: {
      whatWentWell: "Good vocabulary range.",
      topProblems: [],
      tomorrowFocus: "",
      sentencePatterns: [],
      homework: ""
    },
    generatedBy: "backend",
    createdAt: new Date(2026, 0, 1).toISOString(),
    ...overrides
  };
}

function testDeriveErrorPatternsUsesMistakeClassificationWhenPresent() {
  const mistake = makeMistake({
    category: "turkish-transfer",
    severity: "high",
    isTurkishTransferError: true
  });
  const analysis = makeAnalysis({ mistakes: [mistake] });

  const patterns = deriveErrorPatterns(analysis);

  assert.equal(patterns.length, 1);
  assert.equal(patterns[0].category, "turkish-transfer", "Category should come from the mistake's own classification.");
  assert.equal(patterns[0].severity, "high", "Severity should come from the mistake's own classification, not be re-guessed.");
  assert.equal(patterns[0].isTurkishTransferError, true);
}

function testDeriveErrorPatternsFallsBackToKeywordsWhenMistakeHasNoClassification() {
  // No category/severity/isTurkishTransferError set (older/mock-style record).
  const mistake = makeMistake({
    problem: "Wrong verb tense",
    explanation: "The verb tense does not match the past time reference."
  });
  const analysis = makeAnalysis({ mistakes: [mistake] });

  const patterns = deriveErrorPatterns(analysis);

  assert.equal(patterns.length, 1);
  assert.equal(patterns[0].category, "grammar", "Keyword fallback should still classify tense issues as grammar.");
  assert.equal(patterns[0].isTurkishTransferError, false);
}

function testEnrichAnalysisPrefersMistakeDerivedPatternsOverAiErrorPatterns() {
  const mistake = makeMistake({
    problem: "Wrong past tense",
    category: "grammar",
    severity: "medium",
    isTurkishTransferError: false
  });
  const analysis = makeAnalysis({ mistakes: [mistake] });

  const enriched = enrichAnalysisForProgress({
    analysis,
    transcript: analysis.originalTranscript,
    media: makeMedia(),
    topic: makeTopic()
  });

  const categories = (enriched.errorPatterns ?? []).map((pattern) => pattern.category);
  assert.ok(categories.includes("grammar"), "Should surface the grammar pattern derived from the classified mistake.");
  assert.ok(
    !(enriched.errorPatterns ?? []).some((pattern) => pattern.id === "vocabulary:unrelated-ai-pattern"),
    "Should not pass through the independently AI-written errorPatterns list once mistakes are classified, " +
      "since that list could disagree with the mistakes table."
  );
}

function testEnrichAnalysisUsesAiErrorPatternsWhenNoMistakesAreClassified() {
  // No mistakes at all (e.g. a clean answer) -> should keep using the AI-provided errorPatterns as-is.
  const analysis = makeAnalysis({ mistakes: [] });

  const enriched = enrichAnalysisForProgress({
    analysis,
    transcript: analysis.originalTranscript,
    media: makeMedia(),
    topic: makeTopic()
  });

  assert.ok(
    (enriched.errorPatterns ?? []).some((pattern) => pattern.id === "vocabulary:unrelated-ai-pattern"),
    "With no classified mistakes to derive from, the AI-provided errorPatterns list should still be used."
  );
}

testDeriveErrorPatternsUsesMistakeClassificationWhenPresent();
testDeriveErrorPatternsFallsBackToKeywordsWhenMistakeHasNoClassification();
testEnrichAnalysisPrefersMistakeDerivedPatternsOverAiErrorPatterns();
testEnrichAnalysisUsesAiErrorPatternsWhenNoMistakesAreClassified();

console.log(
  "Analysis enrichment self-test passed: errorPatterns are derived mechanically from classified mistakes when available, " +
    "and fall back to the AI-provided list or keyword matching otherwise."
);
