import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { CHANNEL_DAILY, CHANNEL_REMINDERS, ensureNotificationChannels } from "./channels";
import type { PlannedNotification } from "./plan";

/** iOS keeps at most 64 pending local notifications; stay under it. */
export const NOTIFICATION_BUDGET = Platform.OS === "ios" ? 56 : 120;

let running: Promise<number> = Promise.resolve(0);

/**
 * Replaces everything this app has scheduled with `planned`.
 *
 * Serialised: overlapping calls (foreground + a profile save at the same time)
 * would otherwise interleave their cancel/schedule steps and double-book.
 * Identifiers are stable (`brief:…`, `rem:…`), so a re-run is idempotent.
 */
export function applySchedule(planned: PlannedNotification[]): Promise<number> {
  running = running.catch(() => 0).then(() => doApply(planned));
  return running;
}

async function doApply(planned: PlannedNotification[]): Promise<number> {
  if (Platform.OS === "web") return 0;
  await ensureNotificationChannels();
  await Notifications.cancelAllScheduledNotificationsAsync();
  let scheduled = 0;
  for (const n of planned) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: {
          title: n.title,
          body: n.body,
          data: n.data,
          sound: true,
          ...(Platform.OS === "ios" && n.channel === "reminders"
            ? { interruptionLevel: "timeSensitive" as const }
            : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: n.fireAt,
          channelId: n.channel === "reminders" ? CHANNEL_REMINDERS : CHANNEL_DAILY,
        },
      });
      scheduled += 1;
    } catch {
      /* one bad entry must not drop the rest */
    }
  }
  return scheduled;
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  await running.catch(() => 0);
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function pendingNotificationCount(): Promise<number> {
  if (Platform.OS === "web") return 0;
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}
