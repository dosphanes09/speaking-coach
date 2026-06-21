import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { SpeakingRecord } from "@/types/models";
import { calculateStreak } from "@/services/streak/streakService";

type ExpoNotificationsModule = typeof import("expo-notifications");

const REMINDER_NOTIFICATION_KEY = "daily-speaking-coach:streak-reminder-id:v1";
const REMINDER_CHANNEL_ID = "speaking-streak";
const REMINDER_HOUR = 21;
const REMINDER_MINUTE = 0;

let notificationHandlerConfigured = false;

export async function syncStreakReminder(records: SpeakingRecord[]): Promise<void> {
  if (Platform.OS === "web" || isExpoGo()) {
    return;
  }

  try {
    const Notifications = await loadNotificationsModule();
    await cancelExistingReminder(Notifications);

    if (records.length === 0) {
      return;
    }

    const canSendNotifications = await ensureNotificationPermission(Notifications);
    if (!canSendNotifications) {
      return;
    }

    const now = new Date();
    const summary = calculateStreak(records, now);
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Speaking streak zamanı",
        body: buildReminderBody(summary.currentStreakDays),
        data: {
          type: "speaking-streak-reminder"
        }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: getNextReminderDate(summary.practicedToday, now),
        channelId: REMINDER_CHANNEL_ID
      }
    });

    await AsyncStorage.setItem(REMINDER_NOTIFICATION_KEY, identifier);
  } catch {
    // Reminder setup should never block recording, analysis, or local history.
  }
}

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

async function loadNotificationsModule(): Promise<ExpoNotificationsModule> {
  const Notifications = await import("expo-notifications");

  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false
      })
    });
    notificationHandlerConfigured = true;
  }

  return Notifications;
}

async function cancelExistingReminder(Notifications: ExpoNotificationsModule): Promise<void> {
  const existingIdentifier = await AsyncStorage.getItem(REMINDER_NOTIFICATION_KEY);
  if (!existingIdentifier) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(existingIdentifier);
  } finally {
    await AsyncStorage.removeItem(REMINDER_NOTIFICATION_KEY);
  }
}

async function ensureNotificationPermission(Notifications: ExpoNotificationsModule): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: "Speaking streak",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  if (existingPermission.granted) {
    return true;
  }

  const requestedPermission = await Notifications.requestPermissionsAsync();
  return requestedPermission.granted;
}

function getNextReminderDate(practicedToday: boolean, now: Date): Date {
  const reminderDate = new Date(now);
  reminderDate.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);

  if (practicedToday || reminderDate.getTime() <= now.getTime()) {
    reminderDate.setDate(reminderDate.getDate() + 1);
  }

  return reminderDate;
}

function buildReminderBody(currentStreakDays: number): string {
  if (currentStreakDays > 0) {
    return `Streak'in ${currentStreakDays} gün. Bugün 1 dakikalık speaking kaydı alarak seriyi güçlendir.`;
  }

  return "Bugün 1 dakikalık speaking kaydı alarak yeni streak başlatabilirsin.";
}
