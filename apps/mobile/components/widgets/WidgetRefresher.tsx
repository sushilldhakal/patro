import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useLocale } from "@/lib/i18n";
import { refreshWidgets } from "@/lib/notifications/sync";

/** At most one widget refresh per this many ms when the app keeps coming back to the front. */
const MIN_GAP_MS = 2 * 60_000;

/**
 * Keeps the home-screen widgets fed: on launch, whenever the app returns to the foreground, and when
 * the language changes. Without it the widgets only got data from a notification sync, so a fresh
 * install showed an empty widget. Draws nothing.
 */
export function WidgetRefresher() {
  const { lang } = useLocale();
  const last = useRef(0);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const code = lang === "en" ? "en" : "ne";
    const run = (force: boolean) => {
      if (!force && Date.now() - last.current < MIN_GAP_MS) return;
      last.current = Date.now();
      void refreshWidgets(code).catch(() => {});
    };
    run(true);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") run(false);
    });
    return () => sub.remove();
  }, [lang]);
  return null;
}
