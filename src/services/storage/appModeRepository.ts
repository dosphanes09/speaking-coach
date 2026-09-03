/**
 * Which of the two modules the app opens in.
 *
 * The launch picker is the point of entry, but asking the same question every
 * single time turns into friction after a week, so the last choice is
 * remembered and can be reused with one tap. `askEveryTime` keeps the picker
 * mandatory for anyone who prefers the deliberate "what am I practising today"
 * moment.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppMode = "english" | "rhetoric";

const MODE_KEY = "daily-speaking-coach:app-mode:v1";
const ASK_KEY = "daily-speaking-coach:app-mode-ask:v1";

export interface AppModePreference {
  lastMode: AppMode | null;
  askEveryTime: boolean;
}

export async function loadAppModePreference(): Promise<AppModePreference> {
  try {
    const [storedMode, storedAsk] = await Promise.all([
      AsyncStorage.getItem(MODE_KEY),
      AsyncStorage.getItem(ASK_KEY)
    ]);

    return {
      lastMode: storedMode === "english" || storedMode === "rhetoric" ? storedMode : null,
      // Default is to ask. The picker is how the two modules stay visibly
      // separate rather than one hiding inside the other's menus.
      askEveryTime: storedAsk === null ? true : storedAsk === "true"
    };
  } catch {
    return { lastMode: null, askEveryTime: true };
  }
}

export async function saveLastAppMode(mode: AppMode): Promise<void> {
  try {
    await AsyncStorage.setItem(MODE_KEY, mode);
  } catch {
    // Remembering the choice is a convenience; failing to must not block entry.
  }
}

export async function saveAskEveryTime(askEveryTime: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ASK_KEY, String(askEveryTime));
  } catch {
    // Same reasoning as above.
  }
}
