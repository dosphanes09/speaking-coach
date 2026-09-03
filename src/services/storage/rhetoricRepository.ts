/**
 * Storage for rhetoric practice records.
 *
 * A separate key from the English records on purpose. The two use different
 * scoring scales, so a single list would produce a history you cannot read and
 * progress charts that average incompatible numbers.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RhetoricRecord } from "@/types/rhetoric";

const RHETORIC_RECORDS_KEY = "daily-speaking-coach:rhetoric-records:v1";

export async function listRhetoricRecords(): Promise<RhetoricRecord[]> {
  const raw = await AsyncStorage.getItem(RHETORIC_RECORDS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const records = JSON.parse(raw) as RhetoricRecord[];
    return sortByNewest(records);
  } catch {
    // A corrupted blob should not brick the module; an empty history is
    // recoverable, a crash on every launch is not.
    return [];
  }
}

export async function saveRhetoricRecord(record: RhetoricRecord): Promise<RhetoricRecord[]> {
  const records = await listRhetoricRecords();
  const nextRecords = sortByNewest([record, ...records.filter((item) => item.id !== record.id)]);
  await AsyncStorage.setItem(RHETORIC_RECORDS_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export async function deleteRhetoricRecord(recordId: string): Promise<RhetoricRecord[]> {
  const records = await listRhetoricRecords();
  const nextRecords = records.filter((item) => item.id !== recordId);
  await AsyncStorage.setItem(RHETORIC_RECORDS_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export async function clearRhetoricRecords(): Promise<void> {
  await AsyncStorage.removeItem(RHETORIC_RECORDS_KEY);
}

/** Topic ids used in the last `days`, so the picker can avoid repeats. */
export function getRecentRhetoricTopicIds(records: RhetoricRecord[], days = 30): string[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return records
    .filter((record) => Date.parse(record.createdAt) >= cutoff)
    .map((record) => record.topic.id);
}

function sortByNewest(records: RhetoricRecord[]): RhetoricRecord[] {
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
