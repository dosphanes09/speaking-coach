import { SpeakingRecord } from "@/types/models";

export const STREAK_GRACE_DAYS = 3;

export interface StreakSummary {
  currentStreakDays: number;
  longestStreakDays: number;
  practicedToday: boolean;
  daysSinceLastPractice: number | null;
  graceDaysRemaining: number;
  lastPracticeDayKey: string | null;
  statusLabelTR: string;
  helperTextTR: string;
}

export function calculateStreak(records: SpeakingRecord[], now = new Date()): StreakSummary {
  const practiceDayKeys = getPracticeDayKeys(records);
  const practiceDays = new Set(practiceDayKeys);
  const todayKey = toLocalDayKey(now);
  const lastPracticeDayKey = practiceDayKeys[0] ?? null;

  if (!lastPracticeDayKey) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
      practicedToday: false,
      daysSinceLastPractice: null,
      graceDaysRemaining: 0,
      lastPracticeDayKey: null,
      statusLabelTR: "Henüz başlamadı",
      helperTextTR: "Bugün bir speaking kaydı alarak ilk streak gününü başlat."
    };
  }

  const daysSinceLastPractice = differenceInLocalDays(now, fromLocalDayKey(lastPracticeDayKey));
  const practicedToday = practiceDays.has(todayKey);
  const isWithinGrace = daysSinceLastPractice <= STREAK_GRACE_DAYS;
  const currentStreakDays = isWithinGrace ? countConsecutiveDaysFrom(lastPracticeDayKey, practiceDays) : 0;
  const graceDaysRemaining = practicedToday
    ? STREAK_GRACE_DAYS
    : Math.max(0, STREAK_GRACE_DAYS - daysSinceLastPractice);

  return {
    currentStreakDays,
    longestStreakDays: calculateLongestStreak(practiceDayKeys),
    practicedToday,
    daysSinceLastPractice,
    graceDaysRemaining,
    lastPracticeDayKey,
    statusLabelTR: buildStatusLabel(practicedToday, currentStreakDays, graceDaysRemaining),
    helperTextTR: buildHelperText(practicedToday, currentStreakDays, graceDaysRemaining)
  };
}

export function toLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getPracticeDayKeys(records: SpeakingRecord[]): string[] {
  return Array.from(
    new Set(
      records
        .map((record) => new Date(record.createdAt))
        .filter((date) => !Number.isNaN(date.getTime()))
        .map(toLocalDayKey)
    )
  ).sort((a, b) => b.localeCompare(a));
}

function buildStatusLabel(
  practicedToday: boolean,
  currentStreakDays: number,
  graceDaysRemaining: number
): string {
  if (practicedToday) {
    return "Bugün tamam";
  }

  if (currentStreakDays > 0) {
    if (graceDaysRemaining === 0) {
      return "Son koruma günü";
    }

    return `${graceDaysRemaining} gün koruma`;
  }

  return "Streak sıfırlandı";
}

function buildHelperText(
  practicedToday: boolean,
  currentStreakDays: number,
  graceDaysRemaining: number
): string {
  if (practicedToday) {
    return "Bugünkü speaking kaydın alındı. Seri devam ediyor.";
  }

  if (currentStreakDays > 0) {
    if (graceDaysRemaining === 0) {
      return "Bugün kayıt almazsan streak sıfırlanır. 1 dakikalık pratik yeterli.";
    }

    return `Bugün kayıt alırsan streak güçlenir. Kaçırırsan ${graceDaysRemaining} gün koruma hakkın kalır.`;
  }

  return "Yeni bir speaking kaydı alarak streak'i yeniden başlatabilirsin.";
}

function fromLocalDayKey(dayKey: string): Date {
  const [year = "1970", month = "01", day = "01"] = dayKey.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function differenceInLocalDays(later: Date, earlier: Date): number {
  const laterStart = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  const earlierStart = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.floor((laterStart.getTime() - earlierStart.getTime()) / millisecondsPerDay);
}

function addLocalDays(dayKey: string, delta: number): string {
  const date = fromLocalDayKey(dayKey);
  date.setDate(date.getDate() + delta);
  return toLocalDayKey(date);
}

function countConsecutiveDaysFrom(startDayKey: string, practiceDays: Set<string>): number {
  let total = 0;
  let cursor = startDayKey;

  while (practiceDays.has(cursor)) {
    total += 1;
    cursor = addLocalDays(cursor, -1);
  }

  return total;
}

function calculateLongestStreak(practiceDayKeys: string[]): number {
  const ascendingKeys = [...practiceDayKeys].sort((a, b) => a.localeCompare(b));
  let longest = 0;
  let current = 0;
  let previousKey: string | null = null;

  for (const dayKey of ascendingKeys) {
    current = previousKey && addLocalDays(previousKey, 1) === dayKey ? current + 1 : 1;
    longest = Math.max(longest, current);
    previousKey = dayKey;
  }

  return longest;
}
