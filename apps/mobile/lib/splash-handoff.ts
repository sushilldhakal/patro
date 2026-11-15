import { Platform } from "react-native";
import Storage from "expo-sqlite/kv-store";

/*
 * At launch the app may find a newer update and reload into it while the splash is still up
 * (lib/use-auto-update.ts). The reload starts a fresh JavaScript runtime, so the splash's
 * entrance played a second time. The launch writes this marker just before reloading, and the
 * reloaded app shows the logo already in place, so the two read as one splash.
 *
 * Read synchronously (expo-sqlite's key/value store) because the splash's first frame needs it.
 */
const KEY = "splash.reloadedIntoUpdateAt";
/** A marker older than this is left over from something else (a crash during the reload). */
const FRESH_MS = 20_000;

/** Call right before reloading into an update during launch. */
export function markSplashReload(): void {
  if (Platform.OS === "web") return;
  try {
    Storage.setItemSync(KEY, String(Date.now()));
  } catch {
    // Worst case the splash plays its entrance again.
  }
}

function consume(): boolean {
  if (Platform.OS === "web") return false;
  try {
    const at = Storage.getItemSync(KEY);
    if (at == null) return false;
    Storage.removeItemSync(KEY);
    return Date.now() - Number(at) < FRESH_MS;
  } catch {
    return false;
  }
}

/** True once per launch when this runtime is the reload into an update the launch just fetched. */
export const RELOADED_INTO_UPDATE = consume();
