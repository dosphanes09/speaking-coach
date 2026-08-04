import { AppState, Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

/** How long the system nav bar stays visible if the OS reveals it anyway. */
const AUTO_HIDE_DELAY_MS = 3000;

/**
 * Hides the Android system navigation bar (back / home / recents) so the
 * app's own `AppBottomBar` is the only navigation control the user sees.
 * Android always allows a temporary swipe-up to reveal system UI as an
 * OS-level safety valve — apps can't fully disable that — so if it does get
 * swiped into view, we just hide it again a few seconds later.
 */
export function hideAndroidNavigationBar(): () => void {
  if (Platform.OS !== "android") {
    return () => undefined;
  }

  let hideTimeoutId: ReturnType<typeof setTimeout> | null = null;

  function scheduleHide(): void {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
    }
    hideTimeoutId = setTimeout(() => {
      void hideNavigationBar();
    }, AUTO_HIDE_DELAY_MS);
  }

  void hideNavigationBar();

  const appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void hideNavigationBar();
    }
  });

  const visibilitySubscription = NavigationBar.addVisibilityListener(({ visibility }) => {
    if (visibility === "visible") {
      scheduleHide();
    }
  });

  return () => {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
    }
    appStateSubscription.remove();
    visibilitySubscription.remove();
  };
}

async function hideNavigationBar(): Promise<void> {
  try {
    await NavigationBar.setBehaviorAsync("overlay-swipe");
    await NavigationBar.setVisibilityAsync("hidden");
  } catch {
    // Navigation bar control is best-effort in Expo Go and on some Android skins.
  }
}
