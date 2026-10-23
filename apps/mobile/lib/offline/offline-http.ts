import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
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

/** True while an offline download is saving responses (its requests may wait longer). */
export function isCapturing(): boolean {
  return captureDepth > 0;
}

export function resetCaptureCounters(): void {
  captureBytes = 0;
  captureCount = 0;
}

export function captureTotals(): { bytes: number; count: number } {
  return { bytes: captureBytes, count: captureCount };
}

/**
 * Responses at least this big (UTF-8 bytes) are kept in a file and the row
 * keeps only the file name. A year wheel is megabytes; held inline it made the
 * database (and its WAL) grow by that much per year and every read pulled the
 * whole row through SQLite. Files also stay clear of any per-row size limit.
 * Small responses (most days, months) stay inline: one query, no file I/O.
 */
const FILE_THRESHOLD_BYTES = 256 * 1024;

/**
 * Document directory, not cache: the user asked for this data offline, so the
 * OS must not evict it under storage pressure (the query cache, which can be
 * re-fetched, lives in the cache directory instead).
 */
const FILE_DIR = `${FileSystem.documentDirectory}offline-http/`;

let dirReady: Promise<void> | null = null;

function ensureFileDir(): Promise<void> {
  if (!dirReady) {
    dirReady = FileSystem.makeDirectoryAsync(FILE_DIR, { intermediates: true }).catch((err) => {
      dirReady = null;
      throw err;
    });
  }
  return dirReady;
}

async function fileNameFor(key: string): Promise<string> {
  return `${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key)}.json`;
}

/** Write via a temp file so a crash mid-write never leaves a truncated response. */
async function writePayloadFile(name: string, text: string, retry = true): Promise<void> {
  await ensureFileDir();
  const uri = `${FILE_DIR}${name}`;
  const tmp = `${uri}.tmp`;
  try {
    await FileSystem.writeAsStringAsync(tmp, text);
    await FileSystem.deleteAsync(uri, { idempotent: true });
    await FileSystem.moveAsync({ from: tmp, to: uri });
  } catch (err) {
    await FileSystem.deleteAsync(tmp, { idempotent: true }).catch(() => undefined);
    // The folder can vanish while the app runs (storage cleared from system
    // settings); make it again once instead of failing every later save.
    if (retry) {
      dirReady = null;
      return writePayloadFile(name, text, false);
    }
    throw err;
  }
}

async function deletePayloadFile(name: string | null | undefined): Promise<void> {
  if (!name) return;
  await FileSystem.deleteAsync(`${FILE_DIR}${name}`, { idempotent: true }).catch(() => undefined);
}

export async function putOfflineResponse(path: string, text: string): Promise<void> {
  if (!OFFLINE_STORE_SUPPORTED) return;
  const db = await getOfflineDb();
  const key = normalizeOfflineKey(path);
  const bytes = utf8Length(text);
  if (bytes >= FILE_THRESHOLD_BYTES) {
    const name = await fileNameFor(key);
    await writePayloadFile(name, text);
    await db.runAsync(
      `INSERT INTO offline_http (key, payload, bytes, downloaded_at, file) VALUES (?, '', ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET payload = '', bytes = excluded.bytes, downloaded_at = excluded.downloaded_at, file = excluded.file`,
      [key, bytes, Date.now(), name],
    );
    return;
  }
  const previous = await db.getFirstAsync<{ file: string | null }>("SELECT file FROM offline_http WHERE key = ?", [key]);
  await db.runAsync(
    `INSERT INTO offline_http (key, payload, bytes, downloaded_at, file) VALUES (?, ?, ?, ?, NULL)
     ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, bytes = excluded.bytes, downloaded_at = excluded.downloaded_at, file = NULL`,
    [key, text, bytes, Date.now()],
  );
  await deletePayloadFile(previous?.file);
}

/** A large response an older build saved inline moves to a file the first time it is read. */
async function moveInlineToFile(key: string, text: string): Promise<void> {
  try {
    const name = await fileNameFor(key);
    await writePayloadFile(name, text);
    const db = await getOfflineDb();
    await db.runAsync("UPDATE offline_http SET payload = '', file = ? WHERE key = ?", [name, key]);
  } catch {
    /* stays inline; still readable */
  }
}

export async function getOfflineResponse(path: string): Promise<string | null> {
  if (!OFFLINE_STORE_SUPPORTED) return null;
  const db = await getOfflineDb();
  const key = normalizeOfflineKey(path);
  const row = await db.getFirstAsync<{ payload: string; file: string | null }>(
    "SELECT payload, file FROM offline_http WHERE key = ?",
    [key],
  );
  if (!row) return null;
  if (row.file) {
    try {
      return await FileSystem.readAsStringAsync(`${FILE_DIR}${row.file}`);
    } catch {
      // The file is gone (cleared by hand, restored backup): forget the row so it is re-downloaded.
      await db.runAsync("DELETE FROM offline_http WHERE key = ?", [key]).catch(() => undefined);
      return null;
    }
  }
  // `length` counts UTF-16 units: a cheap lower bound on the UTF-8 size.
  if (row.payload.length >= FILE_THRESHOLD_BYTES / 3 && utf8Length(row.payload) >= FILE_THRESHOLD_BYTES) {
    void moveInlineToFile(key, row.payload);
  }
  return row.payload;
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
  await FileSystem.deleteAsync(FILE_DIR, { idempotent: true }).catch(() => undefined);
  dirReady = null;
  // Give the freed pages back to the OS (inline payloads from older builds were megabytes).
  await db.execAsync("VACUUM").catch(() => undefined);
}

/**
 * The saved copies that can answer `path`, best first. A request now carries
 * the UI `language=` next to its era, but the payloads hold both languages (the
 * parameter only stamps the response), so a copy saved in the other language —
 * or by an older build, before the parameter was sent — answers the same screen.
 * Festival listings are the exception: their names follow the language asked for,
 * and the download saves both on purpose, so each is looked up on its own.
 */
function savedPathCandidates(path: string): string[] {
  const out = [path];
  if (!/[?&]language=/.test(path) || path.startsWith("/nepal/festivals")) return out;
  out.push(path.replace(/([?&]language=)(ne|en)/, (_m, head: string, lang: string) => `${head}${lang === "en" ? "ne" : "en"}`));
  out.push(path.replace(/([?&])language=[^&]*&?/, "$1").replace(/[?&]$/, ""));
  return out;
}

async function readSaved<T>(path: string): Promise<T | null> {
  for (const candidate of savedPathCandidates(path)) {
    const text = await getOfflineResponse(candidate);
    if (text == null) continue;
    try {
      return JSON.parse(text) as T;
    } catch {
      /* try the next copy */
    }
  }
  return null;
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
  errorFor: (res: Response) => Error | Promise<Error>,
): Promise<T> {
  if (!OFFLINE_STORE_SUPPORTED) {
    const res = await request();
    if (!res.ok) throw await errorFor(res);
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
    throw await errorFor(res);
  }

  if (captureDepth > 0) {
    const text = await res.text();
    // Parse before saving: a captive portal (hotel / airport Wi-Fi) answers 200
    // with an HTML login page, which must not be stored as the day's data.
    const parsed = JSON.parse(text) as T;
    await putOfflineResponse(path, text);
    captureBytes += utf8Length(text);
    captureCount += 1;
    return parsed;
  }
  return res.json();
}
