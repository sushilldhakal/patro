/**
 * Small on-device key/value database (SQLite, `offline_meta` table) for
 * non-secret per-device state — the remembered user, biometric preference and
 * the like — instead of loose AsyncStorage/localStorage keys.
 *
 * Secrets (access/refresh tokens) never go here; they stay in the Keychain /
 * Keystore via `lib/auth/storage.ts`. On web the SQLite store is unavailable
 * and every call is a harmless no-op.
 */
import { readJsonMeta, writeJsonMeta } from "@/lib/offline/offline-db";

export const deviceStore = {
  async get<T>(key: string): Promise<T | null> {
    try {
      return await readJsonMeta<T>(key);
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await writeJsonMeta(key, value);
    } catch {
      /* best effort */
    }
  },
  async remove(key: string): Promise<void> {
    await this.set(key, null);
  },
};
