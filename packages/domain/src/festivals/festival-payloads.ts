// The festival routes' JSON, made on the client: `/nepal/festivals`, `/nepal/holidays` and
// `/nepal/festivals/upcoming`, in the server's shape (apps/rust/crates/patro/src/festivals.rs), so
// a screen cannot tell which one answered. Only what the bundled sky covers is answered here;
// anything else returns null and the caller asks the server.
//
// Lunar festivals follow the chosen system's tithis (Drik on the Drik sky, owner 2026-11-24); the BS
// civil grid and the solar rules stay on the Surya Siddhanta table in both, as on the server.
import { bsDateOf, bsMonth, civilFromJdn, civilJdn, isoFromJdn, jdnFromIso, localJdn, type PatroObserver } from "../astronomy/lunar-month";
import type { Sky } from "../astronomy/sky";
import {
  festivalObserver,
  generateBsFestivals,
  isPublicHoliday,
  rule,
  type FestivalEntry,
} from "./festival-engine";
import overridesBook from "./rules/holiday_overrides_v1.json";

type Row = FestivalEntry & Record<string, unknown>;
type Rule = Record<string, unknown>;
const OVERRIDES = (overridesBook as { bs_years: Record<string, Record<string, Rule>> }).bs_years;

const RULE_VERSION = "v3";
const ENGINE_VERSION = "1.0.13+a6";
const RULES_HASH = "97a63657ed87";
const FESTIVAL_STACK_MIN_YEAR = 60;

/** A place as the routes read it. Without one, the national (Kathmandu) listing. */
export interface FestivalPlace {
  latitude: number;
  longitude: number;
  timeZone: string;
  /** Printed in `location.name` for the national listing only. */
  name?: string;
}

export const KATHMANDU_PLACE: FestivalPlace = { latitude: 27.7172, longitude: 85.324, timeZone: "Asia/Kathmandu", name: "Kathmandu" };

/** The BS years a phone answers by itself: the bundled years, less one at each end for the lunar years around them. */
export const LOCAL_BS_YEARS: [number, number] = [1951, 2149];

/** The system's sky (lunar rules) and the Surya Siddhanta sky (solar rules' sankranti fallback); the same object for Surya. */
export interface FestivalSkies {
  sky: Sky;
  surya: Sky;
}

function observerFor(sky: Sky, place: FestivalPlace): PatroObserver {
  return festivalObserver({ sky, latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone });
}

function isKathmandu(o: PatroObserver): boolean {
  return o.timeZone === KATHMANDU_PLACE.timeZone && o.latitude === KATHMANDU_PLACE.latitude && o.longitude === KATHMANDU_PLACE.longitude;
}

function locationJson(o: PatroObserver): Record<string, unknown> {
  return { lat: o.latitude, lon: o.longitude, timezone: o.timeZone, name: isKathmandu(o) ? "Kathmandu" : "observer" };
}

const locationKey = (o: PatroObserver) => `${o.latitude.toFixed(4)}_${o.longitude.toFixed(4)}_${o.timeZone}`;
const siddhantaOf = (o: PatroObserver) => (o.sky.system === "drik" ? "drik" : "surya_siddhanta");

// A BS year's festivals take a few hundred milliseconds; screens ask for the same few years often.
const yearCache = new Map<string, Row[]>();
function bsYearRows(skies: FestivalSkies, o: PatroObserver, bsYear: number): Row[] {
  const key = `${bsYear}|${locationKey(o)}|${o.sky.system}`;
  const hit = yearCache.get(key);
  if (hit) {
    yearCache.delete(key);
    yearCache.set(key, hit);
    return hit;
  }
  const rows = generateBsFestivals({ observer: o, surya: skies.surya }, bsYear) as Row[];
  yearCache.set(key, rows);
  while (yearCache.size > 12) yearCache.delete(yearCache.keys().next().value as string);
  return rows;
}

function bsYearRange(bsYear: number): [number, number] | null {
  const first = bsMonth(bsYear, 1);
  const next = bsMonth(bsYear + 1, 1);
  return first && next ? [first.first, next.first - 1] : null;
}

function bsDateString(jdn: number | null): string {
  if (jdn === null) return "";
  const bs = bsDateOf(jdn);
  return bs ? `${bs.year}-${String(bs.month).padStart(2, "0")}-${String(bs.day).padStart(2, "0")}` : "";
}

const span = (row: Row): [number, number] | null => {
  const s = jdnFromIso(row.start_date);
  const e = jdnFromIso(row.end_date);
  return s === null || e === null ? null : [s, e];
};

function withBsDates(rows: Row[]): Row[] {
  return rows.map((row) => ({
    ...row,
    bs_start_date: bsDateString(jdnFromIso(row.start_date)),
    bs_end_date: bsDateString(jdnFromIso(row.end_date)),
  }));
}

function inBsMonth(rows: Row[], bsYear: number, month: number): Row[] {
  const m = bsMonth(bsYear, month);
  if (!m) return [];
  const last = m.first + m.length - 1;
  return rows.filter((r) => {
    const s = span(r);
    return s !== null && s[0] <= last && s[1] >= m.first;
  });
}

function touchesAdYear(row: Row, year: number): boolean {
  const s = span(row);
  if (!s) return false;
  const a = civilFromJdn(s[0]).year;
  const b = civilFromJdn(s[1]).year;
  return (a <= year && year <= b) || a === year || b === year;
}

function touchesAdMonth(rows: Row[], year: number, month: number): Row[] {
  const first = civilJdn(year, month, 1);
  const last = (month === 12 ? civilJdn(year + 1, 1, 1) : civilJdn(year, month + 1, 1)) - 1;
  return rows.filter((r) => {
    const s = span(r);
    return s !== null && s[0] <= last && s[1] >= first;
  });
}

const sortedByStart = (rows: Row[]) =>
  rows.map((r, i) => ({ r, i })).sort((a, b) => (a.r.start_date < b.r.start_date ? -1 : a.r.start_date > b.r.start_date ? 1 : a.i - b.i)).map((x) => x.r);

function mergeBsYearRows(years: number[], load: (y: number) => Row[], keep: (r: Row) => boolean): Row[] {
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const y of years) {
    for (const r of load(y)) {
      if (!keep(r)) continue;
      const key = `${r.id}|${r.start_date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
  }
  return sortedByStart(out);
}

function stamp(payload: Record<string, unknown>, o: PatroObserver): Record<string, unknown> {
  return {
    ...payload,
    rule_version: RULE_VERSION,
    engine_version: ENGINE_VERSION,
    rules_hash: RULES_HASH,
    location_key: locationKey(o),
    siddhanta: siddhantaOf(o),
    generated_at: new Date().toISOString(),
    hash: "local",
  };
}

function normalizeTradition(value: string | undefined): string | null {
  if (value === undefined || value.trim() === "") return "all";
  const key = value.trim().toLowerCase();
  return key === "all" || key === "smarta" || key === "vaishnava" ? key : null;
}

function applyTradition(rows: Row[], tradition: string): Row[] {
  if (tradition === "all") return rows;
  return rows.filter((r) => {
    const t = rule(r.id).tradition;
    return typeof t !== "string" || t === tradition;
  });
}

const isListedHoliday = (r: { id: string; audience?: unknown }) =>
  isPublicHoliday(r.id) || (typeof r.audience === "string" && r.audience !== "");

function holidayOverrideEntry(id: string, o: Rule): Row | null {
  const merged: Rule = { ...rule(id), ...o };
  const s = typeof o.start_date === "string" ? jdnFromIso(o.start_date) : null;
  const e = typeof o.end_date === "string" ? jdnFromIso(o.end_date) : null;
  if (s === null || e === null) return null;
  const row: Row = {
    id,
    name_en: merged.name_en ?? id,
    name_ne: merged.name_ne ?? null,
    start_date: isoFromJdn(s),
    end_date: isoFromJdn(e),
    duration_days: e - s + 1,
    type: merged.type ?? "lunar",
    category: merged.category ?? null,
    importance: merged.importance ?? null,
    is_public_holiday: isPublicHoliday(id),
    notes: merged.notes ?? null,
  };
  if (typeof merged.audience === "string" && merged.audience !== "") row.audience = merged.audience;
  return row;
}

function bsHolidayRows(skies: FestivalSkies, o: PatroObserver, bsYear: number): Row[] {
  const merged: [string, Row][] = bsYearRows(skies, o, bsYear).filter(isListedHoliday).map((r) => [r.id, r]);
  for (const [id, ov] of Object.entries(OVERRIDES[String(bsYear)] ?? {})) {
    const omit = ov.omit;
    if (omit !== undefined && omit !== null && omit !== false && omit !== 0 && omit !== "") {
      const i = merged.findIndex(([k]) => k === id);
      if (i >= 0) merged.splice(i, 1);
      continue;
    }
    if (!isListedHoliday({ id, audience: ov.audience })) continue;
    if (ov.type !== "ad_fixed" && ov.type !== "announced") continue;
    const entry = holidayOverrideEntry(id, ov);
    if (!entry) continue;
    const i = merged.findIndex(([k]) => k === id);
    if (i >= 0) merged[i][1] = entry;
    else merged.push([id, entry]);
  }
  return sortedByStart(merged.map(([, r]) => r).filter(isListedHoliday));
}

export interface ListingQuery {
  year: number;
  era: string;
  month?: number;
  tradition?: string;
  /** `language=`; the era's own (`ne` for BS, `en` for AD) when absent or not en/ne. */
  language?: string;
}

/** The era layer's last touch: `era` and `language` at the top when the payload has none. */
function rendered(out: Record<string, unknown>, q: ListingQuery): Record<string, unknown> {
  const l = q.language?.trim().toLowerCase();
  if (!("era" in out)) out.era = q.era;
  if (!("language" in out)) out.language = l === "en" || l === "ne" ? l : q.era === "ad" ? "en" : "ne";
  return out;
}

function localYear(era: string, year: number): boolean {
  if (era === "bs") return year >= LOCAL_BS_YEARS[0] && year <= LOCAL_BS_YEARS[1];
  if (era === "ad") return year >= LOCAL_BS_YEARS[0] - 56 && year <= LOCAL_BS_YEARS[1] - 57;
  return false;
}

/** `/nepal/festivals` (era bs or ad), or null when the server should answer. */
export function festivalListingPayload(skies: FestivalSkies, place: FestivalPlace, q: ListingQuery): Record<string, unknown> | null {
  if (!localYear(q.era, q.year)) return null;
  if (q.month !== undefined && !(q.month >= 1 && q.month <= 12)) return null;
  const tradition = normalizeTradition(q.tradition);
  if (tradition === null) return null;
  const o = observerFor(skies.sky, place);
  if (q.era === "ad") {
    let rows = mergeBsYearRows([q.year + 56, q.year + 57], (y) => bsYearRows(skies, o, y), (r) => touchesAdYear(r, q.year));
    if (q.month !== undefined) rows = touchesAdMonth(rows, q.year, q.month);
    const festivals = applyTradition(withBsDates(rows), tradition);
    const out: Record<string, unknown> = { ad_year: q.year, era: "ad", count: festivals.length, festivals };
    if (q.tradition !== undefined) out.tradition = tradition;
    return rendered(out, q);
  }
  if (q.year < FESTIVAL_STACK_MIN_YEAR) return null;
  const range = bsYearRange(q.year);
  if (!range) return null;
  const rows = bsYearRows(skies, o, q.year);
  const picked = q.month !== undefined ? inBsMonth(rows, q.year, q.month) : rows;
  const festivals = applyTradition(withBsDates(picked), tradition);
  const out: Record<string, unknown> = stamp(
    {
      bs_year: q.year,
      gregorian_range: { start: isoFromJdn(range[0]), end: isoFromJdn(range[1]) },
      location: locationJson(o),
      count: rows.length,
      festivals: rows,
    },
    o,
  );
  if (q.month !== undefined) out.bs_month = q.month;
  out.era = q.era;
  out.count = festivals.length;
  out.festivals = festivals;
  if (q.tradition !== undefined) out.tradition = tradition;
  return rendered(out, q);
}

/** `/nepal/holidays` (era bs or ad), or null when the server should answer. */
export function holidayListingPayload(skies: FestivalSkies, place: FestivalPlace, q: ListingQuery): Record<string, unknown> | null {
  if (!localYear(q.era, q.year)) return null;
  if (q.month !== undefined && !(q.month >= 1 && q.month <= 12)) return null;
  const o = observerFor(skies.sky, place);
  if (q.era === "ad") {
    let rows = mergeBsYearRows([q.year + 56, q.year + 57], (y) => bsHolidayRows(skies, o, y), (r) => touchesAdYear(r, q.year));
    if (q.month !== undefined) rows = touchesAdMonth(rows, q.year, q.month);
    const holidays = withBsDates(rows);
    return rendered({ ad_year: q.year, era: "ad", count: holidays.length, holidays }, q);
  }
  const range = bsYearRange(q.year);
  if (!range || q.year < FESTIVAL_STACK_MIN_YEAR) return null;
  let rows = bsHolidayRows(skies, o, q.year);
  if (q.month !== undefined) rows = inBsMonth(rows, q.year, q.month);
  const holidays = withBsDates(rows);
  return rendered(
    {
      bs_year: q.year,
      era: q.era,
      gregorian_range: { start: isoFromJdn(range[0]), end: isoFromJdn(range[1]) },
      count: holidays.length,
      holidays,
    },
    q,
  );
}

/** `/nepal/festivals/upcoming` from today at the place, or null when the server should answer. */
export function upcomingFestivalsPayload(
  skies: FestivalSkies,
  place: FestivalPlace,
  q: { days: number; limit: number; holidaysOnly: boolean; nowMs?: number },
): Record<string, unknown> | null {
  const nowJd = (q.nowMs ?? Date.now()) / 86_400_000 + 2440587.5;
  const start = localJdn(nowJd, place.timeZone);
  const y = civilFromJdn(start).year;
  if (!localYear("ad", y) || !localYear("ad", y + 1)) return null;
  const o = observerFor(skies.sky, place);
  const windowEnd = start + q.days;
  const rows = mergeBsYearRows(
    [y + 56, y + 57, y + 58],
    (bs) => bsYearRows(skies, o, bs),
    (r) => {
      const s = span(r);
      if (!s || s[1] < start || s[0] > windowEnd) return false;
      return !q.holidaysOnly || r.is_public_holiday === true;
    },
  )
    .map((r) => ({ ...r, days_until: (jdnFromIso(r.start_date) ?? start) - start }))
    .slice(0, Math.max(0, q.limit));
  const festivals = withBsDates(rows);
  return { from: isoFromJdn(start), days: q.days, count: festivals.length, festivals };
}
