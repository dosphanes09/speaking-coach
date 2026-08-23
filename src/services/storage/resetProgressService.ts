import { clearDeviceActivation } from "@/services/auth/deviceAuthService";
import { deleteMedia } from "@/services/media/mediaStorage";
import { deleteSpeakingReportPdf } from "@/services/pdf/speakingReportPdf";
import { clearStreakReminder } from "@/services/notifications/streakReminderService";
import { clearChatMessages } from "@/services/storage/chatRepository";
import { resetClientId } from "@/services/storage/clientIdentity";
import { clearDailyLesson } from "@/services/storage/dailyLessonRepository";
import { clearLearnerProfile } from "@/services/storage/learnerProfileRepository";
import { clearListeningResults } from "@/services/storage/listeningResultsRepository";
import { clearRecords, listRecords } from "@/services/storage/recordsRepository";
import { resetSettings } from "@/services/storage/settingsRepository";
import { AppSettings } from "@/types/models";

export interface ResetProgressResult {
  settings: AppSettings;
  deletedRecordCount: number;
}

export async function resetAllLocalProgress(): Promise<ResetProgressResult> {
  const records = await listRecords();

  await Promise.all(
    records.flatMap((record) => [
      bestEffortCleanup(() => deleteMedia(record.media.uri)),
      bestEffortCleanup(() => deleteSpeakingReportPdf(record.pdfReportUri))
    ])
  );

  await Promise.all([
    clearRecords(),
    clearListeningResults(),
    clearChatMessages(),
    resetClientId(),
    clearDeviceActivation(),
    clearStreakReminder(),
    // The daily lesson and the learner profile it is generated from are progress too: leaving
    // them behind would rebuild tomorrow's lesson from a history the learner just erased.
    clearDailyLesson(),
    clearLearnerProfile()
  ]);

  const settings = await resetSettings();

  return {
    settings,
    deletedRecordCount: records.length
  };
}

async function bestEffortCleanup(cleanup: () => Promise<void>): Promise<void> {
  try {
    await cleanup();
  } catch {
    // Local files may already be gone. Storage reset should continue.
  }
}
