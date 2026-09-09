/**
 * Storage for micro-drill reps.
 *
 * Its own key, for the same reason the rhetoric records have theirs: a drill is
 * a pass/fail rep and a rhetoric session is a graded performance, and averaging
 * them would produce a number describing neither.
 *
 * Unlike the other two stores this one is capped. Five reps a day is the
 * intended usage, which is roughly 1800 rows a year — and nobody scrolls to
 * rep 400. The recent window is what the streak and trend need; the rest is
 * weight. Recordings are not kept at all (see `DrillRecord`).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrillRecord } from "@/types/drill";

const DRILL_RECORDS_KEY = "daily-speaking-coach:drill-records:v1";

/** Enough for a long streak and a meaningful trend, without unbounded growth. */
const MAX_STORED_DRILLS = 400;

export async function listDrillRecords(): Promise<DrillRecord[]> {
  const raw = await AsyncStorage.getItem(DRILL_RECORDS_KEY);
  if (!raw) {
    return [];
  }

  try {
    return sortByNewest(JSON.parse(raw) as DrillRecord[]);
  } catch {
    // A corrupted blob should not brick the module. An empty history is
    // recoverable; a crash on every launch is not.
    return [];
  }
}

export async function saveDrillRecord(record: DrillRecord): Promise<DrillRecord[]> {
  const records = await listDrillRecords();
  const nextRecords = sortByNewest([record, ...records.filter((item) => item.id !== record.id)]).slice(
    0,
    MAX_STORED_DRILLS
  );
  await AsyncStorage.setItem(DRILL_RECORDS_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export async function clearDrillRecords(): Promise<void> {
  await AsyncStorage.removeItem(DRILL_RECORDS_KEY);
}

/** Prompt ids used recently, so the same drill does not come straight back. */
export function getRecentDrillPromptIds(records: DrillRecord[], limit = 8): string[] {
  return records.slice(0, limit).map((record) => record.prompt.id);
}

function sortByNewest(records: DrillRecord[]): DrillRecord[] {
  return [...records].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
