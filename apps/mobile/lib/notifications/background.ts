import { Platform } from "react-native";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { tokenStore } from "@/lib/auth/client";
import { loadCalculationSystemPreference } from "@/lib/calculation-system-storage";
import { notifStore } from "./store";
import { syncNotifications } from "./sync";

export const NOTIFICATION_REFRESH_TASK = "vedicpatro-notification-refresh";
/** Longest a background refresh may run before the task reports back. */
const BACKGROUND_SYNC_BUDGET_MS = 25_000;

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
      // The app is closed, so the root layout never loaded the reader's drik / Surya Siddhanta
      // choice: without this the widget and notifications were refreshed in drik.
      await loadCalculationSystemPreference();
      // Bounded: when Android stops the job, expo-background-task's stop waits on the main thread
      // for this task, and a sync stuck on a slow network made that wait an ANR (Sentry PATRO-11).
      // Whatever finished in time is kept; the next run or app start does the rest.
      const finished = await Promise.race([
        syncNotifications({ lang: await notifStore.getLang() }).then(() => true),
        new Promise<false>((resolve) => setTimeout(() => resolve(false), BACKGROUND_SYNC_BUDGET_MS)),
      ]);
      return finished ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed;
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
