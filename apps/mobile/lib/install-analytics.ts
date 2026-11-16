import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import { AppState, Platform } from "react-native";
import { authFetch } from "@vedic-patro/api-client";

/**
 * Anonymous install counting. On first launch the app makes up a random id and keeps it in
 * AsyncStorage, which an update keeps and an uninstall clears on both platforms (the Keychain
 * would outlive a reinstall on iOS and make it look like the old install). The id names no
 * person and no hardware. The server is told the id, the platform and the app and OS versions
 * on launch and on return to the foreground; it keeps one row per install and its last-seen time.
 *
 * Best-effort throughout: a failed report is dropped and the next one makes it good. Skipped on
 * web, in development and on simulators, so only real installs are counted. Imported once by the
 * root layout; the listener lives as long as the process.
 */
const STORAGE_KEY = "install:id";
/** The server also ignores repeats; this only saves the request. */
const REPORT_EVERY_MS = 30 * 60_000;
/** After the first screen has its data, not in competition with it. */
const FIRST_REPORT_DELAY_MS = 4000;

let lastReport = 0;
let reporting = false;

async function installationId(): Promise<{ id: string; created: boolean }> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) return { id: stored, created: false };
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(STORAGE_KEY, id);
  return { id, created: true };
}

async function report(): Promise<void> {
  if (reporting || Date.now() - lastReport < REPORT_EVERY_MS) return;
  reporting = true;
  try {
    const { id, created } = await installationId();
    // Sends the access token when someone is signed in, so the server can tell people from devices.
    await authFetch(`/v1/analytics/install/${created ? "register" : "heartbeat"}`, {
      method: "POST",
      body: JSON.stringify({
        installation_id: id,
        platform: Platform.OS === "ios" ? "ios" : "android",
        app_version: Application.nativeApplicationVersion ?? undefined,
        os_version: Device.osVersion ?? undefined,
      }),
    });
    lastReport = Date.now();
  } catch {
    /* offline or the server is down: the next launch or foreground reports instead */
  } finally {
    reporting = false;
  }
}

if (Platform.OS !== "web" && !__DEV__ && Device.isDevice) {
  setTimeout(() => void report(), FIRST_REPORT_DELAY_MS);
  AppState.addEventListener("change", (next) => {
    if (next === "active") void report();
  });
}
