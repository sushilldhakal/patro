/**
 * Web build of the offline DB module. `expo-sqlite`'s web implementation pulls
 * in a wasm worker Metro's web bundler can't resolve here, and web doesn't
 * need the bulk BS-year cache anyway (see OFFLINE_STORE_SUPPORTED in
 * lib/offline/offline-store.ts) — so this file replaces offline-db.ts on web
 * (the `moduleSuffixes`/Metro `.web.ts` platform-extension convention) without
 * ever importing `expo-sqlite` at runtime. The `expo-sqlite` import below is
 * type-only, so it's erased and never reaches the web bundle.
 */
import type * as SQLite from "expo-sqlite";

export const OFFLINE_STORE_SUPPORTED = false;

export function getOfflineDb(): Promise<SQLite.SQLiteDatabase> {
  return Promise.reject(new Error("Offline SQLite store is not available on web."));
}

export async function readMeta(_key: string): Promise<string | null> {
  return null;
}

export async function writeMeta(_key: string, _value: string): Promise<void> {}

export async function readJsonMeta<T>(_key: string): Promise<T | null> {
  return null;
}

export async function writeJsonMeta<T>(_key: string, _value: T): Promise<void> {}
