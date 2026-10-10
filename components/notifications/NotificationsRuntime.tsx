import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import {
  registerNotificationRefreshTask,
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
 * Signed in or out: sync on launch and every time the app comes to the
 * foreground, and register the daily background refresh, so the daily rashifal
 * notification keeps arriving for guests too. Signing out cancels the account's
 * notifications and forgets its cached guidance first. A tapped notification
 * opens the Rashifal screen (rashifal) or the Reminders screen (everything
 * else). Renders nothing.
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
    const run = async () => {
      if (isAuthenticated) {
        wasAuthenticated.current = true;
        await syncNotifications({ lang: langRef.current });
        await registerThisDevice(langRef.current);
        return;
      }
      if (wasAuthenticated.current) {
        wasAuthenticated.current = false;
        await unregisterThisDevice();
        await cancelAllNotifications();
        await notifStore.clearAccountData();
      }
      await syncNotifications({ lang: langRef.current });
    };
    void ensureNotificationChannels();
    void registerNotificationRefreshTask();
    void run().catch(() => {});

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncNotifications({ lang: langRef.current });
    });
    return () => sub.remove();
  }, [isAuthenticated, loading]);

  // Wording follows the app language: rebuild the schedule when it changes.
  useEffect(() => {
    if (Platform.OS === "web" || loading) return;
    void syncNotifications({ lang: langRef.current }).catch(() => {});
  }, [lang, loading]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const open = (response: Notifications.NotificationResponse) => {
      const type = response.notification.request.content.data?.type;
      router.push((type === "rashifal" ? "/rashifal" : "/reminders") as never);
    };
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);

  return null;
}
