// Lunar months on the client: amanta (Aausi to Aausi), purnimanta windows, adhik and kshaya, and
// the civil day a lunar date falls on at a place. A port of apps/rust/crates/panchanga/src/
// lunar_month.rs, reading every instant from the stored event index (new moons, purnimas, tithi
// starts and ends, the Sun's rashi) and computing only what depends on the place: sunrise, from the
// stored positions. No server call.
//
// Instants are Julian Days (UT). Civil days are Julian Day Numbers: day n runs from JD n - 0.5.
// Before 1582-10-15 a civil date is labelled in the Julian calendar, as the server does.
import { bsDateInTable, bsMonthInTable } from "../calendar/bs-calendar";
import { getZonedDateTimeParts, validTimeZone } from "../calendar/zoned-time";
import type { Sky } from "./sky";
import { sunriseSunset, tithiAt } from "./siddhanta-offline";

/** Lunar month names, Mesha first (the names lunar months take from the Sun's rashi). */
export const MASA_NAMES = [
  "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
] as const;
export type MasaName = (typeof MASA_NAMES)[number];

export type Paksha = "shukla" | "krishna";

/** How a festival rule picks the civil day out of the tithi it names. */
export type DateSelection = "udaya" | "boundary" | "madhyahna" | "aparahna" | "pradosh" | "para_yuta";

export function dateSelectionFromRule(value: unknown): DateSelection {
  switch (value) {
    case "boundary":
    case "madhyahna":
    case "aparahna":
    case "pradosh":
    case "para_yuta":
      return value;
    default:
      return "udaya";
  }
}

/** The place a lunar calendar is read at, and the sky (system) it is read in. */
export interface PatroObserver {
  sky: Sky;
  latitude: number;
  longitude: number;
  timeZone: string;
}

// ---------------------------------------------------------------- civil days

const CUTOVER_JD = 2299160.5; // 1582-10-15 00:00 UT
const CUTOVER_JDN = 2299161;
const DAY = 1;

/** Julian Day Number of a civil date: Gregorian from 1582-10-15, Julian before. */
export function civilJdn(year: number, month: number, day: number): number {
  const gregorian = year > 1582 || (year === 1582 && (month > 10 || (month === 10 && day >= 15)));
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const base = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4);
  return gregorian ? base - Math.floor(y / 100) + Math.floor(y / 400) - 32045 : base - 32083;
}

/** The civil date of a Julian Day Number (Julian calendar before 1582-10-15). */
export function civilFromJdn(jdn: number): { year: number; month: number; day: number } {
  let a: number;
  if (jdn >= CUTOVER_JDN) {
    const alpha = Math.floor((jdn - 1867216.25) / 36524.25);
    a = jdn + 1 + alpha - Math.floor(alpha / 4);
  } else {
    a = jdn;
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return { year, month, day };
}

/** "YYYY-MM-DD" for a Julian Day Number, as the server prints a civil date. */
export function isoFromJdn(jdn: number): string {
  const { year, month, day } = civilFromJdn(jdn);
  const y = `${year < 0 ? "-" : ""}${String(Math.abs(year)).padStart(4, "0")}`;
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The Julian Day Number of an ISO "YYYY-MM-DD" (negative years allowed). */
export function jdnFromIso(iso: string): number | null {
  const m = /^(-?\d+)-(\d\d)-(\d\d)$/.exec(iso);
  return m ? civilJdn(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

/** The UTC civil day of an instant. */
export function utcJdn(jd: number): number {
  return Math.floor(jd + 0.5);
}

// Days since 1970-01-01 (the BS tables' axis) and Julian Day Numbers differ by a constant.
const UNIX_DAY_JDN = 2440588;

// ---------------------------------------------------------------- the place's clock

const offsetCache = new Map<string, number>();
let referenceYearMs = Date.UTC(2026, 0, 15);

/** The zone's UTC offset in minutes at an instant (its modern offset before 1582, as the server). */
export function utcOffsetMinutes(timeZone: string, jd: number): number {
  const at = jd < CUTOVER_JD ? (referenceYearMs / 86_400_000 + 2440587.5) : jd;
  const hour = Math.floor(at * 24);
  const key = `${timeZone}|${hour}`;
  const hit = offsetCache.get(key);
  if (hit !== undefined) return hit;
  const ms = Math.round((hour / 24 - 2440587.5) * 86_400_000);
  let offset = 0;
  try {
    const p = getZonedDateTimeParts(new Date(ms), validTimeZone(timeZone));
    const wall = new Date(0);
    wall.setUTCFullYear(p.year, p.month - 1, p.day);
    wall.setUTCHours(p.hour % 24, p.minute, p.second, 0);
    offset = Math.round((wall.getTime() - ms) / 60_000);
  } catch {
    offset = 0;
  }
  if (offsetCache.size > 50_000) offsetCache.clear();
  offsetCache.set(key, offset);
  return offset;
}

/** For tests: the date the modern offset is read at. */
export function setReferenceOffsetDate(ms: number): void {
  referenceYearMs = ms;
  offsetCache.clear();
}

/** The civil day on the zone's clock at an instant. */
export function localJdn(jd: number, timeZone: string): number {
  return Math.floor(jd + 0.5 + utcOffsetMinutes(timeZone, jd) / 1440);
}

/** The instant the civil day `jdn` starts on the zone's clock. */
export function localMidnightJd(jdn: number, timeZone: string): number {
  const guess = jdn - 0.5;
  return guess - utcOffsetMinutes(timeZone, guess - utcOffsetMinutes(timeZone, guess) / 1440) / 1440;
}

// ---------------------------------------------------------------- sunrise

const sunCache = new WeakMap<Sky, Map<string, { rise: number | null; set: number | null }>>();

/** Sunrise and sunset on the civil day `jdn` at the observer, in the observer's system. */
export function sunOnDay(observer: PatroObserver, jdn: number): { rise: number | null; set: number | null } {
  let byDay = sunCache.get(observer.sky);
  if (!byDay) {
    byDay = new Map();
    sunCache.set(observer.sky, byDay);
  }
  const key = `${observer.latitude.toFixed(4)}|${observer.longitude.toFixed(4)}|${observer.timeZone}|${jdn}`;
  const hit = byDay.get(key);
  if (hit) return hit;
  const midnight = localMidnightJd(jdn, observer.timeZone);
  // sunriseSunset scans the 24 h from (its argument - longitude / 360): start it at local midnight.
  const { sunriseJd, sunsetJd } = sunriseSunset(
    observer.sky.source,
    midnight + observer.longitude / 360,
    observer.latitude,
    observer.longitude,
  );
  const value = { rise: sunriseJd, set: sunsetJd };
  if (byDay.size > 100_000) byDay.clear();
  byDay.set(key, value);
  return value;
}

// ---------------------------------------------------------------- tithis from the index

/** The tithi (1-30) in force at `jd`. */
export function tithiNumber(sky: Sky, jd: number): number {
  const span = sky.spanAt("tithi", jd);
  if (span !== null) return span + 1;
  const p = sky.positionsAt(jd);
  return p ? tithiAt(p.longitude[0], p.longitude[1]).number : 1;
}

/** When the tithi in force at `jd` began. */
export function tithiStart(sky: Sky, jd: number): number | null {
  const stored = sky.prevBoundary("tithi", jd);
  if (stored) return stored.jd;
  return scanChange(sky, jd, -1);
}

/** When the tithi in force at `jd` ends. */
export function tithiEnd(sky: Sky, jd: number): number | null {
  return sky.nextBoundary("tithi", jd)?.jd ?? scanChange(sky, jd, 1);
}

/** Without stored data: the nearest tithi change from `jd` in direction `dir`, found from positions. */
function scanChange(sky: Sky, jd: number, dir: 1 | -1): number | null {
  const at = tithiNumber(sky, jd);
  const step = 1 / 24;
  let a = jd;
  for (let k = 1; k <= 24 * 3; k += 1) {
    const b = jd + dir * k * step;
    if (tithiNumber(sky, b) !== at) {
      let lo = Math.min(a, b);
      let hi = Math.max(a, b);
      for (let i = 0; i < 40; i += 1) {
        const mid = (lo + hi) / 2;
        const same = tithiNumber(sky, mid) === at;
        if (dir === 1 ? same : !same) lo = mid;
        else hi = mid;
      }
      return dir === 1 ? hi : hi;
    }
    a = b;
  }
  return null;
}

/** The first instant after `jd` at which tithi index `multiple` (0-29) begins. */
function nextTithiEntry(sky: Sky, multiple: number, jd: number): number | null {
  const stored = sky.nextEntry("tithi", multiple, jd);
  if (stored) return stored.jd;
  // Without stored data, walk tithi ends (at most 31 of them).
  let t = jd;
  for (let i = 0; i < 32; i += 1) {
    const end = tithiEnd(sky, t);
    if (end === null) return null;
    if (tithiNumber(sky, end + 1e-6) - 1 === multiple) return end;
    t = end + 1e-6;
  }
  return null;
}

/** `find_next_tithi`: the start of tithi (display, paksha) in force at `after`, or the next one within `withinDays`. */
export function findNextTithi(sky: Sky, display: number, paksha: Paksha, after: number, withinDays: number): number | null {
  const target = paksha === "krishna" ? display + 15 : display;
  if (tithiNumber(sky, after) === target) return tithiStart(sky, after);
  const entry = nextTithiEntry(sky, (target - 1) % 30, after);
  if (entry === null || entry >= after + withinDays * DAY) return null;
  return entry;
}

function findPurnima(sky: Sky, after: number): number | null {
  const start = findNextTithi(sky, 15, "shukla", after, 35);
  return start === null ? null : tithiEnd(sky, start);
}

function findAausi(sky: Sky, after: number): number | null {
  const start = findNextTithi(sky, 15, "krishna", after, 35);
  return start === null ? null : tithiEnd(sky, start);
}

/** The Sun's rashi (0 = Mesha) at `jd`. */
export function sunRashi(sky: Sky, jd: number): number {
  const span = sky.spanAt("sankranti", jd);
  if (span !== null) return span;
  const p = sky.positionsAt(jd);
  return p ? Math.floor((((p.longitude[0] % 360) + 360) % 360) / 30) % 12 : 0;
}

// ---------------------------------------------------------------- lunar months

/** One amanta lunar month, as global instants. */
export interface LunarMonth {
  startAausi: number;
  endPurnima: number;
  endAausi: number;
  name: MasaName;
  isAdhik: boolean;
}

/** A lunar month's civil days at one observer. */
export interface MonthDays {
  /** The first sunrise after its opening Aausi. */
  first: number;
  /** The closing Aausi still prevails at its sunrise. */
  last: number;
  /** The day whose sunrise Purnima prevails at. */
  purnima: number;
}

export interface LunarYear {
  months: LunarMonth[];
  adhikName: MasaName | null;
}

/** First civil day at the observer whose sunrise is at or after `instant` (the udaya rule). */
export function udayaDayOnOrAfter(observer: PatroObserver, instant: number): number {
  const day = localJdn(instant, observer.timeZone);
  const rise = sunOnDay(observer, day).rise;
  return rise !== null && rise < instant ? day + 1 : day;
}

function computeLunarMonth(sky: Sky, start: number): LunarMonth | null {
  const purnima = findPurnima(sky, start + 2 * DAY);
  if (purnima === null) return null;
  const next = findAausi(sky, purnima + 2 * DAY);
  if (next === null) return null;
  const rashi = sunRashi(sky, start);
  return {
    startAausi: start,
    endPurnima: purnima,
    endAausi: next,
    name: MASA_NAMES[rashi],
    isAdhik: rashi === sunRashi(sky, next),
  };
}

const yearCache = new WeakMap<Sky, Map<number, LunarYear>>();

/** The lunar months from the first Aausi after 15 February of a Gregorian year. */
export function lunarYear(sky: Sky, year: number): LunarYear {
  let cache = yearCache.get(sky);
  if (!cache) {
    cache = new Map();
    yearCache.set(sky, cache);
  }
  const hit = cache.get(year);
  if (hit) return hit;
  const months: LunarMonth[] = [];
  let current = findAausi(sky, civilJdn(year, 2, 15) - 0.5);
  if (current !== null) {
    for (let i = 0; i < 14; i += 1) {
      const month = computeLunarMonth(sky, current);
      if (!month) break;
      current = month.endAausi;
      months.push(month);
      if (civilFromJdn(utcJdn(current)).year > year + 1) break;
    }
  }
  const value: LunarYear = { months, adhikName: months.find((m) => m.isAdhik)?.name ?? null };
  if (cache.size > 400) cache.clear();
  cache.set(year, value);
  return value;
}

export interface ObservedYear {
  year: LunarYear;
  days: MonthDays[];
}

const observedCache = new WeakMap<Sky, Map<string, ObservedYear>>();

/** A lunar year with its months' civil days at the observer. */
export function observedYear(observer: PatroObserver, year: number): ObservedYear {
  let cache = observedCache.get(observer.sky);
  if (!cache) {
    cache = new Map();
    observedCache.set(observer.sky, cache);
  }
  const key = `${year}|${observer.latitude.toFixed(4)}|${observer.longitude.toFixed(4)}|${observer.timeZone}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const lunar = lunarYear(observer.sky, year);
  const days = lunar.months.map((m) => ({
    first: udayaDayOnOrAfter(observer, m.startAausi),
    last: udayaDayOnOrAfter(observer, m.endAausi) - 1,
    purnima: udayaDayOnOrAfter(observer, m.endPurnima) - 1,
  }));
  const value = { year: lunar, days };
  if (cache.size > 2000) cache.clear();
  cache.set(key, value);
  return value;
}

/** A purnimanta window: the day after the previous Purnima through this Purnima. */
export interface PurnimantWindow {
  start: number;
  endPurnima: number;
  startDt: number;
  endDt: number;
  name: MasaName;
  isAdhik: boolean;
}

export function purnimantWindows(year: ObservedYear): PurnimantWindow[] {
  let prev: { instant: number; day: number } | null = null;
  return year.year.months.map((m, i) => {
    const d = year.days[i];
    const window: PurnimantWindow = {
      start: prev ? prev.day + 1 : d.first,
      endPurnima: d.purnima,
      startDt: prev ? prev.instant + DAY : m.startAausi,
      endDt: m.endPurnima,
      name: m.name,
      isAdhik: m.isAdhik,
    };
    prev = { instant: m.endPurnima, day: d.purnima };
    return window;
  });
}

/** (display tithi 1-15, paksha) at the observer's sunrise on `jdn`, or null before 1582. */
export function udayaTithi(observer: PatroObserver, jdn: number): { display: number; paksha: Paksha } | null {
  if (jdn < CUTOVER_JDN) return null;
  const rise = sunOnDay(observer, jdn).rise;
  if (rise === null) return null;
  const n = tithiNumber(observer.sky, rise);
  return n <= 15 ? { display: n, paksha: "shukla" } : { display: n - 15, paksha: "krishna" };
}

const sameTithi = (t: { display: number; paksha: Paksha } | null, display: number, paksha: Paksha) =>
  t !== null && t.display === display && t.paksha === paksha;

// ---------------------------------------------------------------- the day a tithi falls on

function boundaryInstant(sky: Sky, month: LunarMonth, display: number, paksha: Paksha): number | null {
  const searchStart = paksha === "shukla" ? month.startAausi : month.endPurnima;
  const found = findNextTithi(sky, display, paksha, searchStart, 35);
  if (found === null) return null;
  const inside =
    paksha === "krishna" && display === 15
      ? searchStart <= found && found <= month.endAausi + DAY
      : searchStart <= found && found < month.endAausi;
  return inside ? found : null;
}

function searchUdaya(observer: PatroObserver, month: LunarMonth, display: number, paksha: Paksha): number | null {
  const b = boundaryInstant(observer.sky, month, display, paksha);
  if (b === null) return null;
  const boundary = localJdn(b, observer.timeZone);
  for (let offset = 0; offset < 5; offset += 1) {
    const check = boundary + offset - 1;
    if (sameTithi(udayaTithi(observer, check), display, paksha)) return check;
  }
  return null;
}

function boundaryDay(observer: PatroObserver, month: LunarMonth, display: number, paksha: Paksha): number | null {
  const b = boundaryInstant(observer.sky, month, display, paksha);
  return b === null ? null : localJdn(b, observer.timeZone);
}

function kaalWindow(observer: PatroObserver, jdn: number, kaal: DateSelection): [number, number] | null {
  const { rise, set } = sunOnDay(observer, jdn);
  if (rise === null || set === null) return null;
  if (kaal === "madhyahna" || kaal === "aparahna") {
    const part = (set - rise) / 5;
    const index = kaal === "madhyahna" ? 2 : 3;
    return [rise + index * part, rise + (index + 1) * part];
  }
  if (kaal === "pradosh") {
    const next = sunOnDay(observer, jdn + 1).rise;
    if (next === null) return null;
    return [set, set + (next - set) / 5];
  }
  return null;
}

/** The day the tithi covers more of the kaal (the earlier day on a tie). */
function vyapiniDate(observer: PatroObserver, start: number, end: number, kaal: DateSelection): number | null {
  const first = localJdn(start, observer.timeZone);
  const last = localJdn(end, observer.timeZone);
  let best: number | null = null;
  let bestOverlap = 0;
  for (let day = first; day <= last; day += 1) {
    const w = kaalWindow(observer, day, kaal);
    if (!w) continue;
    const overlap = Math.max(0, Math.min(end, w[1]) - Math.max(start, w[0]));
    if (overlap > bestOverlap) {
      best = day;
      bestOverlap = overlap;
    }
  }
  return best;
}

/** One month's candidate day, and whether the selection rule itself resolved it. */
function resolveTithiDay(
  observer: PatroObserver,
  month: LunarMonth,
  display: number,
  paksha: Paksha,
  selection: DateSelection,
): { day: number; exact: boolean } | null {
  const sky = observer.sky;
  if (selection === "boundary") {
    const d = boundaryDay(observer, month, display, paksha);
    return d === null ? null : { day: d, exact: false };
  }
  if (selection === "para_yuta") {
    const first = searchUdaya(observer, month, display, paksha);
    if (first === null) {
      const d = boundaryDay(observer, month, display, paksha);
      return d === null ? null : { day: d, exact: false };
    }
    const following = first + 1;
    return sameTithi(udayaTithi(observer, following), display, paksha)
      ? { day: following, exact: true }
      : { day: first, exact: true };
  }
  if (selection === "madhyahna" || selection === "aparahna" || selection === "pradosh") {
    const start = boundaryInstant(sky, month, display, paksha);
    if (start !== null && start >= CUTOVER_JD) {
      const end = tithiEnd(sky, start);
      if (end !== null) {
        const day = vyapiniDate(observer, start, end, selection);
        if (day !== null) return { day, exact: true };
      }
    }
  }
  const exact = searchUdaya(observer, month, display, paksha);
  if (exact !== null) return { day: exact, exact: true };
  const d = boundaryDay(observer, month, display, paksha);
  return d === null ? null : { day: d, exact: false };
}

// ---------------------------------------------------------------- BS civil months (Surya table)

const BS_TABLE = "surya_siddhanta";

/** First civil day (JDN) and length of a BS month, on the civil grid the server uses. */
export function bsMonth(bsYear: number, bsMonthNumber: number): { first: number; length: number } | null {
  const m = bsMonthInTable(BS_TABLE, bsYear, bsMonthNumber);
  return m ? { first: m.startDays + UNIX_DAY_JDN, length: m.length } : null;
}

/** The BS date of a civil day (JDN) on the server's civil grid. */
export function bsDateOf(jdn: number): { year: number; month: number; day: number } | null {
  return bsDateInTable(BS_TABLE, jdn - UNIX_DAY_JDN);
}

/** The civil day (JDN) of a BS date, or null when the day is not in the month. */
export function bsToJdn(bsYear: number, bsMonthNumber: number, bsDay: number): number | null {
  const m = bsMonth(bsYear, bsMonthNumber);
  if (!m || bsDay < 1 || bsDay > m.length) return null;
  return m.first + bsDay - 1;
}

function bsCivilFifteenth(observer: PatroObserver, bsYear: number, bsMonthNumber: number, paksha: Paksha): number | null {
  const m = bsMonth(bsYear, bsMonthNumber);
  if (!m) return null;
  for (let o = 0; o < m.length; o += 1) {
    if (sameTithi(udayaTithi(observer, m.first + o), 15, paksha)) return m.first + o;
  }
  return null;
}

// ---------------------------------------------------------------- kshaya and adhik

/** The rashis (0 = Mesha) the Sun enters inside (start, end), in order. */
export function sankrantisInPeriod(sky: Sky, start: number, end: number): number[] {
  // The festival rules ask for the same lunar months again and again: solved once per sky.
  let byPeriod = sankrantiCache.get(sky);
  if (!byPeriod) {
    byPeriod = new Map();
    sankrantiCache.set(sky, byPeriod);
  }
  const key = `${start}|${end}`;
  let found = byPeriod.get(key);
  if (!found) {
    found = sky.eventsBetween("sankranti", start, end).map((e) => e.multiple);
    if (byPeriod.size > 2000) byPeriod.clear();
    byPeriod.set(key, found);
  }
  return found;
}
const sankrantiCache = new WeakMap<Sky, Map<string, number[]>>();

function kshayaPossible(sky: Sky, year: number): boolean {
  let adhik = 0;
  for (let y = year - 1; y <= year + 1; y += 1) adhik += lunarYear(sky, y).months.filter((m) => m.isAdhik).length;
  return adhik >= 2;
}

/** The kshaya months touching `gregorianYear` that swallow the masa `name`: their civil spans (UTC days). */
function kshayaDrops(sky: Sky, name: string, gregorianYear: number): [number, number][] {
  const out: [number, number][] = [];
  for (const y of [gregorianYear - 1, gregorianYear]) {
    if (!kshayaPossible(sky, y)) continue;
    for (const m of lunarYear(sky, y).months) {
      const inYear =
        civilFromJdn(utcJdn(m.startAausi)).year === gregorianYear || civilFromJdn(utcJdn(m.endAausi)).year === gregorianYear;
      if (!inYear) continue;
      const s = sankrantisInPeriod(sky, m.startAausi, m.endAausi);
      if (s.length >= 2 && MASA_NAMES[s[0]] === name) out.push([utcJdn(m.startAausi), utcJdn(m.endAausi)]);
    }
  }
  return out;
}

const yearOf = (jdn: number) => civilFromJdn(jdn).year;

/** `find_festival_in_lunar_month`: the festival masa model, adhik months skipped. Returns a JDN. */
export function findFestivalInLunarMonth(
  observer: PatroObserver,
  name: string,
  display: number,
  paksha: Paksha,
  gregorianYear: number,
  selection: DateSelection,
): number | null {
  if (name === "Shrawan" && display === 15 && paksha === "shukla") {
    // MoHA: Shrawan's civil Purnima unless it falls before day 20; then Bhadau's.
    const bsYear = gregorianYear + 57;
    const shrawan = bsCivilFifteenth(observer, bsYear, 4, "shukla");
    const bhadau = bsCivilFifteenth(observer, bsYear, 5, "shukla");
    if (shrawan !== null && (bsDateOf(shrawan)?.day ?? 0) >= 20 && yearOf(shrawan) === gregorianYear) return shrawan;
    if (bhadau !== null && yearOf(bhadau) === gregorianYear) return bhadau;
  }
  if (name === "Baishakh" && display === 15 && paksha === "krishna") {
    const day = bsCivilFifteenth(observer, gregorianYear + 57, 1, "krishna");
    if (day !== null && yearOf(day) === gregorianYear) return day;
  }
  const kshaya = kshayaDrops(observer.sky, name, gregorianYear);
  const candidates: { day: number; exact: boolean }[] = [];
  for (const searchYear of [gregorianYear - 1, gregorianYear]) {
    for (const w of purnimantWindows(observedYear(observer, searchYear))) {
      if (w.name !== name || w.isAdhik) continue;
      const month: LunarMonth = {
        startAausi: w.startDt,
        endPurnima: w.startDt - DAY,
        endAausi: w.endDt + DAY,
        name: w.name,
        isAdhik: w.isAdhik,
      };
      const found = resolveTithiDay(observer, month, display, paksha, selection);
      if (found) candidates.push(found);
    }
  }
  let best: { day: number; exact: boolean } | null = null;
  const key = (c: { day: number; exact: boolean }) => {
    const y = yearOf(c.day);
    return [Number(y !== gregorianYear), Math.abs(y - gregorianYear), Number(y < gregorianYear), Number(!c.exact), c.day];
  };
  for (const c of candidates) {
    if (!best) {
      best = c;
      continue;
    }
    const a = key(c);
    const b = key(best);
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] < b[i]) {
        best = c;
        break;
      }
      if (a[i] > b[i]) break;
    }
  }
  if (!best) return null;
  if (kshaya.length && (yearOf(best.day) !== gregorianYear || kshaya.some(([s, e]) => s <= best!.day && best!.day <= e))) {
    return null;
  }
  return best.day;
}

export type KshayaTransfer = "follow" | "skip";

/** The owner's rule for a lost month: the festival follows into the lunation after the kshaya. */
export function findFestivalWithKshayaRule(
  observer: PatroObserver,
  name: string,
  display: number,
  paksha: Paksha,
  gregorianYear: number,
  selection: DateSelection,
  transfer: KshayaTransfer,
): number | null {
  const found = findFestivalInLunarMonth(observer, name, display, paksha, gregorianYear, selection);
  if (found !== null || transfer === "skip") return found;
  const sky = observer.sky;
  if (!kshayaDrops(sky, name, gregorianYear).length) return null;
  for (const y of [gregorianYear - 1, gregorianYear]) {
    if (!kshayaPossible(sky, y)) continue;
    const months = lunarYear(sky, y).months;
    for (let i = 0; i < months.length; i += 1) {
      const m = months[i];
      const s = sankrantisInPeriod(sky, m.startAausi, m.endAausi);
      if (s.length < 2 || MASA_NAMES[s[0]] !== name) continue;
      const next = months[i + 1] ?? lunarYear(sky, y + 1).months[0];
      if (!next) continue;
      const day = resolveTithiDay(observer, next, display, paksha, selection);
      if (day && yearOf(day.day) === gregorianYear) return day.day;
    }
  }
  return null;
}

/** The day of (display, paksha) inside the year's adhik lunation (Padmini, Parama). */
export function adhikMonthTithiDay(
  observer: PatroObserver,
  gregorianYear: number,
  display: number,
  paksha: Paksha,
  selection: DateSelection,
): number | null {
  const year = observedYear(observer, gregorianYear);
  const adhik = year.year.months.find((m) => m.isAdhik);
  if (!adhik) return null;
  return resolveTithiDay(observer, adhik, display, paksha, selection)?.day ?? null;
}

/** First civil day of the year's adhik masa when it is `name` (any when null). */
export function adhikMonthFirstDay(observer: PatroObserver, gregorianYear: number, name: string | null): number | null {
  const year = observedYear(observer, gregorianYear);
  const i = year.year.months.findIndex((m) => m.isAdhik);
  if (i < 0) return null;
  if (name && name !== year.year.months[i].name) return null;
  return year.days[i].first;
}
