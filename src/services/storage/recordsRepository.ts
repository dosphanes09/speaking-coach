import AsyncStorage from "@react-native-async-storage/async-storage";
import { SpeakingRecord } from "@/types/models";

const RECORDS_KEY = "daily-speaking-coach:records:v1";

export async function listRecords(): Promise<SpeakingRecord[]> {
  const raw = await AsyncStorage.getItem(RECORDS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const records = JSON.parse(raw) as SpeakingRecord[];
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function saveRecord(record: SpeakingRecord): Promise<SpeakingRecord[]> {
  const records = await listRecords();
  const nextRecords = [record, ...records.filter((item) => item.id !== record.id)];
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export async function deleteRecord(recordId: string): Promise<SpeakingRecord[]> {
  const records = await listRecords();
  const nextRecords = records.filter((item) => item.id !== recordId);
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}
