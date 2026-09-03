/**
 * "Turn HTML into a PDF file, keep it somewhere, and let the user open it."
 *
 * Native path: expo-print renders the HTML with the OS print engine, the file is
 * copied under a readable name in the app's document directory, and expo-sharing
 * opens the system share sheet.
 */
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export interface SavedDocument {
  /** Value stored on the record and passed back to the other functions here. */
  uri: string;
  /** Human-readable location, shown to the user after an export. */
  displayLocation: string;
}

export async function savePdfFromHtml(html: string, fileName: string, subfolder: string): Promise<SavedDocument> {
  const { uri } = await Print.printToFileAsync({ html });
  const baseDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;

  if (!baseDirectory) {
    return { uri, displayLocation: fileName };
  }

  const targetDirectory = `${baseDirectory}${subfolder}`;
  const directoryInfo = await FileSystem.getInfoAsync(targetDirectory);
  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(targetDirectory, { intermediates: true });
  }

  const targetUri = `${targetDirectory}${fileName}`;
  const existingFile = await FileSystem.getInfoAsync(targetUri);
  if (existingFile.exists) {
    // Regenerating the same report replaces it instead of piling up copies.
    await FileSystem.deleteAsync(targetUri, { idempotent: true });
  }

  await FileSystem.copyAsync({ from: uri, to: targetUri });
  return { uri: targetUri, displayLocation: fileName };
}

export async function sharePdf(uri: string, title: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device, but the PDF was saved.");
  }

  await Sharing.shareAsync(uri, {
    dialogTitle: title,
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf"
  });
}

export async function documentExists(uri: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists;
}

export async function deleteDocument(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
