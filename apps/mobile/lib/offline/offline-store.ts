import { fetchYearWheelCalendar, locationCacheKey, yearWheelRequestPath, type LocationParams, type YearWheelCalendar } from "@/lib/api";
import { getOfflineResponse } from "@/lib/offline/offline-http";
import { getOfflineDb, OFFLINE_STORE_SUPPORTED } from "@/lib/offline/offline-db";
import { isCurrentlyOnline, isCurrentlyOnWifi } from "@/lib/offline/network-status";

export { OFFLINE_STORE_SUPPORTED };

/** Pause between year downloads so a bulk job doesn't starve the API or the UI thread. */
const DOWNLOAD_THROTTLE_MS = 200;

export class OfflineUnavailableError extends Error {
  constructor(
    public readonly bsYear: number,
  ) {
    super(`No offline data cached for BS year ${bsYear} and no network connection.`);
    this.name = "OfflineUnavailableError";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getCachedYear(
  year: number,
  location?: LocationParams,
): Promise<YearWheelCalendar | null> {
  if (!OFFLINE_STORE_SUPPORTED) return null;
  // Current store: the raw response saved by an offline pack.
  const saved = await getOfflineResponse(yearWheelRequestPath(year, location));
  if (saved) {
    try {
      return JSON.parse(saved) as YearWheelCalendar;
    } catch {
      /* fall through to the older table */
    }
  }
  // Older installs saved whole years in their own table; still honoured.
  const db = await getOfflineDb();
  const row = await db.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM bs_year_cache WHERE year = ? AND location_key = ?",
    [year, locationCacheKey(location)],
  );
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as YearWheelCalendar;
  } catch {
    return null;
  }
}

export async function isYearDownloaded(year: number, location?: LocationParams): Promise<boolean> {
  if (!OFFLINE_STORE_SUPPORTED) return false;
  const db = await getOfflineDb();
  const row = await db.getFirstAsync<{ year: number }>(
    "SELECT year FROM bs_year_cache WHERE year = ? AND location_key = ?",
    [year, locationCacheKey(location)],
  );
  return row != null;
}

async function saveYear(year: number, location: LocationParams | undefined, payload: YearWheelCalendar): Promise<void> {
  if (!OFFLINE_STORE_SUPPORTED) return;
  const db = await getOfflineDb();
  await db.runAsync(
    `INSERT INTO bs_year_cache (year, location_key, payload, downloaded_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(year, location_key) DO UPDATE SET payload = excluded.payload, downloaded_at = excluded.downloaded_at`,
    [year, locationCacheKey(location), JSON.stringify(payload), Date.now()],
  );
}

/** Fetches and persists one BS year. Throws on network failure — callers decide how to handle it. */
export async function downloadYear(year: number, location?: LocationParams): Promise<void> {
  if (!OFFLINE_STORE_SUPPORTED) return;
  const payload = await fetchYearWheelCalendar(year, location);
  await saveYear(year, location, payload);
}

export interface DownloadedYearsSummary {
  years: number[];
  minYear: number | null;
  maxYear: number | null;
  count: number;
  approxBytes: number;
}

const EMPTY_SUMMARY: DownloadedYearsSummary = { years: [], minYear: null, maxYear: null, count: 0, approxBytes: 0 };

export async function listDownloadedYears(location?: LocationParams): Promise<DownloadedYearsSummary> {
  if (!OFFLINE_STORE_SUPPORTED) return EMPTY_SUMMARY;
  const db = await getOfflineDb();
  const rows = await db.getAllAsync<{ year: number; size: number }>(
    "SELECT year, LENGTH(payload) AS size FROM bs_year_cache WHERE location_key = ? ORDER BY year ASC",
    [locationCacheKey(location)],
  );
  const years = rows.map((r) => r.year);
  const approxBytes = rows.reduce((sum, r) => sum + (r.size ?? 0), 0);
  return {
    years,
    minYear: years.length ? years[0]! : null,
    maxYear: years.length ? years[years.length - 1]! : null,
    count: years.length,
    approxBytes,
  };
}

export async function clearDownloadedYears(location?: LocationParams): Promise<void> {
  if (!OFFLINE_STORE_SUPPORTED) return;
  const db = await getOfflineDb();
  await db.runAsync("DELETE FROM bs_year_cache WHERE location_key = ?", [locationCacheKey(location)]);
}

export type DownloadRangeStatus = "idle" | "running" | "paused" | "done" | "error" | "cancelled";

export interface DownloadRangeProgress {
  status: DownloadRangeStatus;
  total: number;
  completed: number;
  skipped: number;
  currentYear: number | null;
  error: string | null;
}

export interface DownloadRangeOptions {
  location?: LocationParams;
  wifiOnly?: boolean;
  onProgress?: (progress: DownloadRangeProgress) => void;
  /** Checked before every year; return false to stop early (e.g. screen unmounted, user cancelled). */
  shouldContinue?: () => boolean;
}

/**
 * Downloads every year in `[startYear, endYear]` not already cached, sequentially
 * and throttled. Safe to re-run — already-downloaded years are skipped, so it
 * doubles as a "resume" for a job interrupted by the app closing or a lost
 * connection.
 */
export async function downloadYearRange(
  startYear: number,
  endYear: number,
  options: DownloadRangeOptions = {},
): Promise<DownloadRangeProgress> {
  if (!OFFLINE_STORE_SUPPORTED) {
    const noop: DownloadRangeProgress = {
      status: "done",
      total: 0,
      completed: 0,
      skipped: 0,
      currentYear: null,
      error: null,
    };
    options.onProgress?.(noop);
    return noop;
  }

  const { location, wifiOnly, onProgress, shouldContinue } = options;
  const years: number[] = [];
  for (let y = Math.min(startYear, endYear); y <= Math.max(startYear, endYear); y += 1) years.push(y);

  const progress: DownloadRangeProgress = {
    status: "running",
    total: years.length,
    completed: 0,
    skipped: 0,
    currentYear: null,
    error: null,
  };
  onProgress?.({ ...progress });

  for (const year of years) {
    if (shouldContinue && !shouldContinue()) {
      progress.status = "cancelled";
      onProgress?.({ ...progress });
      return progress;
    }

    const online = await isCurrentlyOnline();
    if (!online) {
      progress.status = "paused";
      onProgress?.({ ...progress });
      return progress;
    }

    if (wifiOnly && !(await isCurrentlyOnWifi())) {
      progress.status = "paused";
      onProgress?.({ ...progress });
      return progress;
    }

    progress.currentYear = year;
    onProgress?.({ ...progress });

    if (await isYearDownloaded(year, location)) {
      progress.skipped += 1;
      progress.completed += 1;
      onProgress?.({ ...progress });
      continue;
    }

    try {
      await downloadYear(year, location);
      progress.completed += 1;
      onProgress?.({ ...progress });
    } catch (err) {
      progress.status = "error";
      progress.error = err instanceof Error ? err.message : String(err);
      onProgress?.({ ...progress });
      return progress;
    }

    await delay(DOWNLOAD_THROTTLE_MS);
  }

  progress.status = "done";
  progress.currentYear = null;
  onProgress?.({ ...progress });
  return progress;
}
