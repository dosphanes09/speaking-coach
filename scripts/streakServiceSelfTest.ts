/**
 * Lightweight self-test for src/services/streak/streakService.ts.
 *
 * Run with: npx tsx scripts/streakServiceSelfTest.ts
 * (mirrors the node:assert self-test style already used in backend/scripts/*.js)
 */
import assert from "node:assert/strict";
import {
  calculateStreak,
  getPracticeDayKeys,
  toLocalDayKey,
  STREAK_GRACE_DAYS
} from "../src/services/streak/streakService";
import { SpeakingRecord } from "../src/types/models";

// Only `createdAt` is read by streakService, so a minimal fixture is enough here.
function makeRecord(year: number, month1to12: number, day: number, id = `${year}-${month1to12}-${day}`): SpeakingRecord {
  const localNoon = new Date(year, month1to12 - 1, day, 12, 0, 0);
  return { id, createdAt: localNoon.toISOString() } as unknown as SpeakingRecord;
}

function localDate(year: number, month1to12: number, day: number): Date {
  return new Date(year, month1to12 - 1, day, 12, 0, 0);
}

function testNoRecordsMeansNotStarted() {
  const summary = calculateStreak([], localDate(2026, 7, 20));

  assert.equal(summary.currentStreakDays, 0);
  assert.equal(summary.longestStreakDays, 0);
  assert.equal(summary.practicedToday, false);
  assert.equal(summary.daysSinceLastPractice, null);
  assert.equal(summary.lastPracticeDayKey, null);
  assert.equal(summary.statusLabel, "Not started yet");
}

function testPracticedTodayCountsTowardStreak() {
  const now = localDate(2026, 7, 20);
  const records = [makeRecord(2026, 7, 20), makeRecord(2026, 7, 19), makeRecord(2026, 7, 18)];

  const summary = calculateStreak(records, now);

  assert.equal(summary.practicedToday, true);
  assert.equal(summary.currentStreakDays, 3, "Three consecutive days ending today should give a 3-day streak.");
  assert.equal(summary.daysSinceLastPractice, 0);
  assert.equal(summary.graceDaysRemaining, STREAK_GRACE_DAYS);
  assert.equal(summary.statusLabel, "Done for today");
}

function testMissedDayStaysWithinGracePeriod() {
  // Last practice was yesterday; today has no practice yet, but grace days are still available.
  const now = localDate(2026, 7, 20);
  const records = [makeRecord(2026, 7, 19), makeRecord(2026, 7, 18)];

  const summary = calculateStreak(records, now);

  assert.equal(summary.practicedToday, false);
  assert.equal(summary.daysSinceLastPractice, 1);
  assert.equal(summary.currentStreakDays, 2, "The streak should still count while inside the grace window.");
  assert.equal(summary.graceDaysRemaining, STREAK_GRACE_DAYS - 1);
  assert.match(summary.statusLabel, /grace period/i);
}

function testLastDayOfGraceIsFlagged() {
  const now = localDate(2026, 7, 20);
  // STREAK_GRACE_DAYS is 3, so a gap of exactly 3 days is still within grace but with 0 days left.
  const records = [makeRecord(2026, 7, 20 - STREAK_GRACE_DAYS)];

  const summary = calculateStreak(records, now);

  assert.equal(summary.daysSinceLastPractice, STREAK_GRACE_DAYS);
  assert.equal(summary.graceDaysRemaining, 0);
  assert.equal(summary.statusLabel, "Last day of grace");
  assert.match(summary.helperText, /resets if you don't practice today/i);
}

function testGapBeyondGraceResetsStreak() {
  const now = localDate(2026, 7, 20);
  const records = [makeRecord(2026, 7, 10), makeRecord(2026, 7, 9), makeRecord(2026, 7, 8)];

  const summary = calculateStreak(records, now);

  assert.equal(summary.currentStreakDays, 0, "A gap longer than the grace period should reset the current streak.");
  assert.equal(summary.statusLabel, "Streak reset");
  assert.equal(summary.longestStreakDays, 3, "Longest streak should still reflect the best historical run.");
}

function testLongestStreakLooksAcrossNonConsecutiveRuns() {
  const now = localDate(2026, 7, 20);
  const records = [
    // Recent 2-day run (ends today).
    makeRecord(2026, 7, 20),
    makeRecord(2026, 7, 19),
    // Older, longer 4-day run further in the past.
    makeRecord(2026, 6, 1),
    makeRecord(2026, 6, 2),
    makeRecord(2026, 6, 3),
    makeRecord(2026, 6, 4)
  ];

  const summary = calculateStreak(records, now);

  assert.equal(summary.currentStreakDays, 2, "Current streak should only reflect the run touching today.");
  assert.equal(summary.longestStreakDays, 4, "Longest streak should find the best run anywhere in history.");
}

function testGetPracticeDayKeysDedupesAndSortsDescending() {
  const records = [
    makeRecord(2026, 7, 18),
    makeRecord(2026, 7, 20),
    makeRecord(2026, 7, 19),
    // Same calendar day as the first record, different time of day -> should collapse to one key.
    { id: "dup", createdAt: new Date(2026, 6, 18, 23, 0, 0).toISOString() } as unknown as SpeakingRecord
  ];

  const keys = getPracticeDayKeys(records);

  assert.deepEqual(keys, [toLocalDayKey(localDate(2026, 7, 20)), toLocalDayKey(localDate(2026, 7, 19)), toLocalDayKey(localDate(2026, 7, 18))]);
}

function testGetPracticeDayKeysIgnoresInvalidDates() {
  const records = [makeRecord(2026, 7, 20), { id: "bad", createdAt: "not-a-date" } as unknown as SpeakingRecord];

  const keys = getPracticeDayKeys(records);

  assert.deepEqual(keys, [toLocalDayKey(localDate(2026, 7, 20))], "Records with an unparsable createdAt should be skipped, not crash.");
}

function testToLocalDayKeyPadsMonthAndDay() {
  assert.equal(toLocalDayKey(new Date(2026, 0, 5, 12)), "2026-01-05", "Single-digit month and day should be zero-padded.");
}

const tests = [
  testNoRecordsMeansNotStarted,
  testPracticedTodayCountsTowardStreak,
  testMissedDayStaysWithinGracePeriod,
  testLastDayOfGraceIsFlagged,
  testGapBeyondGraceResetsStreak,
  testLongestStreakLooksAcrossNonConsecutiveRuns,
  testGetPracticeDayKeysDedupesAndSortsDescending,
  testGetPracticeDayKeysIgnoresInvalidDates,
  testToLocalDayKeyPadsMonthAndDay
];

for (const test of tests) {
  test();
}

console.log(`streakService self-test passed: ${tests.length} checks OK.`);
