/**
 * Face ID sign-in after a sign-out.
 *
 * With the Face ID lock on, signing out does not throw the session away: its
 * refresh token is put aside in the Keychain / Keystore behind the device's
 * biometrics (`requireAuthentication`), so it can only be read after Face ID /
 * Touch ID / fingerprint succeeds. Tapping "sign in" then asks for Face ID and
 * resumes that session — no password. Turning the lock off, or signing in some
 * other way, ends the parked session on the server too.
 */
import { Platform } from "react-native";
import { apiRevokeRefreshToken } from "@vedic-patro/api-client";
import { deviceStore } from "@/lib/device-store";

const PARKED_KEY = "dhakalPatroParkedRefresh";
/** A plain flag, readable without Face ID, so the UI knows whether to offer it. */
const PARKED_FLAG = "device:parked_session";
export const BIOMETRIC_ENABLED_KEY = "device:biometric_lock";

function secureStore(): typeof import("expo-secure-store") | null {
  if (Platform.OS === "web") return null;
  return require("expo-secure-store");
}

/** Whether a session is waiting behind Face ID on this device. */
export async function hasParkedSession(): Promise<boolean> {
  return Boolean(await deviceStore.get<boolean>(PARKED_FLAG));
}

/** Sign-out with the lock on: keep the refresh token behind biometrics. False when it could not be kept. */
export async function parkSession(refreshToken: string, prompt: string): Promise<boolean> {
  const store = secureStore();
  if (!store) return false;
  try {
    await store.setItemAsync(PARKED_KEY, refreshToken, { requireAuthentication: true, authenticationPrompt: prompt });
    await deviceStore.set(PARKED_FLAG, true);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the parked refresh token — the OS shows Face ID first. Null when the
 * reader cancels, or the enrolment changed (the item is then unreadable for good).
 */
export async function takeParkedSession(prompt: string): Promise<string | null> {
  const store = secureStore();
  if (!store) return null;
  try {
    const token = await store.getItemAsync(PARKED_KEY, { requireAuthentication: true, authenticationPrompt: prompt });
    if (!token) {
      await forgetParkedSession();
      return null;
    }
    await store.deleteItemAsync(PARKED_KEY);
    await deviceStore.remove(PARKED_FLAG);
    return token;
  } catch (err) {
    // A changed Face ID enrolment invalidates the item; a plain cancel does not.
    if (String((err as Error)?.message ?? err).match(/invalidat|not found|could not be found/i)) await forgetParkedSession();
    return null;
  }
}

/** Drop the parked session without reading it (no Face ID). It simply expires on the server. */
export async function forgetParkedSession(): Promise<void> {
  const store = secureStore();
  await deviceStore.remove(PARKED_FLAG);
  try {
    await store?.deleteItemAsync(PARKED_KEY);
  } catch {
    /* already gone */
  }
}

/** End a parked session on the server too — when the reader turns Face ID off. */
export async function revokeParkedSession(prompt: string): Promise<void> {
  if (!(await hasParkedSession())) return;
  const token = await takeParkedSession(prompt);
  if (!token) return;
  await apiRevokeRefreshToken(token);
}
