import AsyncStorage from "@react-native-async-storage/async-storage";
import { ListeningGameResult } from "@/types/models";

const LISTENING_RESULTS_KEY = "daily-speaking-coach:listening-picture-results:v1";

export async function listListeningResults(): Promise<ListeningGameResult[]> {
  const raw = await AsyncStorage.getItem(LISTENING_RESULTS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const results = JSON.parse(raw) as ListeningGameResult[];
    return sortResultsByNewest(results);
  } catch {
    return [];
  }
}

export async function saveListeningResult(result: ListeningGameResult): Promise<ListeningGameResult[]> {
  const results = await listListeningResults();
  const nextResults = sortResultsByNewest([result, ...results.filter((item) => item.id !== result.id)]);
  await AsyncStorage.setItem(LISTENING_RESULTS_KEY, JSON.stringify(nextResults));
  return nextResults;
}

export async function clearListeningResults(): Promise<void> {
  await AsyncStorage.removeItem(LISTENING_RESULTS_KEY);
}

function sortResultsByNewest(results: ListeningGameResult[]): ListeningGameResult[] {
  return [...results].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
