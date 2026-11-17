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
 * Each open (cold start, or back after a few minutes away) is reported as a session, and while
 * the app is on screen it pings once a minute so the admin page can show who has it open right
 * now. The ping carries only the id and the platform, and stops the moment the app leaves the
 * screen.
 *
 * Best-effort throughout: a failed report is dropped and the next one makes it good. Skipped on
 * web, in development and on simulators, so only real installs are counted. Imported once by the
 * root layout; the listener lives as long as the process.
 */
const STORAGE_KEY = "install:id";
/** A heartbeat with no new session is sent at most this often; the server ignores repeats too. */
const REPORT_EVERY_MS = 30 * 60_000;
/** Back from the background after this long counts as a new open. */
const NEW_SESSION_AFTER_MS = 5 * 60_000;
/** While on screen, for the live "open now" count. */
const PING_EVERY_MS = 60_000;
/** After the first screen has its data, not in competition with it. */
const FIRST_REPORT_DELAY_MS = 4000;

const platform = Platform.OS === "ios" ? "ios" : "android";
let lastReport = 0;
let reporting = false;
let backgroundedAt: number | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;

async function installationId(): Promise<{ id: string; created: boolean }> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) return { id: stored, created: false };
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(STORAGE_KEY, id);
  return { id, created: true };
}

async function report(sessionStart: boolean): Promise<void> {
  if (reporting || (!sessionStart && Date.now() - lastReport < REPORT_EVERY_MS)) return;
  reporting = true;
  try {
    const { id, created } = await installationId();
    // Sends the access token when someone is signed in, so the server can tell people from devices.
    await authFetch(`/v1/analytics/install/${created ? "register" : "heartbeat"}`, {
      method: "POST",
      body: JSON.stringify({
        installation_id: id,
        platform,
        app_version: Application.nativeApplicationVersion ?? undefined,
        os_version: Device.osVersion ?? undefined,
        session_start: sessionStart,
      }),
    });
    lastReport = Date.now();
  } catch {
    /* offline or the server is down: the next launch or foreground reports instead */
  } finally {
    reporting = false;
  }
}

async function ping(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(STORAGE_KEY);
    if (!id) return;
    await authFetch("/v1/analytics/install/ping", {
      method: "POST",
      body: JSON.stringify({ installation_id: id, platform }),
    });
  } catch {
    /* a missed ping only drops this phone from the live count for a minute */
  }
}

function startPinging(): void {
  if (pingTimer) return;
  pingTimer = setInterval(() => void ping(), PING_EVERY_MS);
}

function stopPinging(): void {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
}

if (Platform.OS !== "web" && !__DEV__ && Device.isDevice) {
  setTimeout(() => {
    void report(true);
    if (AppState.currentState === "active") startPinging();
  }, FIRST_REPORT_DELAY_MS);
  AppState.addEventListener("change", (next) => {
    if (next === "active") {
      const away = backgroundedAt == null ? 0 : Date.now() - backgroundedAt;
      backgroundedAt = null;
      void report(away >= NEW_SESSION_AFTER_MS);
      startPinging();
    } else if (next === "background") {
      backgroundedAt ??= Date.now();
      stopPinging();
    }
  });
}
