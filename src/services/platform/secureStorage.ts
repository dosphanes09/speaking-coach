/**
 * Small key/value store for secrets (currently only the device access token).
 *
 * Native path: expo-secure-store, which puts the value in the Android Keystore
 * / iOS Keychain. There is no web build of that module at all, which is why
 * this indirection exists — see `secureStorage.web.ts` for the desktop path.
 */
import * as SecureStore from "expo-secure-store";

export async function getSecret(key: string): Promise<string> {
  return (await SecureStore.getItemAsync(key))?.trim() ?? "";
}

export async function setSecret(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecret(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
