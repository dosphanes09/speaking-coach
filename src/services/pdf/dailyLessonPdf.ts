import { DailyLesson } from "@/types/models";
import { buildDailyLessonFileName, buildDailyLessonHtml } from "@/services/pdf/dailyLessonPdfHtml";
import { deleteDocument, savePdfFromHtml, sharePdf } from "@/services/platform/documentStore";

/**
 * Turns a generated lesson into a printable worksheet PDF. The file is written
 * under a stable name so the learner ends up with a readable folder of dated
 * lessons rather than a pile of cache filenames.
 *
 * Where that folder is depends on the platform: on the phone it is the app's
 * private document directory, and in the desktop build it is a real folder in
 * the user's Documents. `@/services/platform/documentStore` picks the right one.
 */
export async function createDailyLessonPdf(lesson: DailyLesson): Promise<string> {
  const html = buildDailyLessonHtml(lesson);
  const fileName = buildDailyLessonFileName(lesson);
  const saved = await savePdfFromHtml(html, fileName, "daily-lessons/");

  return saved.uri;
}

export async function createAndShareDailyLessonPdf(lesson: DailyLesson): Promise<string> {
  const lessonUri = await createDailyLessonPdf(lesson);
  await shareDailyLessonPdf(lessonUri, lesson.core.title);

  return lessonUri;
}

export async function shareDailyLessonPdf(lessonUri: string, title: string): Promise<void> {
  await sharePdf(lessonUri, title);
}

export async function deleteDailyLessonPdf(lessonUri?: string): Promise<void> {
  if (!lessonUri) {
    return;
  }

  await deleteDocument(lessonUri);
}
