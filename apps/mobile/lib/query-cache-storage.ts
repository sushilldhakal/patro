import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

/**
 * Storage for the persisted React Query cache.
 *
 * Native keeps the cache in a file, not AsyncStorage. On Android AsyncStorage
 * is one SQLite row per key, and Android cannot read a row over ~2 MB
 * (`SQLiteBlobTooBigException: Row too big to fit into CursorWindow`). The
 * dehydrated cache passes that after a little browsing, so every launch failed
 * to restore it and refetched every screen from the network — the reason the
 * Android app loaded data far slower than iOS (file-backed AsyncStorage, no
 * limit) and the web. Web keeps AsyncStorage (localStorage).
 *
 * The file lives in the app-private cache directory (Android
 * `/data/data/<pkg>/cache`, iOS `Library/Caches`): it is re-downloadable, so it
 * stays out of backups, and the OS may delete it under storage pressure. A
 * missing or unreadable file reads as "no cache"; a corrupt one fails to parse
 * and TanStack's restore removes it. Writes go to a temp file first so a crash
 * mid-write never leaves a truncated cache behind.
 */
type PersistStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/** Startup numbers for the last restore — logged by the root layout. */
export const queryCacheRestoreStats: { bytes: number; readMs: number; parseMs: number } = {
  bytes: 0,
  readMs: 0,
  parseMs: 0,
};

function cacheUri(key: string): string {
  return `${FileSystem.cacheDirectory}${key}.json`;
}

/** The cache used to live in AsyncStorage under the same key; move it out once. */
async function takeLegacyValue(key: string): Promise<string | null> {
  let value: string | null = null;
  try {
    // Fine on iOS; throws on Android once the row is over the CursorWindow limit.
    value = await AsyncStorage.getItem(key);
  } catch {
    value = null;
  }
  // Deleting never reads the row, so it frees the oversized entry on Android too.
  await AsyncStorage.removeItem(key).catch(() => undefined);
  return value;
}

const fileStorage: PersistStorage = {
  async getItem(key) {
    const uri = cacheUri(key);
    const started = Date.now();
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) return await takeLegacyValue(key);
      const text = await FileSystem.readAsStringAsync(uri);
      queryCacheRestoreStats.bytes = info.size ?? text.length;
      queryCacheRestoreStats.readMs = Date.now() - started;
      return text;
    } catch {
      // Evicted between the check and the read, or unreadable: start empty.
      return null;
    }
  },
  async setItem(key, value) {
    const uri = cacheUri(key);
    const tmp = `${uri}.tmp`;
    try {
      await FileSystem.writeAsStringAsync(tmp, value);
      await FileSystem.deleteAsync(uri, { idempotent: true });
      await FileSystem.moveAsync({ from: tmp, to: uri });
    } catch (err) {
      // Disk full or cache dir cleared mid-write: keep the app running, drop this save.
      await FileSystem.deleteAsync(tmp, { idempotent: true }).catch(() => undefined);
      throw err;
    }
  },
  async removeItem(key) {
    await FileSystem.deleteAsync(cacheUri(key), { idempotent: true }).catch(() => undefined);
  },
};

export const queryCacheStorage: PersistStorage = Platform.OS === "web" ? AsyncStorage : fileStorage;

/** `JSON.parse`, timed for {@link queryCacheRestoreStats}. */
export function deserializeQueryCache(text: string) {
  const started = Date.now();
  const parsed = JSON.parse(text);
  queryCacheRestoreStats.parseMs = Date.now() - started;
  return parsed;
}
