const developmentBackendBaseUrl = "http://localhost:3001";

function readBackendBaseUrlFromEnv(): string {
  // Expo replaces EXPO_PUBLIC_* values in production bundles only when they are
  // referenced directly. Set EXPO_PUBLIC_API_URL to the Render HTTPS origin in
  // the EAS production environment. Do not put API keys in EXPO_PUBLIC_* values.
  return (
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    // Legacy fallbacks keep older local/EAS configurations working.
    process.env.EXPO_PUBLIC_BACKEND_API_URL?.trim() ||
    process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.trim() ||
    ""
  );
}

function parseOriginList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      try {
        return new URL(item).origin;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

export function isDevelopmentBuild(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

export function getConfiguredBackendBaseUrl(): string {
  if (isDevelopmentBuild()) {
    return readBackendBaseUrlFromEnv() || developmentBackendBaseUrl;
  }

  return readBackendBaseUrlFromEnv();
}

export function getProductionBackendOriginAllowlist(): string[] {
  return Array.from(
    new Set([
      ...parseOriginList(process.env.EXPO_PUBLIC_API_URL?.trim() ?? ""),
      ...parseOriginList(process.env.EXPO_PUBLIC_ALLOWED_BACKEND_ORIGINS?.trim() ?? "")
    ])
  );
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  if (normalized === "localhost" || normalized === "::1" || normalized === "[::1]") {
    return true;
  }

  if (normalized.startsWith("10.") || normalized.startsWith("127.") || normalized.startsWith("192.168.")) {
    return true;
  }

  const parts = normalized.split(".").map((part) => Number(part));
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part))) {
    const first = parts[0] ?? -1;
    const second = parts[1] ?? -1;
    if (first === 172 && second >= 16 && second <= 31) {
      return true;
    }
    if (first === 169 && second === 254) {
      return true;
    }
  }

  return normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
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
    throw new Error("Backend API URL is invalid. Use a full URL like http://192.168.x.x:3001.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Backend API URL must use HTTP or HTTPS.");
  }

  if (isDevelopmentBuild()) {
    if (url.protocol === "https:" || isPrivateOrLocalHostname(url.hostname)) {
      return url.origin;
    }
    throw new Error("Development backend URL must be HTTPS, localhost, or a private LAN address.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Production backend URL must use HTTPS.");
  }

  if (isPrivateOrLocalHostname(url.hostname)) {
    throw new Error("Production backend URL cannot point to localhost or a private network address.");
  }

  const allowedOrigins = getProductionBackendOriginAllowlist();
  if (!allowedOrigins.includes(url.origin)) {
    throw new Error("Production backend URL is not in the allowed backend origin list.");
  }

  return url.origin;
}
