import { useEffect } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

/** The channel the main-branch workflow publishes to (.github/workflows/eas-update.yml). */
const PREVIEW_CHANNEL = "preview";
/** Least time between two checks when the app keeps coming back to the foreground. */
const MIN_CHECK_GAP_MS = 30_000;

/**
 * Preview builds only: check for a newer update when the app opens and each
 * time it returns to the foreground, and switch to it as soon as it has
 * downloaded, so a push to main shows on the phone without two cold launches.
 * Development builds (the dev launcher picks updates) and store builds (the
 * normal download-then-apply-on-next-launch) are left alone.
 */
export function usePreviewAutoUpdate() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled || Updates.channel !== PREVIEW_CHANNEL) return;

    let lastCheck = 0;
    let busy = false;
    const check = async () => {
      const now = Date.now();
      if (busy || now - lastCheck < MIN_CHECK_GAP_MS) return;
      busy = true;
      lastCheck = now;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (fetched.isNew) await Updates.reloadAsync();
      } catch {
        // Offline or the server is unreachable: keep running what is installed.
      } finally {
        busy = false;
      }
    };

    void check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => sub.remove();
  }, []);
}
