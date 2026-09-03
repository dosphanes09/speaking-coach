"use strict";

/**
 * The only bridge between the page and Electron.
 *
 * `contextIsolation` is on, so the page runs in its own JavaScript world and
 * cannot see Node, `require`, or anything else from this file. It sees exactly
 * the object below and nothing more — every capability the desktop build adds
 * is one of these seven functions.
 *
 * The shape here must stay in step with the `DesktopBridge` interface in
 * `src/services/platform/desktopBridge.web.ts`.
 */

const { contextBridge, ipcRenderer } = require("electron");

function readAppVersion() {
  try {
    return require("./package.json").version || "";
  } catch {
    return "";
  }
}

contextBridge.exposeInMainWorld("desktopBridge", {
  isDesktop: true,
  appVersion: readAppVersion(),

  /** Performs a backend call from the main process (no Origin header). */
  apiRequest: (request) => ipcRenderer.invoke("api:request", request),

  /** Renders HTML to a PDF and saves it under Documents/Daily Speaking Coach. */
  savePdfFromHtml: (input) => ipcRenderer.invoke("file:savePdfFromHtml", input),

  /** Writes a finished recording into the app's data folder. */
  saveMediaFile: (input) => ipcRenderer.invoke("file:saveMedia", input),

  deleteFile: (input) => ipcRenderer.invoke("file:delete", input),
  fileExists: (input) => ipcRenderer.invoke("file:exists", input),
  openFile: (input) => ipcRenderer.invoke("file:open", input),
  revealFile: (input) => ipcRenderer.invoke("file:reveal", input)
});
