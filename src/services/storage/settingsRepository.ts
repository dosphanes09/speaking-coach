import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppSettings } from "@/types/models";
import { getConfiguredBackendBaseUrl, isDevelopmentBuild } from "@/config/backendConfig";

const SETTINGS_KEY = "daily-speaking-coach:settings:v1";

export const defaultSettings: AppSettings = {
  targetLevel: "B1",
  backendBaseUrl: getConfiguredBackendBaseUrl(),
  themeMode: "light"
};

export function normalizeSettings(settings: AppSettings): AppSettings {
  const normalizedSettings: AppSettings = {
    ...defaultSettings,
    ...settings,
    backendBaseUrl: String(settings.backendBaseUrl || "").trim(),
    themeMode: settings.themeMode === "dark" ? "dark" : "light"
  };

  if (isDevelopmentBuild()) {
    return normalizedSettings;
  }

  return {
    ...normalizedSettings,
    backendBaseUrl: getConfiguredBackendBaseUrl()
  };
}

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return normalizeSettings(defaultSettings);
  }

  try {
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return normalizeSettings(defaultSettings);
  }
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const normalizedSettings = normalizeSettings(settings);
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizedSettings));
  return normalizedSettings;
}
