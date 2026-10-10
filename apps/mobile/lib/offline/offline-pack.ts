import {
  fetchCivilTimeline,
  fetchEclipseYear,
  fetchElementSpans,
  fetchFestivals,
  fetchGochar,
  fetchGocharIngress,
  fetchGrahaAstaYear,
  fetchGrahaVakriYear,
  fetchHolidays,
  fetchPanchakYear,
  fetchPanchanga,
  fetchRashifal,
  fetchSait,
  fetchSaitDetail,
  fetchSaitMonthAll,
  fetchSpecialMonths,
  fetchTropicalSeasons,
  fetchYearSunTimes,
  fetchYearWheelCalendar,
  type LocationParams,
  type YearWheelCalendar,
} from "@/lib/api";
import { fetchDocumentChapter, fetchDocumentDetail, fetchDocuments } from "@/lib/documents/api";
import { ELEMENT_META } from "@/lib/panchanga-elements";
import { formatBsDateKey } from "@vedic-patro/domain/patro-day";
import { SITEMAP_SAIT_CATEGORIES } from "@/lib/sitemap-routes";
import { OFFLINE_STORE_SUPPORTED, readJsonMeta, writeJsonMeta } from "@/lib/offline/offline-db";
import { beginCapture, captureTotals, OfflineMissError, resetCaptureCounters } from "@/lib/offline/offline-http";
import { isCurrentlyOnline, isCurrentlyOnWifi } from "@/lib/offline/network-status";

/**
 * Offline packs: which public data is saved for a chosen BS-year window.
 *
 * A pack never invents requests of its own. It calls the same `fetch*`
 * functions the screens call, with the arguments the screens use, while a
 * capture is open (lib/offline/offline-http.ts) — so what is saved is exactly
 * what the screens will ask for later, and nothing about the URL shape is
 * duplicated here.
 */

export type PackGroupId = "calendar" | "sky" | "daily" | "documents";

export const PACK_GROUPS: {
  id: PackGroupId;
  /** Year-based groups repeat for every year; the rest happen once. */
  perYear: boolean;
  required?: boolean;
}[] = [
  { id: "calendar", perYear: true, required: true },
  { id: "sky", perYear: true },
  { id: "daily", perYear: true },
  { id: "documents", perYear: false },
];

export interface PackSelection {
  startYear: number;
  endYear: number;
  groups: PackGroupId[];
  location: LocationParams | undefined;
  /** Cache key of `location`, to tell packs for different places apart. */
  locationKey: string;
}

export interface PackSizeEstimate {
  years: number;
  sampleYear: number;
  perGroup: Partial<Record<PackGroupId, { bytes: number; requests: number }>>;
  totalBytes: number;
}

export type PackStatus = "idle" | "measuring" | "running" | "paused" | "done" | "error" | "cancelled";

export interface PackProgress {
  status: PackStatus;
  /** Finished work units (a year of one group, or the documents group). */
  completed: number;
  total: number;
  currentYear: number | null;
  currentGroup: PackGroupId | null;
  bytes: number;
  skippedRequests: number;
  error: string | null;
}

export interface SavedPack {
  selection: PackSelection;
  /** Work units already saved, as `${year}:${group}` or `once:${group}`. */
  done: string[];
  finished: boolean;
  updatedAt: number;
}

const PACK_META_KEY = "offline_pack_v2";
/** Days of one year fetched to learn the per-day size of the `daily` group. */
const DAILY_SAMPLE_DAYS = 7;
const DAILY_CONCURRENCY = 4;
const THROTTLE_MS = 120;
/** Give up on a download after this many failed requests in a row. */
const MAX_CONSECUTIVE_FAILURES = 12;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function yearsIn(selection: Pick<PackSelection, "startYear" | "endYear">): number[] {
  const out: number[] = [];
  for (let y = selection.startYear; y <= selection.endYear; y += 1) out.push(y);
  return out;
}

function unitKey(year: number | null, group: PackGroupId): string {
  return year == null ? `once:${group}` : `${year}:${group}`;
}

function isOfflineFailure(err: unknown): boolean {
  if (err instanceof OfflineMissError) return true;
  // fetch() rejects with a TypeError when the server cannot be reached.
  return err instanceof TypeError;
}

// ── Saved state ────────────────────────────────────────────────────────────

export async function readSavedPacks(): Promise<Record<string, SavedPack>> {
  return (await readJsonMeta<Record<string, SavedPack>>(PACK_META_KEY)) ?? {};
}

async function writeSavedPack(pack: SavedPack): Promise<void> {
  const all = await readSavedPacks();
  all[pack.selection.locationKey] = pack;
  await writeJsonMeta(PACK_META_KEY, all);
}

export async function clearSavedPacks(): Promise<void> {
  await writeJsonMeta(PACK_META_KEY, {});
}

// ── What each group saves ──────────────────────────────────────────────────

type Task = () => Promise<unknown>;

async function runTasks(tasks: Task[], tally: { failures: number; consecutive: number }): Promise<void> {
  for (const task of tasks) {
    try {
      await task();
      tally.consecutive = 0;
    } catch (err) {
      if (isOfflineFailure(err)) throw err;
      // A real answer like 404/400 for one request — skip it, keep going.
      tally.failures += 1;
      tally.consecutive += 1;
      if (tally.consecutive >= MAX_CONSECUTIVE_FAILURES) throw err;
    }
    await delay(THROTTLE_MS);
  }
}

async function runConcurrent(tasks: Task[], width: number, tally: { failures: number; consecutive: number }) {
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const index = next++;
      try {
        await tasks[index]!();
        tally.consecutive = 0;
      } catch (err) {
        if (isOfflineFailure(err)) throw err;
        tally.failures += 1;
        tally.consecutive += 1;
        if (tally.consecutive >= MAX_CONSECUTIVE_FAILURES) throw err;
      }
    }
  };
  await Promise.all(Array.from({ length: width }, worker));
}

// The year payload drives the other groups (month lengths, dates). It is
// fetched once per year per job so measuring never counts it twice.
const wheelMemo = new Map<string, Promise<YearWheelCalendar>>();

function wheelFor(year: number, location: LocationParams | undefined): Promise<YearWheelCalendar> {
  const key = `${year}:${JSON.stringify(location ?? null)}`;
  let hit = wheelMemo.get(key);
  if (!hit) {
    hit = fetchYearWheelCalendar(year, location);
    hit.catch(() => wheelMemo.delete(key));
    wheelMemo.set(key, hit);
  }
  return hit;
}

function calendarTasks(year: number, location: LocationParams | undefined): Task[] {
  const tasks: Task[] = [
    () => wheelFor(year, location),
    () => fetchHolidays(year),
    () => fetchFestivals(year, { language: "ne" }),
    () => fetchFestivals(year, { language: "en" }),
    () => fetchSpecialMonths(year),
  ];
  for (let month = 1; month <= 12; month += 1) {
    tasks.push(() => fetchSaitMonthAll(year, month, location));
  }
  for (const category of SITEMAP_SAIT_CATEGORIES) {
    tasks.push(() => fetchSait(year, category, location));
    tasks.push(() => fetchSaitDetail(year, category, location));
  }
  return tasks;
}

async function skyTasks(year: number, location: LocationParams | undefined): Promise<Task[]> {
  // Month lengths come from the year payload the calendar group just saved.
  const wheel = await wheelFor(year, location);
  const tasks: Task[] = [
    () => fetchGrahaAstaYear(year, location, "bs"),
    () => fetchGrahaVakriYear(year, location, "bs"),
    () => fetchEclipseYear("solar", year, location, "bs"),
    () => fetchEclipseYear("lunar", year, location, "bs"),
    () => fetchPanchakYear(year, location, "bs"),
    () => fetchYearSunTimes(year, "bs", location),
  ];
  for (const month of wheel.months) {
    tasks.push(() =>
      fetchGocharIngress(
        formatBsDateKey(year, month.month_bs, 1),
        formatBsDateKey(year, month.month_bs, month.month_length),
        location,
        { level: "patro", era: "bs" },
      ),
    );
    for (const element of ELEMENT_META) {
      if (element.kind !== "span") continue;
      tasks.push(() =>
        fetchElementSpans(element.id, { era: "bs", year, month: month.month_bs }, location),
      );
    }
  }
  return tasks;
}

async function dailyTasks(
  year: number,
  location: LocationParams | undefined,
  limitDays?: number,
): Promise<Task[]> {
  const wheel = await wheelFor(year, location);
  const dates = wheel.calendar.map((d) => d.date_ad);
  const tasks: Task[] = [];
  for (const dateAd of limitDays ? dates.slice(0, limitDays) : dates) {
    tasks.push(() => fetchPanchanga(dateAd, "ad", location));
    tasks.push(() => fetchCivilTimeline(dateAd, "ad", location));
    tasks.push(() => fetchGochar(dateAd, "ad", location));
    tasks.push(() => fetchRashifal(dateAd, "daily", location));
  }
  return tasks;
}

async function documentsTasks(): Promise<Task[]> {
  const list = await fetchDocuments();
  const tasks: Task[] = [];
  for (const summary of list.documents) {
    tasks.push(async () => {
      const detail = await fetchDocumentDetail(summary.slug);
      for (const chapter of detail.chapters) {
        if (chapter.number != null) await fetchDocumentChapter(summary.slug, chapter.number);
      }
    });
  }
  return tasks;
}

async function runGroup(
  group: PackGroupId,
  year: number | null,
  location: LocationParams | undefined,
  tally: { failures: number; consecutive: number },
  options?: { dailyLimitDays?: number },
): Promise<void> {
  switch (group) {
    case "calendar":
      return runTasks(calendarTasks(year!, location), tally);
    case "sky":
      return runTasks(await skyTasks(year!, location), tally);
    case "daily":
      return runConcurrent(await dailyTasks(year!, location, options?.dailyLimitDays), DAILY_CONCURRENCY, tally);
    case "documents":
      return runTasks(await documentsTasks(), tally);
  }
}

// ── Size estimate ──────────────────────────────────────────────────────────

/**
 * Downloads one real year (and a week of daily detail, and the documents) and
 * measures it, so the size shown to the user is what this server actually
 * sends rather than a guess. What is fetched is kept, and the download that
 * follows skips it.
 */
export async function estimatePackSize(
  selection: PackSelection,
  currentBsYear: number,
  onProgress?: (p: PackProgress) => void,
): Promise<PackSizeEstimate> {
  if (!OFFLINE_STORE_SUPPORTED) {
    return { years: 0, sampleYear: selection.startYear, perGroup: {}, totalBytes: 0 };
  }
  const years = yearsIn(selection);
  const sampleYear = Math.min(Math.max(currentBsYear, selection.startYear), selection.endYear);
  const tally = { failures: 0, consecutive: 0 };
  wheelMemo.clear();
  const perGroup: PackSizeEstimate["perGroup"] = {};
  const total = selection.groups.length;
  let completed = 0;

  const end = beginCapture({ skipExisting: false });
  try {
    for (const group of selection.groups) {
      onProgress?.({
        status: "measuring",
        completed,
        total,
        currentYear: sampleYear,
        currentGroup: group,
        bytes: captureTotals().bytes,
        skippedRequests: tally.failures,
        error: null,
      });
      resetCaptureCounters();
      const sampleDaily = group === "daily" ? DAILY_SAMPLE_DAYS : undefined;
      await runGroup(group, group === "documents" ? null : sampleYear, selection.location, tally, {
        dailyLimitDays: sampleDaily,
      });
      const { bytes, count } = captureTotals();
      perGroup[group] = { bytes, requests: count };
      completed += 1;
    }
  } finally {
    end();
  }

  // Scale the measured sample up to the whole window.
  let totalBytes = 0;
  const scaled: PackSizeEstimate["perGroup"] = {};
  for (const group of selection.groups) {
    const sample = perGroup[group] ?? { bytes: 0, requests: 0 };
    let factor = 1;
    if (group === "daily") {
      // The sample covered DAILY_SAMPLE_DAYS of a ~365-day year.
      factor = (years.length * 365) / DAILY_SAMPLE_DAYS;
    } else if (PACK_GROUPS.find((g) => g.id === group)?.perYear) {
      factor = years.length;
    }
    const bytes = Math.round(sample.bytes * factor);
    scaled[group] = { bytes, requests: Math.round(sample.requests * factor) };
    totalBytes += bytes;
  }
  return { years: years.length, sampleYear, perGroup: scaled, totalBytes };
}

// ── Download ───────────────────────────────────────────────────────────────

export interface RunPackOptions {
  wifiOnly?: boolean;
  onProgress?: (p: PackProgress) => void;
  /** Checked between units of work; return false to stop. */
  shouldContinue?: () => boolean;
}

function workUnits(selection: PackSelection): { year: number | null; group: PackGroupId }[] {
  const units: { year: number | null; group: PackGroupId }[] = [];
  for (const year of yearsIn(selection)) {
    for (const group of selection.groups) {
      if (PACK_GROUPS.find((g) => g.id === group)?.perYear) units.push({ year, group });
    }
  }
  if (selection.groups.includes("documents")) units.push({ year: null, group: "documents" });
  return units;
}

/**
 * Saves every unit of the selection that is not saved yet. Safe to call again
 * after an interruption: finished units are skipped, and within a unit any
 * request already on disk is answered from disk.
 */
export async function runPackDownload(
  selection: PackSelection,
  options: RunPackOptions = {},
): Promise<PackProgress> {
  // Finished units are kept across selections: a year saved by an earlier,
  // narrower window is never downloaded again.
  const saved = (await readSavedPacks())[selection.locationKey];
  const pack: SavedPack = {
    selection,
    done: saved?.done ?? [],
    finished: false,
    updatedAt: Date.now(),
  };

  const units = workUnits(selection);
  const progress: PackProgress = {
    status: "running",
    completed: units.filter((u) => pack.done.includes(unitKey(u.year, u.group))).length,
    total: units.length,
    currentYear: null,
    currentGroup: null,
    bytes: 0,
    skippedRequests: 0,
    error: null,
  };
  const emit = () => options.onProgress?.({ ...progress });
  emit();

  if (!OFFLINE_STORE_SUPPORTED) {
    progress.status = "done";
    emit();
    return progress;
  }

  const tally = { failures: 0, consecutive: 0 };
  wheelMemo.clear();
  resetCaptureCounters();
  const end = beginCapture({ skipExisting: true });
  try {
    for (const unit of units) {
      const key = unitKey(unit.year, unit.group);
      if (pack.done.includes(key)) continue;

      if (options.shouldContinue && !options.shouldContinue()) {
        progress.status = "cancelled";
        emit();
        return progress;
      }
      if (!(await isCurrentlyOnline()) || (options.wifiOnly && !(await isCurrentlyOnWifi()))) {
        progress.status = "paused";
        emit();
        await writeSavedPack({ ...pack, updatedAt: Date.now() });
        return progress;
      }

      progress.currentYear = unit.year;
      progress.currentGroup = unit.group;
      emit();

      try {
        await runGroup(unit.group, unit.year, selection.location, tally);
      } catch (err) {
        progress.status = isOfflineFailure(err) ? "paused" : "error";
        progress.error = isOfflineFailure(err) ? null : err instanceof Error ? err.message : String(err);
        progress.bytes = captureTotals().bytes;
        emit();
        await writeSavedPack({ ...pack, updatedAt: Date.now() });
        return progress;
      }

      pack.done.push(key);
      progress.completed += 1;
      progress.bytes = captureTotals().bytes;
      progress.skippedRequests = tally.failures;
      await writeSavedPack({ ...pack, updatedAt: Date.now() });
      emit();
    }
  } finally {
    end();
  }

  pack.finished = true;
  await writeSavedPack({ ...pack, updatedAt: Date.now() });
  progress.status = "done";
  progress.currentYear = null;
  progress.currentGroup = null;
  emit();
  return progress;
}
