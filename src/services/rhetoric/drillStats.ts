/**
 * Statistics for the micro-drills.
 *
 * What gets counted here is chosen carefully, because a number shown daily
 * becomes a goal whether or not it was meant to be one. So this deliberately
 * does NOT compute an average score or a percentage-correct: those reward doing
 * easy reps and punish attempting the hard twister, which is backwards.
 *
 * What it does compute is frequency (did you show up), a streak (did you keep
 * showing up) and a trend on the one thing the drills exist to change (are the
 * hesitation sounds going down). Those three reward exactly the behaviour the
 * feature is for.
 */
import { DrillKind, DrillRecord } from "@/types/drill";

export interface DrillStats {
  totalReps: number;
  repsToday: number;
  /** Consecutive days ending today (or yesterday, if today has no rep yet). */
  streakDays: number;
  /** Longest run of clean filler-ban reps, ever. */
  bestCleanRun: number;
  /** Current run of clean filler-ban reps. */
  currentCleanRun: number;
  byKind: Record<DrillKind, { reps: number; passed: number }>;
  /** Filler sounds per minute, older half vs newer half. Null when too few reps. */
  fillerTrend: { before: number; after: number; improved: boolean } | null;
}

/** Local calendar day. Comparing ISO strings would put a 01:00 rep on the wrong day. */
function dayKey(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function computeDrillStats(records: DrillRecord[]): DrillStats {
  const byKind: DrillStats["byKind"] = {
    dolgu_yasagi: { reps: 0, passed: 0 },
    tempo: { reps: 0, passed: 0 },
    tekerleme: { reps: 0, passed: 0 }
  };

  for (const record of records) {
    const bucket = byKind[record.prompt.kind];
    if (bucket) {
      bucket.reps += 1;
      if (record.result.outcome.passed) {
        bucket.passed += 1;
      }
    }
  }

  const today = dayKey(new Date().toISOString());
  const repsToday = records.filter((record) => dayKey(record.createdAt) === today).length;

  return {
    totalReps: records.length,
    repsToday,
    streakDays: computeStreak(records),
    ...computeCleanRuns(records),
    byKind,
    fillerTrend: computeFillerTrend(records)
  };
}

/**
 * Consecutive days with at least one rep.
 *
 * Counts back from today, but starts from yesterday when today is still empty:
 * a streak should not read as broken at 9am just because the day's rep has not
 * happened yet — that punishes the user for checking early.
 */
function computeStreak(records: DrillRecord[]): number {
  if (records.length === 0) {
    return 0;
  }

  const days = new Set(records.map((record) => dayKey(record.createdAt)));
  const now = new Date();
  let cursor = days.has(dayKey(now.toISOString())) ? now : addDays(now, -1);

  let streak = 0;
  while (days.has(dayKey(cursor.toISOString()))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

/**
 * Runs of clean filler-ban reps.
 *
 * Only that drill counts: a "clean run" means no hesitation sounds came out,
 * and the reading drills never listened for them. Folding those in would
 * inflate the run with reps that were never tested for it.
 */
function computeCleanRuns(records: DrillRecord[]): { bestCleanRun: number; currentCleanRun: number } {
  // Oldest first, so a run reads forward in time.
  const fillerReps = records
    .filter((record) => record.prompt.kind === "dolgu_yasagi")
    .slice()
    .reverse();

  let best = 0;
  let running = 0;
  for (const record of fillerReps) {
    running = record.result.outcome.passed ? running + 1 : 0;
    best = Math.max(best, running);
  }

  return { bestCleanRun: best, currentCleanRun: running };
}

/**
 * Hesitation sounds per minute, first half of the history against the second.
 *
 * Per minute rather than per rep because drills differ in length, and a raw
 * count would make a 45-second twister look better than a 60-second filler ban
 * for reasons that have nothing to do with the speaker.
 */
function computeFillerTrend(records: DrillRecord[]): DrillStats["fillerTrend"] {
  const fillerReps = records.filter((record) => record.prompt.kind === "dolgu_yasagi");
  // Six is the smallest split where each side has three reps; below that a
  // single bad morning moves the line and the trend means nothing.
  if (fillerReps.length < 6) {
    return null;
  }

  const ordered = fillerReps.slice().reverse();
  const middle = Math.floor(ordered.length / 2);

  const rate = (group: DrillRecord[]): number => {
    const minutes = group.reduce((total, record) => total + Math.max(record.durationSeconds, 1) / 60, 0);
    const sounds = group.reduce((total, record) => total + record.result.metrics.fillerSoundCount, 0);
    return minutes > 0 ? sounds / minutes : 0;
  };

  const before = rate(ordered.slice(0, middle));
  const after = rate(ordered.slice(middle));

  return {
    before: Math.round(before * 10) / 10,
    after: Math.round(after * 10) / 10,
    improved: after < before
  };
}
