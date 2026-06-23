import AsyncStorage from "@react-native-async-storage/async-storage";
import { createId } from "@/utils/id";

const CLIENT_ID_KEY = "daily-speaking-coach:client-id:v1";

export async function getClientId(): Promise<string> {
  const existing = await AsyncStorage.getItem(CLIENT_ID_KEY);
  if (existing) {
    return existing;
  }

  const nextClientId = createId("client");
  await AsyncStorage.setItem(CLIENT_ID_KEY, nextClientId);
  return nextClientId;
}

export async function resetClientId(): Promise<void> {
  await AsyncStorage.removeItem(CLIENT_ID_KEY);
}
