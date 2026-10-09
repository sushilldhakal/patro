import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { registerDevice, unregisterDevice } from "./api";
import { getNotificationPermission } from "./permissions";
import { notifStore } from "./store";

/**
 * Tells the API this phone exists (Expo push token), so server push can be
 * added later with no client release. Best-effort and never required: reminders
 * and the daily briefing are local notifications and do not depend on it.
 */
export async function registerThisDevice(locale: string): Promise<void> {
  if (Platform.OS === "web" || !Device.isDevice) return;
  if ((await getNotificationPermission()) !== "granted") return;
  try {
    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const device = await registerDevice({
      push_token: token,
      platform: Platform.OS === "ios" ? "ios" : "android",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale,
    });
    await notifStore.setDeviceId(device.id);
  } catch {
    /* no FCM/APNs credentials yet, or offline — local notifications still work */
  }
}

export async function unregisterThisDevice(): Promise<void> {
  const id = await notifStore.getDeviceId();
  if (!id) return;
  try {
    await unregisterDevice(id);
  } catch {
    /* the server copy goes stale harmlessly */
  }
}
