import { useEffect, useState } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";
import { markSplashReload } from "@/lib/splash-handoff";

/**
 * Channels whose builds pick up a published update on their own: TestFlight (`preview`) and the
 * store builds (`production`). Development builds are left to the dev launcher.
 */
const AUTO_UPDATE_CHANNELS = new Set(["preview", "production"]);
/** Least time between two checks when the app keeps coming back to the foreground. */
const MIN_CHECK_GAP_MS = 30_000;
/** How long the launch splash waits for a newer update before the app shows anyway. */
const LAUNCH_BUDGET_MS = 4_000;
/**
 * How long the app must have been back in the foreground before a downloaded update reloads it.
 * Android 12+ hands its splash surface to the app on the first draws after the activity resumes
 * (or is recreated after the system dropped it); reloading inside that window released the surface
 * under the hand-off and crashed (Sentry PATRO-Z, NullPointerException in
 * syncTransferSplashscreenViewTransaction), or froze the first frame (PATRO-W).
 */
const FOREGROUND_SETTLE_MS = 2_500;

const isAutoUpdating = () => !__DEV__ && Updates.isEnabled && AUTO_UPDATE_CHANNELS.has(Updates.channel ?? "");

/**
 * Runtimes whose binaries carry react-native-worklets 0.13. Reloading the app in place there tears
 * down the JS runtime while worklets still hold values in it, and the app crashes freeing them
 * (Sentry PATRO-N: EXC_BAD_ACCESS in RetainingSerializableStore right after "Restarting for
 * update"; fixed upstream in worklets 0.14, which needs a new store build). On these runtimes an
 * update is still downloaded, and opens on the next launch instead of reloading the running app.
 */
const RELOAD_UNSAFE_RUNTIMES = new Set(["1.2.2", "1.2.3"]);
const canReloadInPlace = () => !RELOAD_UNSAFE_RUNTIMES.has(Updates.runtimeVersion ?? "");

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
  // Without an in-place reload there is nothing for the splash to wait for.
  const [settled, setSettled] = useState(() => !isAutoUpdating() || !canReloadInPlace());

  useEffect(() => {
    if (!isAutoUpdating()) return;

    let lastCheck = 0;
    let busy = false;
    let launching = true;
    /** When the app last became active; a newer value means it left and came back meanwhile. */
    let activeSince = Date.now();
    const settle = () => {
      launching = false;
      setSettled(true);
    };
    const budget = setTimeout(settle, canReloadInPlace() ? LAUNCH_BUDGET_MS : 0);

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
        if (fetched.isNew && canReloadInPlace() && (launching || onForeground)) {
          if (launching) {
            // The reloaded app keeps the splash's logo in place instead of replaying its entrance.
            markSplashReload();
            await Updates.reloadAsync();
          } else {
            // Let the resumed activity finish its first draws (and the splash hand-off) first, and
            // only reload if the reader is still here; otherwise it opens on the next launch.
            const at = activeSince;
            await new Promise((resolve) => setTimeout(resolve, Math.max(0, at + FOREGROUND_SETTLE_MS - Date.now())));
            if (AppState.currentState === "active" && activeSince === at) await Updates.reloadAsync();
          }
        }
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
      if (state === "active") {
        activeSince = Date.now();
        void check(true);
      }
    });
    return () => {
      clearTimeout(budget);
      sub.remove();
    };
  }, []);

  return settled;
}
