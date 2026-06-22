export const productionBackendBaseUrl = "https://daily-speaking-coach.onrender.com";

function readBackendBaseUrlFromEnv(): string {
  // Expo replaces EXPO_PUBLIC_* values in production bundles only when they are
  // referenced directly. Set this exact value in the EAS production environment:
  // EXPO_PUBLIC_API_URL=https://daily-speaking-coach.onrender.com
  // The fallback also protects builds from stale local-network settings.
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  return configuredUrl === productionBackendBaseUrl ? configuredUrl : productionBackendBaseUrl;
}

export function isDevelopmentBuild(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

export function getConfiguredBackendBaseUrl(): string {
  return readBackendBaseUrlFromEnv();
}

export function getProductionBackendOriginAllowlist(): string[] {
  return [productionBackendBaseUrl];
}

export function validateBackendBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");

  if (!trimmed) {
    throw new Error("Backend API URL is empty. Open Settings, enter your backend URL, and tap Save.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`Backend API URL is invalid. Expected ${productionBackendBaseUrl}.`);
  }

  if (url.protocol !== "https:") {
    throw new Error("Production backend URL must use HTTPS.");
  }

  if (url.origin !== productionBackendBaseUrl) {
    throw new Error(`Backend API URL must be ${productionBackendBaseUrl}.`);
  }

  return productionBackendBaseUrl;
}
