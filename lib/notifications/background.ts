import { Platform } from "react-native";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { tokenStore } from "@/lib/auth/client";
import { notifStore } from "./store";
import { syncNotifications } from "./sync";

export const NOTIFICATION_REFRESH_TASK = "vedicpatro-notification-refresh";

/*
 * Runs about once a day while the app is closed: tops up the 14-day guidance
 * cache while there is a connection, and re-plans the rolling schedule either
 * way, so the next days' notifications keep arriving without the app being
 * opened. Must be defined at module scope (imported from the root layout).
 */
if (Platform.OS !== "web") {
  TaskManager.defineTask(NOTIFICATION_REFRESH_TASK, async () => {
    try {
      await tokenStore.load();
      if (!tokenStore.access && !tokenStore.refresh) return BackgroundTask.BackgroundTaskResult.Success;
      await syncNotifications({ lang: await notifStore.getLang() });
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerNotificationRefreshTask(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    if (await TaskManager.isTaskRegisteredAsync(NOTIFICATION_REFRESH_TASK)) return;
    await BackgroundTask.registerTaskAsync(NOTIFICATION_REFRESH_TASK, { minimumInterval: 12 * 60 });
  } catch {
    /* background tasks unavailable (simulator / restricted) — foreground sync still runs */
  }
}

export async function unregisterNotificationRefreshTask(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    if (await TaskManager.isTaskRegisteredAsync(NOTIFICATION_REFRESH_TASK)) {
      await BackgroundTask.unregisterTaskAsync(NOTIFICATION_REFRESH_TASK);
    }
  } catch {
    /* nothing to do */
  }
}
