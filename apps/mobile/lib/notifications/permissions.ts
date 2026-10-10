import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export type NotifPermission = "granted" | "denied" | "undetermined";

export async function getNotificationPermission(): Promise<NotifPermission> {
  if (Platform.OS === "web") return "denied";
  try {
    const res = await Notifications.getPermissionsAsync();
    if (res.granted) return "granted";
    return res.canAskAgain ? "undetermined" : "denied";
  } catch {
    return "denied";
  }
}

/**
 * Asks once, in context (first profile saved / first reminder created) — never
 * on launch. Returns whether notifications can be shown afterwards.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return asked.granted;
  } catch {
    return false;
  }
}
