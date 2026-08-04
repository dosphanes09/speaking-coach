import * as SecureStore from "expo-secure-store";
import { validateBackendBaseUrl } from "@/config/backendConfig";
import { getClientId } from "@/services/storage/clientIdentity";

const ACCESS_TOKEN_KEY = "daily-speaking-coach.access-token.v1";

interface RegisterResponse {
  token?: string;
  expiresAt?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

export interface DeviceActivationResult {
  expiresAt: string;
}

export async function getDeviceAccessToken(): Promise<string> {
  return (await SecureStore.getItemAsync(ACCESS_TOKEN_KEY))?.trim() ?? "";
}

export async function isDeviceActivated(): Promise<boolean> {
  return (await getDeviceAccessToken()).length > 0;
}

export async function activateDevice(backendBaseUrl: string, inviteCode: string): Promise<DeviceActivationResult> {
  const baseUrl = validateBackendBaseUrl(backendBaseUrl);
  const normalizedInviteCode = inviteCode.trim();
  if (normalizedInviteCode.length < 20 || normalizedInviteCode.length > 128) {
    throw new Error("Invite code is invalid.");
  }

  const clientId = await getClientId();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inviteCode: normalizedInviteCode,
        clientId
      })
    });
  } catch {
    throw new Error("Could not reach the activation service. Check your internet connection.");
  }

  const json = (await response.json().catch(() => ({}))) as RegisterResponse;
  if (!response.ok) {
    throw new Error(json.error?.message || "Device activation failed.");
  }

  const token = String(json.token || "");
  const expiresAt = String(json.expiresAt || "");
  if (token.split(".").length !== 3 || !expiresAt || Number.isNaN(Date.parse(expiresAt))) {
    throw new Error("Activation service returned an invalid response.");
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  return { expiresAt };
}

export async function deactivateDevice(backendBaseUrl: string): Promise<void> {
  const token = await getDeviceAccessToken();
  if (!token) {
    return;
  }

  const baseUrl = validateBackendBaseUrl(backendBaseUrl);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/auth/revoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch {
    throw new Error("Could not reach the deactivation service.");
  }

  if (!response.ok && response.status !== 401) {
    throw new Error("Device authorization could not be removed.");
  }

  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export async function clearDeviceActivation(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
