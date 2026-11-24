// The festival rule engine on the client: the rule book, the MoHA overrides and the owner's
// month-type rules, evaluated against the sky the app carries. A port of
// apps/rust/crates/festivals/src/{compute,lists,rules}.rs. The festival dates depend on the place
// (local sunrise decides the udaya day), so they are derived here, never stored.
//
// The BS civil grid (solar and bs_fixed rules, the BS year) is the Surya Siddhanta's for every
// system, as the server keeps it; lunar rules are read in the observer's system.
import {
  adhikMonthFirstDay,
  adhikMonthTithiDay,
  bsMonth,
  bsToJdn,
  civilFromJdn,
  civilJdn,
  dateSelectionFromRule,
  findFestivalWithKshayaRule,
  isoFromJdn,
  jdnFromIso,
  localJdn,
  sunOnDay,
  type KshayaTransfer,
  type Paksha,
  type PatroObserver,
} from "../astronomy/lunar-month";
import type { Sky } from "../astronomy/sky";
import ruleBook from "./rules/festival_rules_v3.json";
import publicHolidays from "./rules/public_holidays_v1.json";
import overridesBook from "./rules/holiday_overrides_v1.json";
import monthTypes from "./rules/month_type_rules_v1.json";

type Rule = Record<string, unknown>;

/** Every festival rule by id, in the file's order. */
const RULES: Record<string, Rule> = (ruleBook as { festivals: Record<string, Rule> }).festivals;
const PUBLIC = new Set<string>((publicHolidays as { holiday_ids: string[] }).holiday_ids);
const OVERRIDES = (overridesBook as { bs_years: Record<string, Record<string, Rule>> }).bs_years;
const ADHIK_ONLY = new Set<string>((monthTypes as { adhik_only_festivals: { ids: string[] } }).adhik_only_festivals.ids);
const TRANSFER = (monthTypes as {
  kshaya_festival_transfer: { default: string; overrides: Record<string, { policy?: string }> };
}).kshaya_festival_transfer;

/** One festival in a list, in the server's field order. */
export interface FestivalEntry {
  id: string;
  name_en: unknown;
  name_ne: unknown;
  start_date: string;
  end_date: string;
  duration_days: number;
  type: unknown;
  category: unknown;
  importance: unknown;
  is_public_holiday: boolean;
  notes: unknown;
  audience?: unknown;
}

/** Where and in which systems a festival calendar is computed. */
export interface FestivalContext {
  /** The observer's system and place (lunar rules). */
  observer: PatroObserver;
  /** The Surya Siddhanta sky (solar rules' sankranti fallback); the same object when the observer is Surya. */
  surya: Sky;
}

export function rule(id: string): Rule {
  return RULES[id] ?? {};
}

export function isPublicHoliday(id: string): boolean {
  return PUBLIC.has(id);
}

function int(r: Rule, key: string): number | null {
  const v = r[key];
  if (typeof v === "number") return Math.trunc(v);
  if (typeof v === "string" && /^-?\d+$/.test(v.trim())) return Number(v);
  return null;
}

function text(r: Rule, key: string): string | null {
  const v = r[key];
  return typeof v === "string" ? v : null;
}

function truthy(v: unknown): boolean {
  if (v === null || v === undefined || v === false || v === 0 || v === "") return false;
  return true;
}

function kshayaTransfer(id: string | null): KshayaTransfer {
  const policy = (id && TRANSFER.overrides[id]?.policy) || TRANSFER.default;
  return policy === "skip" ? "skip" : "follow";
}

// ---------------------------------------------------------------- one rule, one year

function lunar(ctx: FestivalContext, r: Rule, id: string | null, gregorianYear: number): number | null {
  const paksha: Paksha = text(r, "paksha") === "krishna" ? "krishna" : "shukla";
  const tithi = int(r, "tithi");
  if (tithi === null) return null;
  const selection = dateSelectionFromRule(r.date_selection);
  if (id && ADHIK_ONLY.has(id)) {
    return adhikMonthTithiDay(ctx.observer, gregorianYear, tithi, paksha, selection);
  }
  const name = text(r, "lunar_month");
  if (!name) return null;
  return findFestivalWithKshayaRule(ctx.observer, name, tithi, paksha, gregorianYear, selection, kshayaTransfer(id));
}

/** A BS (month, day) in whichever of BS `year + 56` / `year + 57` lands in the Gregorian year. */
function bsDayInYear(bsMonthNumber: number, bsDay: number, gregorianYear: number): number | null {
  for (const year of [gregorianYear + 56, gregorianYear + 57]) {
    const jdn = bsToJdn(year, bsMonthNumber, bsDay);
    if (jdn !== null && civilFromJdn(jdn).year === gregorianYear) return jdn;
  }
  return null;
}

function solar(ctx: FestivalContext, r: Rule, gregorianYear: number): number | null {
  const bsMonthNumber = int(r, "bs_month");
  if (!bsMonthNumber) return null;
  const solarDay = int(r, "solar_day") ?? 1;
  const day = bsDayInYear(bsMonthNumber, solarDay, gregorianYear);
  if (day !== null) return day;
  // Outside the month grid: the astronomical sankranti's Kathmandu day.
  const jan1 = civilJdn(gregorianYear, 1, 1) - 0.5;
  const sankranti = ctx.surya.nextEntry("sankranti", bsMonthNumber - 1, jan1);
  if (!sankranti || sankranti.jd > jan1 + 40) return null;
  return localJdn(sankranti.jd, "Asia/Kathmandu") + solarDay - 1;
}

function bsFixed(r: Rule, gregorianYear: number): number | null {
  const bsMonthNumber = int(r, "bs_month");
  if (!bsMonthNumber) return null;
  return bsDayInYear(bsMonthNumber, int(r, "bs_day") ?? 1, gregorianYear);
}

function adFixed(r: Rule, gregorianYear: number): number | null {
  const m = int(r, "ad_month");
  const d = int(r, "ad_day");
  if (m === null || d === null || m < 1 || m > 12 || d < 1) return null;
  const jdn = civilJdn(gregorianYear, m, d);
  const back = civilFromJdn(jdn);
  return back.month === m && back.day === d ? jdn : null;
}

// The tropical Sun: the sidereal Sun plus the system's own ayanamsha. Drik's is the Lahiri one; the
// Surya Siddhanta's is the text's own ayana-chalana (a libration of 27 degrees either way, about
// 22.9 degrees in 2026), not a modern precession.
function tropicalSun(sky: Sky, jd: number): number | null {
  const p = sky.positionsAt(jd, 1);
  return p ? p.longitude[0] + p.ayanamsha : null;
}

const signedDiff = (deg: number) => ((((deg % 360) + 360) % 360) + 540) % 360 - 180;

/** The first local day whose sunrise follows the solstice. */
function ayana(ctx: FestivalContext, r: Rule, gregorianYear: number): number | null {
  const which = text(r, "ayana");
  let target: number;
  let guess: number;
  if (which === "uttara") {
    target = 270;
    guess = civilJdn(gregorianYear, 12, 21);
  } else if (which === "dakshina") {
    target = 90;
    guess = civilJdn(gregorianYear, 6, 21);
  } else return null;
  const sky = ctx.observer.sky;
  let jd = guess; // 12:00 UT of the guessed day
  const rate = 360 / 365.2422;
  for (let i = 0; i < 16; i += 1) {
    const sun = tropicalSun(sky, jd);
    if (sun === null) return null;
    jd -= signedDiff(sun - target) / rate;
  }
  const day = localJdn(jd, ctx.observer.timeZone);
  const rise = sunOnDay(ctx.observer, day).rise;
  if (rise === null) return null;
  return rise >= jd ? day : day + 1;
}

/** The earliest day a festival can fall on, if the rule names one. */
function firstObserved(r: Rule): number | null {
  const bs = int(r, "from_bs_year");
  const ad = int(r, "from_ad_year");
  const days: number[] = [];
  if (bs) {
    const jdn = bsToJdn(bs, 1, 1);
    if (jdn !== null) days.push(jdn);
  }
  if (ad) days.push(civilJdn(ad, 1, 1));
  return days.length ? Math.max(...days) : null;
}

/** (start, end) Julian Day Numbers of a festival in a Gregorian year. `id` is null for derived rules. */
export function computeFestivalDates(
  ctx: FestivalContext,
  r: Rule,
  id: string | null,
  gregorianYear: number,
): [number, number] | null {
  const duration = Math.max(int(r, "duration_days") ?? 1, 1);
  const kind = text(r, "type") ?? "lunar";
  let start: number | null;
  switch (kind) {
    case "lunar":
      start = lunar(ctx, r, id, gregorianYear);
      break;
    case "solar":
      start = solar(ctx, r, gregorianYear);
      break;
    case "bs_fixed":
      start = bsFixed(r, gregorianYear);
      break;
    case "ad_fixed":
      start = adFixed(r, gregorianYear);
      break;
    case "adhik_arambha":
      start = adhikMonthFirstDay(ctx.observer, gregorianYear, text(r, "lunar_month"));
      break;
    case "ayana":
      start = ayana(ctx, r, gregorianYear);
      break;
    default:
      start = null;
  }
  if (start === null) return null;
  const first = firstObserved(r);
  if (first !== null && start < first) return null;
  let end: number | null = null;
  const endTithi = int(r, "end_tithi");
  if (endTithi && kind === "lunar") {
    const endRule: Rule = {};
    for (const [k, v] of Object.entries(r)) {
      if (!["end_tithi", "end_at", "end_extra_days", "end_date_selection"].includes(k)) endRule[k] = v;
    }
    endRule.tithi = r.end_tithi;
    endRule.date_selection = r.end_date_selection ?? "udaya";
    end = lunar(ctx, endRule, null, gregorianYear);
  } else {
    const target = text(r, "end_at");
    if (target) {
      const other = RULES[target];
      const dates = other ? computeFestivalDates(ctx, other, target, gregorianYear) : null;
      end = dates ? dates[0] : null;
    }
  }
  if (end === null || end < start) end = start + duration - 1;
  const extra = int(r, "end_extra_days") ?? 0;
  return [start, end + extra];
}

// ---------------------------------------------------------------- lists

function entry(id: string, r: Rule, start: number, end: number): FestivalEntry {
  const e: FestivalEntry = {
    id,
    name_en: r.name_en ?? id,
    name_ne: r.name_ne ?? null,
    start_date: isoFromJdn(start),
    end_date: isoFromJdn(end),
    duration_days: end - start + 1,
    type: r.type ?? "lunar",
    category: r.category ?? null,
    importance: r.importance ?? null,
    is_public_holiday: isPublicHoliday(id),
    notes: r.notes ?? null,
  };
  const audience = r.audience;
  if (typeof audience === "string" && audience !== "") e.audience = audience;
  return e;
}

const isGenericPurnimaVrata = (id: string) => id.startsWith("purnima-vrata-");

function isNamedPurnima(id: string): boolean {
  if (isGenericPurnimaVrata(id) || id.endsWith("-vrata")) return false;
  const r = rule(id);
  if (r.type === "lunar" && r.tithi === 15 && r.paksha === "shukla") return true;
  const nameEn = String(r.name_en ?? "").toLowerCase();
  const nameNe = String(r.name_ne ?? "");
  return nameEn.includes("purnima") || nameNe.includes("पूर्णिमा") || nameNe.includes("पुन्ही");
}

/** Drop alias and generic vrata rows covered by a named festival on the same day. */
export function filterDay(active: FestivalEntry[]): FestivalEntry[] {
  const kept = active.filter((f) => isPublicHoliday(f.id) || !truthy(rule(f.id).alias_of));
  if (kept.length <= 1) return kept;
  const present = kept.map((f) => f.id);
  const hasNamedPurnima = present.some(isNamedPurnima);
  const filtered = kept.filter((f) => {
    if (isPublicHoliday(f.id)) return true;
    const by = rule(f.id).subsumed_by;
    if (typeof by === "string" && by !== "" && present.includes(by)) return false;
    if (f.id.endsWith("-vrata") && present.includes(f.id.slice(0, -"-vrata".length))) return false;
    return !(hasNamedPurnima && isGenericPurnimaVrata(f.id));
  });
  // Stable: rows without `block` first, as Rust's sort_by_key(false < true).
  return [...filtered.filter((f) => !truthy(rule(f.id).block)), ...filtered.filter((f) => truthy(rule(f.id).block))];
}

/** Festivals active on a civil day (ISO), after the day filter. */
export function festivalsForDay(all: FestivalEntry[], dayIso: string): FestivalEntry[] {
  const day = jdnFromIso(dayIso);
  if (day === null) return [];
  return filterDay(
    all.filter((f) => {
      const s = jdnFromIso(f.start_date);
      const e = jdnFromIso(f.end_date);
      return s !== null && e !== null && s <= day && day <= e;
    }),
  );
}

function filterYear(festivals: FestivalEntry[]): FestivalEntry[] {
  const byDay = new Map<number, FestivalEntry[]>();
  for (const f of festivals) {
    const s = jdnFromIso(f.start_date);
    const e = jdnFromIso(f.end_date);
    if (s === null || e === null) continue;
    for (let d = s; d <= e; d += 1) {
      const list = byDay.get(d);
      if (list) list.push(f);
      else byDay.set(d, [f]);
    }
  }
  const kept = new Set<string>();
  for (const list of byDay.values()) for (const f of filterDay(list)) kept.add(f.id);
  return festivals.filter((f) => kept.has(f.id));
}

/** Stable sort by start date, as Rust's sort_by_key over insertion order. */
function sortedByStart(map: Map<string, FestivalEntry>): FestivalEntry[] {
  return [...map.values()].map((f, i) => ({ f, i })).sort((a, b) => (a.f.start_date < b.f.start_date ? -1 : a.f.start_date > b.f.start_date ? 1 : a.i - b.i)).map((x) => x.f);
}

function overrideApplies(o: Rule): boolean {
  return o.type === "ad_fixed" || o.type === "announced";
}

function overrideEntry(id: string, o: Rule): FestivalEntry | null {
  const merged: Rule = { ...rule(id), ...o };
  const s = typeof o.start_date === "string" ? jdnFromIso(o.start_date) : null;
  const e = typeof o.end_date === "string" ? jdnFromIso(o.end_date) : null;
  return s === null || e === null ? null : entry(id, merged, s, e);
}

/** All festivals of a Gregorian year at a (festival) location. */
export function generateFestivals(ctx: FestivalContext, gregorianYear: number): FestivalEntry[] {
  const merged = new Map<string, FestivalEntry>();
  for (const [id, r] of Object.entries(RULES)) {
    const dates = computeFestivalDates(ctx, r, id, gregorianYear);
    if (!dates) continue;
    const [start, end] = dates;
    if (civilFromJdn(start).year !== gregorianYear && civilFromJdn(end).year !== gregorianYear) continue;
    merged.set(id, entry(id, r, start, end));
  }
  for (const bsYear of [gregorianYear + 56, gregorianYear + 57]) {
    for (const [id, o] of Object.entries(OVERRIDES[String(bsYear)] ?? {})) {
      if (truthy(o.omit) || !overrideApplies(o)) continue;
      const s = typeof o.start_date === "string" ? jdnFromIso(o.start_date) : null;
      const e = typeof o.end_date === "string" ? jdnFromIso(o.end_date) : null;
      if (s === null || e === null) continue;
      if (civilFromJdn(s).year === gregorianYear || civilFromJdn(e).year === gregorianYear) {
        const f = overrideEntry(id, o);
        if (f) merged.set(id, f);
      }
    }
  }
  const list = filterYear(sortedByStart(merged));
  return list.map((f, i) => ({ f, i })).sort((a, b) => (a.f.start_date < b.f.start_date ? -1 : a.f.start_date > b.f.start_date ? 1 : a.i - b.i)).map((x) => x.f);
}

const KATHMANDU = { latitude: 27.7172, longitude: 85.324, timeZone: "Asia/Kathmandu" };

/** The place a festival calendar is computed for: the observer's own, snapped to 0.1 degree. */
export function festivalObserver(observer: PatroObserver): PatroObserver {
  if (
    observer.timeZone === KATHMANDU.timeZone &&
    observer.latitude === KATHMANDU.latitude &&
    observer.longitude === KATHMANDU.longitude
  ) {
    return observer;
  }
  const round1 = (x: number) => Number(x.toFixed(1));
  return { ...observer, latitude: round1(observer.latitude), longitude: round1(observer.longitude) };
}

/** All festivals of a BS year at a location: the two Gregorian years that touch it, then the MoHA overrides. */
export function generateBsFestivals(ctx: FestivalContext, bsYear: number): FestivalEntry[] {
  if (bsYear < 60) return [];
  const observer = festivalObserver(ctx.observer);
  const local: FestivalContext = { ...ctx, observer };
  const first = bsMonth(bsYear, 1);
  const next = bsMonth(bsYear + 1, 1);
  if (!first || !next) return [];
  const yearStart = first.first;
  const yearEnd = next.first - 1;
  const years = [...new Set([civilFromJdn(yearStart).year, civilFromJdn(yearEnd).year])];
  const merged = new Map<string, FestivalEntry>();
  for (const gy of years) {
    for (const f of generateFestivals(local, gy)) {
      const s = jdnFromIso(f.start_date);
      const e = jdnFromIso(f.end_date);
      if (s === null || e === null || !(s <= yearEnd && e >= yearStart)) continue;
      const old = merged.get(f.id);
      const oldStart = old ? jdnFromIso(old.start_date) : null;
      if (oldStart === null || s < oldStart) merged.set(f.id, f);
    }
  }
  const sorted = new Map<string, FestivalEntry>(sortedByStart(merged).map((f) => [f.id, f]));
  for (const [id, o] of Object.entries(OVERRIDES[String(bsYear)] ?? {})) {
    if (truthy(o.omit) || !overrideApplies(o)) continue;
    const f = overrideEntry(id, o);
    if (f) sorted.set(id, f);
  }
  return filterYear(sortedByStart(sorted));
}
