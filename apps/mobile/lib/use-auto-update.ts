import { useEffect, useState } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

/**
 * Channels whose builds pick up a published update on their own: TestFlight (`preview`) and the
 * store builds (`production`). Development builds are left to the dev launcher.
 */
const AUTO_UPDATE_CHANNELS = new Set(["preview", "production"]);
/** Least time between two checks when the app keeps coming back to the foreground. */
const MIN_CHECK_GAP_MS = 30_000;
/** How long the launch splash waits for a newer update before the app shows anyway. */
const LAUNCH_BUDGET_MS = 4_000;

const isAutoUpdating = () => !__DEV__ && Updates.isEnabled && AUTO_UPDATE_CHANNELS.has(Updates.channel ?? "");

/**
 * Store and TestFlight builds: open a published update without waiting for two cold launches.
 *
 * Left to itself, expo-updates checks only on a cold launch, downloads in the background and opens
 * the update on the *next* cold launch — and iOS mostly resumes the app instead of cold-launching
 * it, so an OTA could sit unopened for days.
 *
 * At launch the check runs while the splash is still up (returns `false` until it settles, at most
 * LAUNCH_BUDGET_MS): a newer update downloaded in time is switched to right there, so the reload
 * reads as one longer splash. When the app comes back to the foreground it checks again, and a new
 * update is downloaded and opened at once — the reader has only just returned, so nothing is lost.
 */
export function useAutoUpdate(): boolean {
  const [settled, setSettled] = useState(() => !isAutoUpdating());

  useEffect(() => {
    if (!isAutoUpdating()) return;

    let lastCheck = 0;
    let busy = false;
    let launching = true;
    const settle = () => {
      launching = false;
      setSettled(true);
    };
    const budget = setTimeout(settle, LAUNCH_BUDGET_MS);

    const check = async (onForeground: boolean) => {
      const now = Date.now();
      if (busy || now - lastCheck < MIN_CHECK_GAP_MS) return;
      busy = true;
      lastCheck = now;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        // While the splash is up, or right as the reader returns to the app: open it now.
        // A launch download that ran past the splash budget opens on the next return or launch.
        if (fetched.isNew && (launching || onForeground)) await Updates.reloadAsync();
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

    void check(false);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check(true);
    });
    return () => {
      clearTimeout(budget);
      sub.remove();
    };
  }, []);

  return settled;
}
