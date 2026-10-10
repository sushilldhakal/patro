/**
 * Cross-platform token storage.
 *
 * Native (iOS/Android) → expo-secure-store (Keychain / Keystore).
 * Web (Expo web preview) → localStorage, matching the web app 1:1.
 *
 * The app keeps tokens in an in-memory cache for synchronous access inside
 * `authFetch`; this module is only the durable backing store, read once at
 * boot and written whenever the session changes.
 */
import { Platform } from "react-native";

type WebStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const webStore: WebStore | null =
  Platform.OS === "web" && typeof window !== "undefined" && window.localStorage
    ? window.localStorage
    : null;

// Loaded lazily so the native module is never required on web.
let secureStore: typeof import("expo-secure-store") | null = null;
function nativeStore() {
  if (!secureStore) secureStore = require("expo-secure-store");
  return secureStore!;
}

export async function storageGet(key: string): Promise<string | null> {
  try {
    if (webStore) return webStore.getItem(key);
    return (await nativeStore().getItemAsync(key)) ?? null;
  } catch {
    return null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  try {
    if (webStore) {
      webStore.setItem(key, value);
      return;
    }
    await nativeStore().setItemAsync(key, value);
  } catch {
    /* best-effort; session still works in-memory this launch */
  }
}

export async function storageRemove(key: string): Promise<void> {
  try {
    if (webStore) {
      webStore.removeItem(key);
      return;
    }
    await nativeStore().deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}
