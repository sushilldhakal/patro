import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";

const DB_NAME = "vedic_patro_offline.db";

/**
 * The bulk BS-year offline cache is SQLite-backed and mobile-only. Web already
 * has its own offline story (browser HTTP cache, the AsyncStorage-backed
 * react-query persister in app/_layout.tsx) and expo-sqlite's web support
 * needs cross-origin-isolation headers Metro's web build doesn't set up — so
 * every offline-store function checks this before touching the database.
 */
export const OFFLINE_STORE_SUPPORTED = Platform.OS !== "web";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS bs_year_cache (
      year INTEGER NOT NULL,
      location_key TEXT NOT NULL,
      payload TEXT NOT NULL,
      downloaded_at INTEGER NOT NULL,
      PRIMARY KEY (year, location_key)
    );
    CREATE TABLE IF NOT EXISTS offline_http (
      key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      downloaded_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS offline_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

/** Singleton connection — the schema is created at most once per process. */
export function getOfflineDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

export async function readMeta(key: string): Promise<string | null> {
  if (!OFFLINE_STORE_SUPPORTED) return null;
  const db = await getOfflineDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM offline_meta WHERE key = ?",
    [key],
  );
  return row?.value ?? null;
}

export async function writeMeta(key: string, value: string): Promise<void> {
  if (!OFFLINE_STORE_SUPPORTED) return;
  const db = await getOfflineDb();
  await db.runAsync(
    "INSERT INTO offline_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

export async function readJsonMeta<T>(key: string): Promise<T | null> {
  const raw = await readMeta(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonMeta<T>(key: string, value: T): Promise<void> {
  await writeMeta(key, JSON.stringify(value));
}
