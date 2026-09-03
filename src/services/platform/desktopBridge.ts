/**
 * Native (iOS / Android) implementation.
 *
 * On phones there is no Electron shell, so there is no desktop bridge. Every
 * consumer of this module already has a native code path, so returning `null`
 * here is not a degraded mode — it just says "you are not running inside the
 * desktop shell".
 *
 * Metro (Expo's bundler) picks `desktopBridge.web.ts` instead of this file when
 * it bundles for the web/desktop target, so the two files never both ship.
 */

export interface DesktopApiRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Uint8Array | null;
}

export interface DesktopApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: Uint8Array;
}

export interface DesktopSavedFile {
  filePath: string;
  mediaUrl: string;
}

export interface DesktopBridge {
  readonly isDesktop: true;
  readonly appVersion: string;
  /**
   * Performs an HTTP request from Electron's main process instead of the page.
   * Requests made there carry no `Origin` header, exactly like the requests the
   * phone app makes, so the backend's CORS allowlist does not have to know
   * anything about the desktop build.
   */
  apiRequest(request: DesktopApiRequest): Promise<DesktopApiResponse>;
  /** Renders HTML to a real PDF via Chromium's print engine and saves it. */
  savePdfFromHtml(input: { html: string; fileName: string }): Promise<DesktopSavedFile>;
  /** Writes recorded audio/video into the app's data folder. */
  saveMediaFile(input: { data: Uint8Array; fileName: string }): Promise<DesktopSavedFile>;
  deleteFile(input: { target: string }): Promise<{ deleted: boolean }>;
  fileExists(input: { target: string }): Promise<{ exists: boolean }>;
  /** Opens a saved file with the OS default application. */
  openFile(input: { target: string }): Promise<{ opened: boolean }>;
  /** Reveals a saved file in Windows Explorer / Finder. */
  revealFile(input: { target: string }): Promise<{ revealed: boolean }>;
}

export const isDesktopApp = false;

export function getDesktopBridge(): DesktopBridge | null {
  return null;
}
