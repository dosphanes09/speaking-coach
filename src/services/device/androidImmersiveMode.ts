import { AppState, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

export function enableAndroidImmersiveMode(): () => void {
  if (Platform.OS !== "android") {
    return () => undefined;
  }

  void hideNavigationBar();

  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void hideNavigationBar();
    }
  });

  return () => subscription.remove();
}

async function hideNavigationBar(): Promise<void> {
  try {
    await NavigationBar.setBehaviorAsync("overlay-swipe");
    await NavigationBar.setVisibilityAsync("hidden");
  } catch {
    // Navigation bar control is best-effort in Expo Go and on some Android skins.
  }
}
