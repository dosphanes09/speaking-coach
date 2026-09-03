/**
 * Exporting a rhetoric session as a PDF.
 *
 * All the platform difference lives in `@/services/platform/documentStore`:
 * on the phone this becomes expo-print plus the share sheet, and in the desktop
 * build Chromium renders the page and writes a real file into
 * Documents\Daily Speaking Coach\hitabet-raporlari\.
 */
import { deleteDocument, savePdfFromHtml, sharePdf } from "@/services/platform/documentStore";
import { buildRhetoricReportFileName, buildRhetoricReportHtml } from "@/services/pdf/rhetoricReportPdfHtml";
import { RhetoricRecord } from "@/types/rhetoric";

const REPORT_FOLDER = "hitabet-raporlari/";

export interface RhetoricPdfResult {
  uri: string;
  displayLocation: string;
}

export async function createRhetoricPdf(record: RhetoricRecord): Promise<RhetoricPdfResult> {
  const html = buildRhetoricReportHtml(record);
  const fileName = buildRhetoricReportFileName(record);
  const saved = await savePdfFromHtml(html, fileName, REPORT_FOLDER);

  return { uri: saved.uri, displayLocation: saved.displayLocation };
}

/**
 * Creates the PDF and then opens it. Returns where it landed so the screen can
 * tell the user, which matters on desktop where the file is somewhere findable
 * rather than inside app storage.
 */
export async function createAndShareRhetoricPdf(record: RhetoricRecord): Promise<string> {
  const result = await createRhetoricPdf(record);
  await sharePdf(result.uri, "Hitabet raporu");
  return result.displayLocation;
}

export async function deleteRhetoricPdf(reportUri?: string): Promise<void> {
  if (!reportUri) {
    return;
  }
  await deleteDocument(reportUri);
}
