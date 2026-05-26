import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChatMessage } from "@/types/models";

const CHAT_MESSAGES_KEY = "daily-speaking-coach:chat-messages:v1";

export async function listChatMessages(): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(CHAT_MESSAGES_KEY);
  if (!raw) {
    return [];
  }

  try {
    return (JSON.parse(raw) as ChatMessage[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function saveChatMessages(messages: ChatMessage[]): Promise<void> {
  await AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages));
}

export async function clearChatMessages(): Promise<void> {
  await AsyncStorage.removeItem(CHAT_MESSAGES_KEY);
}
