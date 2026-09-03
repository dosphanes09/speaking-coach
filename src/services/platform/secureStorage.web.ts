/**
 * Desktop / web implementation of the secret store.
 *
 * There is no OS keychain reachable from a Chromium page, so the value lives in
 * `localStorage`. In the Electron build that storage sits inside the app's own
 * user-data folder under the current Windows/macOS user account, so it is about
 * as private as any other file that user owns — but it is NOT hardware-backed
 * encryption the way the phone's Keystore is. The only secret stored here is a
 * backend access token that the server can revoke, so that trade-off is
 * acceptable; do not extend this to anything more sensitive.
 */

function getStore(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    // Private-mode browsers can throw on the very first access.
    return null;
  }
}

export async function getSecret(key: string): Promise<string> {
  try {
    return getStore()?.getItem(key)?.trim() ?? "";
  } catch {
    return "";
  }
}

export async function setSecret(key: string, value: string): Promise<void> {
  try {
    getStore()?.setItem(key, value);
  } catch {
    // A full or blocked storage must not break activation flow reporting.
  }
}

export async function deleteSecret(key: string): Promise<void> {
  try {
    getStore()?.removeItem(key);
  } catch {
    // Best-effort cleanup only.
  }
}
