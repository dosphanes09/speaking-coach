/**
 * Web / desktop implementation.
 *
 * The Electron shell injects `window.desktopBridge` from its preload script.
 * When the same web bundle is opened in a plain browser instead (handy while
 * developing with `npm run web`), the object is simply missing and every caller
 * falls back to a browser-only path.
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
  apiRequest(request: DesktopApiRequest): Promise<DesktopApiResponse>;
  savePdfFromHtml(input: { html: string; fileName: string }): Promise<DesktopSavedFile>;
  saveMediaFile(input: { data: Uint8Array; fileName: string }): Promise<DesktopSavedFile>;
  deleteFile(input: { target: string }): Promise<{ deleted: boolean }>;
  fileExists(input: { target: string }): Promise<{ exists: boolean }>;
  openFile(input: { target: string }): Promise<{ opened: boolean }>;
  revealFile(input: { target: string }): Promise<{ revealed: boolean }>;
}

declare global {
  // eslint-disable-next-line no-var
  var desktopBridge: DesktopBridge | undefined;
}

export function getDesktopBridge(): DesktopBridge | null {
  if (typeof globalThis === "undefined") {
    return null;
  }

  const candidate = (globalThis as { desktopBridge?: DesktopBridge }).desktopBridge;
  return candidate?.isDesktop === true ? candidate : null;
}

export const isDesktopApp = getDesktopBridge() !== null;
