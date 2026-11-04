import { useEffect, useState } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

/** The channel the main-branch workflow publishes to (.github/workflows/eas-update.yml). */
const PREVIEW_CHANNEL = "preview";
/** Least time between two checks when the app keeps coming back to the foreground. */
const MIN_CHECK_GAP_MS = 30_000;
/** How long the launch splash waits for a newer update before the app shows anyway. */
const LAUNCH_BUDGET_MS = 4_000;

const isPreview = () => !__DEV__ && Updates.isEnabled && Updates.channel === PREVIEW_CHANNEL;

/**
 * Preview builds only: pick up a push to main without two cold launches, and without showing the
 * splash twice.
 *
 * At launch the check runs while the splash is still up (returns `false` until it settles, at
 * most LAUNCH_BUDGET_MS): a newer update found and downloaded in time is switched to right there,
 * so the reload reads as one longer splash instead of splash → home → splash → home. One that
 * takes longer, and any found when the app returns to the foreground, is only downloaded; the
 * next launch opens it. Development builds (the dev launcher picks updates) and store builds
 * (the normal download-then-apply-on-next-launch) are left alone and settle at once.
 */
export function usePreviewAutoUpdate(): boolean {
  const [settled, setSettled] = useState(() => !isPreview());

  useEffect(() => {
    if (!isPreview()) return;

    let lastCheck = 0;
    let busy = false;
    let launching = true;
    const settle = () => {
      launching = false;
      setSettled(true);
    };
    const budget = setTimeout(settle, LAUNCH_BUDGET_MS);

    const check = async () => {
      const now = Date.now();
      if (busy || now - lastCheck < MIN_CHECK_GAP_MS) return;
      busy = true;
      lastCheck = now;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        // Only while the splash is still up; after that the next launch opens it.
        if (fetched.isNew && launching) await Updates.reloadAsync();
      } catch {
        // Offline or the server is unreachable: keep running what is installed.
      } finally {
        busy = false;
        if (launching) {
          clearTimeout(budget);
          settle();
        }
      }
    };

    void check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      clearTimeout(budget);
      sub.remove();
    };
  }, []);

  return settled;
}
