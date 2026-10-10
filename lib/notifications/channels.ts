import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export const CHANNEL_DAILY = "daily-guidance";
export const CHANNEL_REMINDERS = "reminders";
export const CHANNEL_RASHIFAL = "rashifal";

let ready: Promise<void> | null = null;

/** Android channels (a no-op elsewhere); safe to call repeatedly. */
export function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return Promise.resolve();
  ready ??= (async () => {
    await Notifications.setNotificationChannelAsync(CHANNEL_DAILY, {
      name: "Daily guidance",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#073f43",
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_RASHIFAL, {
      name: "Daily rashifal",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#073f43",
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_REMINDERS, {
      name: "Shubh / Ashubh reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: "#073f43",
      bypassDnd: false,
    });
  })();
  return ready;
}

/** How a notification behaves while the app is open: still shown, never silent. */
export function installForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
