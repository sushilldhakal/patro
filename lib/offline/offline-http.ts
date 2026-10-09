import { getOfflineDb, OFFLINE_STORE_SUPPORTED } from "@/lib/offline/offline-db";
import { normalizeOfflineKey } from "@/lib/offline/offline-key";
import { isCurrentlyOnline } from "@/lib/offline/network-status";

/**
 * Raw API responses saved on the device, keyed by normalized request path.
 *
 * Every public endpoint the app calls goes through `offlineAwareGet` (see
 * `get()` in lib/api.ts). Online it behaves as before; when the network is
 * down — or the device is known to be offline — the saved response for the
 * same request is returned instead, so any screen whose data was downloaded
 * keeps working with no per-screen code.
 *
 * Responses are only *written* while a download job has opened a capture
 * (`beginCapture`), so ordinary browsing never fills the disk.
 */

/** Bytes the text takes on disk (SQLite stores UTF-8; Devanagari is 3 bytes a character). */
export function utf8Length(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      n += 4;
      i += 1;
    } else n += 3;
  }
  return n;
}

export class OfflineMissError extends Error {
  constructor(public readonly path: string) {
    super(`Not available offline: ${path}`);
    this.name = "OfflineMissError";
  }
}

let captureDepth = 0;
let captureSkipExisting = false;
let captureBytes = 0;
let captureCount = 0;

/**
 * Starts saving every successful response; returns a function that ends the
 * capture. With `skipExisting`, a request whose response is already saved is
 * answered from disk without touching the network, which is what makes an
 * interrupted download resumable.
 */
export function beginCapture(options?: { skipExisting?: boolean }): () => { bytes: number; count: number } {
  captureDepth += 1;
  captureSkipExisting = options?.skipExisting ?? false;
  let ended = false;
  return () => {
    if (!ended) {
      ended = true;
      captureDepth = Math.max(0, captureDepth - 1);
    }
    return { bytes: captureBytes, count: captureCount };
  };
}

export function resetCaptureCounters(): void {
  captureBytes = 0;
  captureCount = 0;
}

export function captureTotals(): { bytes: number; count: number } {
  return { bytes: captureBytes, count: captureCount };
}

export async function putOfflineResponse(path: string, text: string): Promise<void> {
  if (!OFFLINE_STORE_SUPPORTED) return;
  const db = await getOfflineDb();
  await db.runAsync(
    `INSERT INTO offline_http (key, payload, bytes, downloaded_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, bytes = excluded.bytes, downloaded_at = excluded.downloaded_at`,
    [normalizeOfflineKey(path), text, utf8Length(text), Date.now()],
  );
}

export async function getOfflineResponse(path: string): Promise<string | null> {
  if (!OFFLINE_STORE_SUPPORTED) return null;
  const db = await getOfflineDb();
  const row = await db.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM offline_http WHERE key = ?",
    [normalizeOfflineKey(path)],
  );
  return row?.payload ?? null;
}

export async function hasOfflineResponse(path: string): Promise<boolean> {
  if (!OFFLINE_STORE_SUPPORTED) return false;
  const db = await getOfflineDb();
  const row = await db.getFirstAsync<{ one: number }>(
    "SELECT 1 AS one FROM offline_http WHERE key = ?",
    [normalizeOfflineKey(path)],
  );
  return row != null;
}

export async function offlineHttpSummary(): Promise<{ count: number; bytes: number }> {
  if (!OFFLINE_STORE_SUPPORTED) return { count: 0, bytes: 0 };
  const db = await getOfflineDb();
  const row = await db.getFirstAsync<{ count: number; bytes: number | null }>(
    "SELECT COUNT(*) AS count, SUM(bytes) AS bytes FROM offline_http",
  );
  return { count: row?.count ?? 0, bytes: row?.bytes ?? 0 };
}

export async function clearOfflineHttp(): Promise<void> {
  if (!OFFLINE_STORE_SUPPORTED) return;
  const db = await getOfflineDb();
  await db.runAsync("DELETE FROM offline_http");
}

async function readSaved<T>(path: string): Promise<T | null> {
  const text = await getOfflineResponse(path);
  if (text == null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * `request` performs the real network call and returns the response. A
 * non-OK status is a real answer from the server (404 for an unsupported
 * year, 400 for a bad date) and is thrown as-is; only a failure to reach the
 * server at all, or a 5xx, falls back to the saved copy.
 */
export async function offlineAwareGet<T>(
  path: string,
  request: () => Promise<Response>,
  errorFor: (res: Response) => Error,
): Promise<T> {
  if (!OFFLINE_STORE_SUPPORTED) {
    const res = await request();
    if (!res.ok) throw errorFor(res);
    return res.json();
  }

  if (captureDepth === 0 && !(await isCurrentlyOnline())) {
    const saved = await readSaved<T>(path);
    if (saved != null) return saved;
    throw new OfflineMissError(path);
  }

  if (captureDepth > 0 && captureSkipExisting) {
    const saved = await readSaved<T>(path);
    if (saved != null) return saved;
  }

  let res: Response;
  try {
    res = await request();
  } catch (networkError) {
    const saved = await readSaved<T>(path);
    if (saved != null) return saved;
    throw networkError;
  }

  if (!res.ok) {
    if (res.status >= 500) {
      const saved = await readSaved<T>(path);
      if (saved != null) return saved;
    }
    throw errorFor(res);
  }

  if (captureDepth > 0) {
    const text = await res.text();
    await putOfflineResponse(path, text);
    captureBytes += utf8Length(text);
    captureCount += 1;
    return JSON.parse(text) as T;
  }
  return res.json();
}
