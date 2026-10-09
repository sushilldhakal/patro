import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import {
  registerNotificationRefreshTask,
  unregisterNotificationRefreshTask,
} from "@/lib/notifications/background";
import { ensureNotificationChannels, installForegroundHandler } from "@/lib/notifications/channels";
import { registerThisDevice, unregisterThisDevice } from "@/lib/notifications/register-device";
import { cancelAllNotifications } from "@/lib/notifications/scheduler";
import { notifStore } from "@/lib/notifications/store";
import { syncNotifications } from "@/lib/notifications/sync";

if (Platform.OS !== "web") installForegroundHandler();

/**
 * Keeps the local notification schedule in step with the account.
 *
 * Signed in: sync on login and every time the app comes to the foreground, and
 * register the daily background refresh. Signed out: cancel everything and
 * forget the account's cached guidance. A tapped notification opens the
 * Reminders screen. Renders nothing.
 */
export function NotificationsRuntime() {
  const { isAuthenticated, loading } = useAuth();
  const { lang } = useLocale();
  const router = useRouter();
  const langRef = useRef<"ne" | "en">(lang === "en" ? "en" : "ne");
  langRef.current = lang === "en" ? "en" : "ne";
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web" || loading) return;
    if (!isAuthenticated) {
      if (wasAuthenticated.current) {
        wasAuthenticated.current = false;
        void unregisterThisDevice();
        void cancelAllNotifications();
        void notifStore.clearAccountData();
        void unregisterNotificationRefreshTask();
      }
      return;
    }
    wasAuthenticated.current = true;
    void ensureNotificationChannels();
    void registerNotificationRefreshTask();
    void syncNotifications({ lang: langRef.current }).then(() => registerThisDevice(langRef.current));

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncNotifications({ lang: langRef.current });
    });
    return () => sub.remove();
  }, [isAuthenticated, loading]);

  // Wording follows the app language: rebuild the schedule when it changes.
  useEffect(() => {
    if (Platform.OS === "web" || !isAuthenticated) return;
    void syncNotifications({ lang: langRef.current });
  }, [lang, isAuthenticated]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const open = () => router.push("/reminders" as never);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);

  return null;
}
