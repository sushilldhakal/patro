import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { relinkDayDetail, unlinkDayDetail } from "@vedic-patro/api-client";

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

/**
 * Upper bound on the persisted cache, in JSON characters. Every query waits for
 * the restore before it may fetch, so the whole file is read and parsed before
 * any screen can load — and the whole cache is re-serialized on the JS thread
 * every few seconds while browsing. Uncapped, a week of browsing (one day's
 * panchanga is ~140 KB) grew it to many MB and both costs to seconds.
 */
const PERSIST_BUDGET_CHARS = 2_000_000;

/**
 * A query's `state.data` keeps its identity until the query refetches, so its
 * JSON is remembered here and a save re-serializes only what changed. Without
 * this every save (every few seconds while screens are loading) stringified the
 * whole cache twice on the JS thread — megabytes of work competing with the
 * screen that was trying to render.
 */
const dataJson = new WeakMap<object, string>();

/** Stands in for `state.data` while the rest of the query is stringified. */
const DATA_SLOT = "\u0000vp-data";
const DATA_SLOT_JSON = JSON.stringify(DATA_SLOT);
const QUERIES_SLOT = "\u0000vp-queries";
const QUERIES_SLOT_JSON = JSON.stringify(QUERIES_SLOT);

function jsonOfData(data: unknown): string {
  if (data === null || typeof data !== "object") return JSON.stringify(data) ?? "null";
  let text = dataJson.get(data);
  if (text === undefined) {
    // A day's panchanga is written slim (shared blocks once); read back, it is re-linked.
    text = JSON.stringify(unlinkDayDetail(data));
    dataJson.set(data, text);
  }
  return text;
}

function jsonOfQuery(query: PersistedClient["clientState"]["queries"][number]): string {
  const data = query.state.data;
  if (data === undefined) return JSON.stringify(query);
  const shell = JSON.stringify({ ...query, state: { ...query.state, data: DATA_SLOT } });
  const at = shell.indexOf(DATA_SLOT_JSON);
  return shell.slice(0, at) + jsonOfData(data) + shell.slice(at + DATA_SLOT_JSON.length);
}

/** `JSON.stringify` of the most recently updated queries that fit {@link PERSIST_BUDGET_CHARS}. */
export function serializeQueryCache(client: PersistedClient): string {
  const newestFirst = [...client.clientState.queries].sort(
    (a, b) => (b.state.dataUpdatedAt ?? 0) - (a.state.dataUpdatedAt ?? 0),
  );
  const kept: string[] = [];
  let used = 0;
  for (const query of newestFirst) {
    const text = jsonOfQuery(query);
    if (used + text.length > PERSIST_BUDGET_CHARS) continue;
    kept.push(text);
    used += text.length;
  }
  const shell = JSON.stringify({ ...client, clientState: { ...client.clientState, queries: QUERIES_SLOT } });
  const at = shell.indexOf(QUERIES_SLOT_JSON);
  return `${shell.slice(0, at)}[${kept.join(",")}]${shell.slice(at + QUERIES_SLOT_JSON.length)}`;
}

/** `JSON.parse`, timed for {@link queryCacheRestoreStats}. */
export function deserializeQueryCache(text: string) {
  const started = Date.now();
  const parsed = JSON.parse(text);
  for (const query of parsed?.clientState?.queries ?? []) {
    const data = query?.state?.data;
    if (data && typeof data === "object" && Array.isArray(data.detail_shared)) relinkDayDetail(data);
  }
  queryCacheRestoreStats.parseMs = Date.now() - started;
  return parsed;
}
