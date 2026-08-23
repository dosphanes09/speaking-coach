import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { DailyLesson } from "@/types/models";
import { buildDailyLessonFileName, buildDailyLessonHtml } from "@/services/pdf/dailyLessonPdfHtml";

/**
 * Turns a generated lesson into a printable worksheet PDF, using the same expo-print path the
 * speaking report already uses. The file is written under a stable name so the learner ends up
 * with a readable folder of dated lessons rather than a pile of cache filenames.
 */
export async function createDailyLessonPdf(lesson: DailyLesson): Promise<string> {
  const html = buildDailyLessonHtml(lesson);
  const { uri } = await Print.printToFileAsync({ html });

  return copyPdfToNamedFile(uri, lesson);
}

export async function createAndShareDailyLessonPdf(lesson: DailyLesson): Promise<string> {
  const lessonUri = await createDailyLessonPdf(lesson);
  await shareDailyLessonPdf(lessonUri, lesson.core.title);

  return lessonUri;
}

export async function shareDailyLessonPdf(lessonUri: string, title: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error("Sharing is not available on this device, but the PDF was saved.");
  }

  await Sharing.shareAsync(lessonUri, {
    dialogTitle: title,
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf"
  });
}

export async function deleteDailyLessonPdf(lessonUri?: string): Promise<void> {
  if (!lessonUri) {
    return;
  }

  await FileSystem.deleteAsync(lessonUri, { idempotent: true });
}

async function copyPdfToNamedFile(sourceUri: string, lesson: DailyLesson): Promise<string> {
  const baseDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;

  if (!baseDirectory) {
    return sourceUri;
  }

  const lessonsDirectory = `${baseDirectory}daily-lessons/`;
  const directoryInfo = await FileSystem.getInfoAsync(lessonsDirectory);

  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(lessonsDirectory, { intermediates: true });
  }

  const targetUri = `${lessonsDirectory}${buildDailyLessonFileName(lesson)}`;
  const existingFile = await FileSystem.getInfoAsync(targetUri);

  if (existingFile.exists) {
    // Regenerating the same day's lesson replaces the old file instead of piling up copies.
    await FileSystem.deleteAsync(targetUri, { idempotent: true });
  }

  await FileSystem.copyAsync({ from: sourceUri, to: targetUri });

  return targetUri;
}
