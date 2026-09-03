/**
 * Desktop / web implementation of PDF export.
 *
 * expo-print's `printToFileAsync` has no web implementation — on the web the
 * module can only open the browser's print dialog, which produces no file the
 * app can then keep, delete or re-open.
 *
 * In the Electron build the shell does the real work: it renders the HTML in a
 * hidden window and calls Chromium's `printToPDF`, writing an actual PDF into
 * the user's Documents folder. That is a better result than the phone gets,
 * because the file lands somewhere the user can find in Explorer.
 *
 * In a plain browser (no Electron shell) there is no way to write a file, so the
 * HTML is opened in a new tab with the print dialog and the user saves it with
 * "Save as PDF" themselves.
 */
import { getDesktopBridge } from "@/services/platform/desktopBridge";

export interface SavedDocument {
  uri: string;
  displayLocation: string;
}

export async function savePdfFromHtml(html: string, fileName: string, subfolder: string): Promise<SavedDocument> {
  const bridge = getDesktopBridge();

  if (bridge) {
    const saved = await bridge.savePdfFromHtml({ html, fileName: `${subfolder}${fileName}` });
    return { uri: saved.filePath, displayLocation: saved.filePath };
  }

  openPrintWindow(html);
  // No file exists, so no URI is stored on the record. Callers treat an empty
  // URI as "there is nothing saved to re-open or delete".
  return { uri: "", displayLocation: "your browser's print dialog" };
}

export async function sharePdf(uri: string, title: string): Promise<void> {
  const bridge = getDesktopBridge();
  if (!bridge) {
    // The print dialog already ran during save; there is nothing left to share.
    return;
  }

  if (!uri) {
    throw new Error(`${title} could not be saved, so there is nothing to open.`);
  }

  // On a desktop the useful equivalent of "share" is "show me the file", so the
  // saved PDF is opened with the system's default viewer.
  await bridge.openFile({ target: uri });
}

export async function documentExists(uri: string): Promise<boolean> {
  if (!uri) {
    return false;
  }

  const bridge = getDesktopBridge();
  if (!bridge) {
    return false;
  }

  const result = await bridge.fileExists({ target: uri });
  return result.exists;
}

export async function deleteDocument(uri: string): Promise<void> {
  if (!uri) {
    return;
  }

  const bridge = getDesktopBridge();
  if (!bridge) {
    return;
  }

  await bridge.deleteFile({ target: uri });
}

function openPrintWindow(html: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Allow pop-ups for this app so the PDF can be opened.");
  }

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  // Give the browser a moment to lay the document out before printing it.
  printWindow.setTimeout(() => printWindow.print(), 400);
}
