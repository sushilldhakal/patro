// Gochar (planetary transit) and the graha detail pages, made on the device (`jyotish::gochar`,
// `jyotish::graha_detail`): the transit table at sunrise, the moments a graha enters a new rashi,
// nakshatra or pada, turns vakri or margi, or rises and sets heliacally, and the yearly summaries.
//
// Every search is the server's, step for step: a coarse scan (3 h, 2 h for udaya/asta), then bisection
// until the bracket is under one second. Instants are Julian Days (UT). The sky is the reader's (Surya
// Siddhanta or Drik); every position comes from it.
import type { Sky } from "../../astronomy/sky";
import { civilFromJdn, civilJdn, bsDateOf, bsMonth, utcOffsetMinutes } from "../../astronomy/lunar-month";
import { lagnaAt } from "../../astronomy/siddhanta-offline";
import { moonRiseSet } from "../../astronomy/moon-rise";
import { dayTimes, nepaliDigits, type Json, type Place } from "./blocks";
import { dms, spashtaGrahas } from "./lagna-blocks";
import { instantLagna, planetsWithExtras } from "./at-time";
import { locationBlock } from "./day";
import { addSeconds, utcIso, wallIn } from "./instant";
import { pyInt, pyMod, pyRound, pyRoundInt } from "./py";
import { NAKSHATRA_NAMES, NAKSHATRA_NAMES_NE, RASHI_NAMES, RASHI_NAMES_NE } from "./tables.generated";

export type GrahaKey = "sun" | "moon" | "mars" | "mercury" | "jupiter" | "venus" | "saturn" | "rahu" | "ketu";
/** `GOCHAR_GRAHAS`. */
export const GRAHA_ALL: GrahaKey[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];
const FIVE_PLANETS: GrahaKey[] = ["mars", "mercury", "jupiter", "venus", "saturn"];
const SLOW_GRAHAS: GrahaKey[] = ["jupiter", "saturn", "rahu", "ketu"];
const YEARLY_GRAHAS: GrahaKey[] = ["mercury", "venus", "mars", "jupiter", "saturn"];
const ASTA_GRAHAS: GrahaKey[] = ["mercury", "venus", "moon", "mars", "jupiter", "saturn"];
const MOON_ASTA_ORB = 13;

const NAKSHATRA_SPAN = 360 / 27;
const PADA_SPAN = NAKSHATRA_SPAN / 4;
const stableRound = (v: number) => pyRound(pyRound(v, 9), 6);

/** `GRAHA_META`: vedic name, Nepali name, symbol. */
export const GRAHA_META: Record<GrahaKey, [string, string, string]> = {
  sun: ["Surya", "सूर्य", "☉"],
  moon: ["Chandra", "चन्द्र", "☽"],
  mars: ["Mangala", "मङ्गल", "♂"],
  mercury: ["Budha", "बुध", "☿"],
  jupiter: ["Brihaspati", "बृहस्पति", "♃"],
  venus: ["Shukra", "शुक्र", "♀"],
  saturn: ["Shani", "शनि", "♄"],
  rahu: ["Rahu", "राहु", "☊"],
  ketu: ["Ketu", "केतु", "☋"],
};
const BODY_INDEX: Record<Exclude<GrahaKey, "ketu">, number> = { sun: 0, moon: 1, mars: 2, mercury: 3, jupiter: 4, venus: 5, saturn: 6, rahu: 7 };
const EXALT: Partial<Record<GrahaKey, number>> = { sun: 0, moon: 1, mars: 9, mercury: 5, jupiter: 3, venus: 11, saturn: 6 };
const DASHA_SEQUENCE: GrahaKey[] = ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"];
const DASHA_YEARS: Record<GrahaKey, number> = { ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17 };
const LORD_NE: Record<GrahaKey, string> = { ketu: "केतु", venus: "शुक्र", sun: "सूर्य", moon: "चन्द्र", mars: "मङ्गल", rahu: "राहु", jupiter: "गुरु", saturn: "शनि", mercury: "बुध" };
const LORD_EN: Record<GrahaKey, string> = { sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter", venus: "Venus", saturn: "Saturn", rahu: "Rahu", ketu: "Ketu" };

const RASHI_MAX_DAYS: Record<GrahaKey, number> = { sun: 35, mercury: 35, venus: 35, moon: 3, mars: 80, jupiter: 400, saturn: 800, rahu: 200, ketu: 200 };
const NAKSHATRA_MAX_DAYS: Record<GrahaKey, number> = { sun: 15, moon: 1.5, mars: 30, mercury: 40, venus: 12, jupiter: 45, saturn: 45, rahu: 45, ketu: 45 };
const PADA_MAX_DAYS: Record<GrahaKey, number> = { sun: 5, moon: 0.5, mars: 28, mercury: 20, rahu: 20, ketu: 20, jupiter: 25, venus: 6, saturn: 30 };
/** An upper bound on a graha's daily motion, with a wide margin. */
const MAX_DAILY_MOTION: Record<GrahaKey, number> = { sun: 1.5, moon: 20, mars: 1.2, mercury: 3, jupiter: 0.5, venus: 2, saturn: 0.3, rahu: 0.3, ketu: 0.3 };

// ---------------------------------------------------------------- positions

/** `position_longitude`: the sky's longitude, rounded (Ketu: the rounded Rahu + 180). */
function positionLongitude(sky: Sky, g: GrahaKey, jd: number): number {
  const p = sky.positionsAt(jd, 8, false);
  if (!p) throw new Error("no positions");
  if (g === "ketu") return stableRound(pyMod(pyMod(p.longitude[7], 360) + 180, 360));
  return stableRound(pyMod(p.longitude[BODY_INDEX[g]], 360));
}
/** `_longitude_for`: Ketu is the rounded Rahu + 180. */
function longitudeFor(sky: Sky, g: GrahaKey, jd: number): number {
  if (g === "ketu") return pyMod(positionLongitude(sky, "rahu", jd) + 180, 360);
  return positionLongitude(sky, g, jd);
}
/** `planet_service.speed`: the central difference over a day, rounded. */
function speedFor(sky: Sky, g: GrahaKey, jd: number): number {
  const ahead = sky.positionsAt(jd + 0.5, 8, false);
  const behind = sky.positionsAt(jd - 0.5, 8, false);
  if (!ahead || !behind) throw new Error("no positions");
  const i = BODY_INDEX[g === "ketu" ? "rahu" : g];
  let diff = ahead.longitude[i] - behind.longitude[i];
  diff -= 360 * Math.round(diff / 360);
  const speed = stableRound(diff);
  return g === "ketu" ? -speed : speed;
}
const isRetrogradeAt = (g: GrahaKey, speed: number) => (g === "rahu" || g === "ketu" ? true : g === "sun" || g === "moon" ? false : speed < 0);
const retroAt = (sky: Sky, g: GrahaKey, jd: number) => isRetrogradeAt(g, speedFor(sky, g, jd));

const index = (x: number, span: number, modulo: number) => pyInt(x / span) % modulo;
const rashiIndex = (sky: Sky, g: GrahaKey, jd: number) => index(longitudeFor(sky, g, jd), 30, 12);
const nakshatraIndex = (sky: Sky, g: GrahaKey, jd: number) => index(longitudeFor(sky, g, jd), NAKSHATRA_SPAN, 27);
function padaTuple(sky: Sky, g: GrahaKey, jd: number): [number, number] {
  const lon = longitudeFor(sky, g, jd);
  const nak = index(lon, NAKSHATRA_SPAN, 27);
  // The offset into the nakshatra, not a remainder: at an edge the index can step up a rounding before the remainder wraps.
  return [nak, Math.min(pyInt(Math.max(pyMod(lon, 360) - nak * NAKSHATRA_SPAN, 0) / PADA_SPAN) + 1, 4)];
}
const padaFlat = (sky: Sky, g: GrahaKey, jd: number) => {
  const [nak, pada] = padaTuple(sky, g, jd);
  return nak * 4 + (pada - 1);
};

// ---------------------------------------------------------------- searches

/** Seconds during which a graha at `longitude` cannot reach a pada edge. */
function quietSeconds(g: GrahaKey, longitude: number): number {
  const into = pyMod(longitude, PADA_SPAN);
  const room = Math.min(into, PADA_SPAN - into) - 0.01;
  return room <= 0 ? 0 : (room / MAX_DAILY_MOTION[g]) * 86_400;
}

/** `_bisect_index_change`: when `getIndex` first changes after `from`. */
function bisectIndexChange(sky: Sky, g: GrahaKey, from: number, getIndex: (sky: Sky, g: GrahaKey, jd: number) => number, maxDays: number): number | null {
  const current = getIndex(sky, g, from);
  const limit = from + maxDays;
  let lo = from;
  let hi: number | null = null;
  let cursor = from;
  const quiet = quietSeconds(g, longitudeFor(sky, g, from));
  while (cursor < limit) {
    const next = Math.min(cursor + 3 / 24, limit);
    if (next < limit && (next - from) * 86_400 < quiet) {
      cursor = next;
      continue;
    }
    if (getIndex(sky, g, next) !== current) {
      lo = cursor;
      hi = next;
      break;
    }
    cursor = next;
  }
  if (hi === null) return null;
  let top: number = hi;
  for (let i = 0; i < 60; i += 1) {
    if ((top - lo) * 86_400 < 1) break;
    const mid: number = (lo + top) / 2;
    if (getIndex(sky, g, mid) === current) lo = mid;
    else top = mid;
  }
  return getIndex(sky, g, top) !== current ? top : null;
}

type Kind =
  | { level: "rashi"; from: number; to: number; again: boolean }
  | { level: "nakshatra"; from: number; to: number }
  | { level: "pada"; from: [number, number]; to: [number, number] }
  | { level: "motion"; retrograde: boolean }
  | { level: "udayast"; visible: boolean; east: boolean; retrograde: boolean };
export interface Ingress {
  graha: GrahaKey;
  at: number;
  kind: Kind;
}

/** The entry dict in the server's key order (`Ingress::to_json`). */
function entryJson(e: Ingress): Json {
  const [vedic, ne] = GRAHA_META[e.graha];
  const m: Json = { graha: e.graha, graha_vedic: vedic, graha_ne: ne };
  const k = e.kind;
  m.level = k.level;
  if (k.level === "rashi") {
    m.from_rashi = RASHI_NAMES[k.from];
    m.from_rashi_ne = RASHI_NAMES_NE[k.from];
    m.to_rashi = RASHI_NAMES[k.to];
    m.to_rashi_ne = RASHI_NAMES_NE[k.to];
    m.label_ne = `${k.again ? "पुनः" : ""}${RASHI_NAMES_NE[k.to]}मा`;
  } else if (k.level === "nakshatra") {
    m.from_nakshatra = NAKSHATRA_NAMES[k.from];
    m.from_nakshatra_ne = NAKSHATRA_NAMES_NE[k.from];
    m.to_nakshatra = NAKSHATRA_NAMES[k.to];
    m.to_nakshatra_ne = NAKSHATRA_NAMES_NE[k.to];
    m.label_ne = `${NAKSHATRA_NAMES_NE[k.to]} मा`;
  } else if (k.level === "pada") {
    m.from_nakshatra = NAKSHATRA_NAMES[k.from[0]];
    m.from_nakshatra_ne = NAKSHATRA_NAMES_NE[k.from[0]];
    m.from_pada = k.from[1];
    m.from_pada_ne = nepaliDigits(k.from[1]);
    m.to_nakshatra = NAKSHATRA_NAMES[k.to[0]];
    m.to_nakshatra_ne = NAKSHATRA_NAMES_NE[k.to[0]];
    m.to_pada = k.to[1];
    m.to_pada_ne = nepaliDigits(k.to[1]);
    m.label_ne = `${NAKSHATRA_NAMES_NE[k.to[0]]} ${nepaliDigits(k.to[1])} मा`;
  } else if (k.level === "motion") {
    m.motion = k.retrograde ? "Vakri" : "Margi";
    m.is_retrograde = k.retrograde;
    m.label_ne = k.retrograde ? "वक्री" : "मार्गी";
  } else {
    m.event = k.visible ? "udaya" : "asta";
    m.hemisphere = k.east ? "west" : "east";
    m.is_retrograde = k.retrograde;
    m.motion_ne = k.retrograde ? "वक्र" : "मार्गी";
    m.label_ne = `${k.east ? "पश्चिम" : "पूर्व"}मा ${k.visible ? "उदय" : "अस्त"}`;
  }
  m.entry_time_utc = utcIso(e.at);
  return m;
}

/** `_rashi_again_prefix`: पुनः when the graha stood in `to` within the lookback. */
function rashiAgain(sky: Sky, g: GrahaKey, from: number, to: number): boolean {
  const lookback = Math.trunc(Math.min(RASHI_MAX_DAYS[g], 120));
  for (let d = 1; d <= lookback; d += 1) if (rashiIndex(sky, g, from - d) === to) return true;
  return false;
}

export function nextRashiEntry(sky: Sky, g: GrahaKey, from: number): Ingress | null {
  const current = rashiIndex(sky, g, from);
  const at = bisectIndexChange(sky, g, from, rashiIndex, RASHI_MAX_DAYS[g]);
  if (at === null) return null;
  const to = rashiIndex(sky, g, at) % 12;
  return { graha: g, at, kind: { level: "rashi", from: current, to, again: rashiAgain(sky, g, from, to) } };
}
export function nextNakshatraEntry(sky: Sky, g: GrahaKey, from: number): Ingress | null {
  const current = nakshatraIndex(sky, g, from);
  const at = bisectIndexChange(sky, g, from, nakshatraIndex, NAKSHATRA_MAX_DAYS[g]);
  return at === null ? null : { graha: g, at, kind: { level: "nakshatra", from: current, to: nakshatraIndex(sky, g, at) } };
}
export function nextPadaEntry(sky: Sky, g: GrahaKey, from: number): Ingress | null {
  const was = padaTuple(sky, g, from);
  const at = bisectIndexChange(sky, g, from, padaFlat, PADA_MAX_DAYS[g]);
  return at === null ? null : { graha: g, at, kind: { level: "pada", from: was, to: padaTuple(sky, g, at) } };
}

const sortEntries = (entries: Ingress[]): Ingress[] => entries.sort((a, b) => a.at - b.at);

function upcomingRashiEntries(sky: Sky, from: number, grahas: GrahaKey[], perGraha: number): Ingress[] {
  const out: Ingress[] = [];
  for (const g of grahas) {
    let cursor = from;
    for (let i = 0; i < perGraha; i += 1) {
      const entry = nextRashiEntry(sky, g, cursor);
      if (!entry) break;
      out.push(entry);
      cursor = entry.at + 1 / 24;
    }
  }
  return sortEntries(out);
}

/** `find_motion_stations_in_range`. */
export function motionStations(sky: Sky, from: number, until: number, grahas: GrahaKey[]): Ingress[] {
  const events: Ingress[] = [];
  for (const g of grahas) {
    if (g === "sun" || g === "moon" || g === "rahu" || g === "ketu") continue;
    let cursor = from;
    let was = retroAt(sky, g, cursor);
    while (cursor < until) {
      const probe = Math.min(cursor + 3 / 24, until);
      const now = retroAt(sky, g, probe);
      if (now === was) {
        cursor = probe;
        continue;
      }
      let lo = cursor;
      let hi = probe;
      for (let i = 0; i < 50; i += 1) {
        if ((hi - lo) * 86_400 < 1) break;
        const mid = (lo + hi) / 2;
        if (retroAt(sky, g, mid) === now) hi = mid;
        else lo = mid;
      }
      if (hi > until) break;
      events.push({ graha: g, at: hi, kind: { level: "motion", retrograde: now } });
      was = now;
      cursor = addSeconds(hi, 90);
    }
  }
  return sortEntries(events);
}

function combustionThreshold(g: GrahaKey, speed: number): number {
  const retro = isRetrogradeAt(g, speed);
  if (g === "mars") return 17;
  if (g === "jupiter") return 11;
  if (g === "saturn") return 15;
  if (g === "venus") return retro ? 8 : 10;
  if (g === "mercury" && retro) return 12;
  return 14;
}
/** `_elongation`: separation, east of the Sun, speed. */
function elongation(sky: Sky, g: GrahaKey, jd: number): [number, boolean, number] {
  const diff = pyMod(longitudeFor(sky, g, jd) - longitudeFor(sky, "sun", jd), 360);
  return [Math.min(diff, 360 - diff), diff < 180, speedFor(sky, g, jd)];
}
export function visible(sky: Sky, g: GrahaKey, jd: number): boolean {
  const [sep, , speed] = elongation(sky, g, jd);
  return sep >= combustionThreshold(g, speed);
}

/** `find_udayast_events_in_range`. */
export function udayastEvents(sky: Sky, from: number, until: number, grahas: GrahaKey[]): Ingress[] {
  const events: Ingress[] = [];
  for (const g of grahas) {
    let cursor = from;
    let was = visible(sky, g, cursor);
    while (cursor < until) {
      const probe = Math.min(cursor + 2 / 24, until);
      const now = visible(sky, g, probe);
      if (now === was) {
        cursor = probe;
        continue;
      }
      let lo = cursor;
      let hi = probe;
      for (let i = 0; i < 50; i += 1) {
        if ((hi - lo) * 86_400 < 1) break;
        const mid = (lo + hi) / 2;
        if (visible(sky, g, mid) === now) hi = mid;
        else lo = mid;
      }
      if (hi > until) break;
      const [, east, speed] = elongation(sky, g, hi);
      events.push({ graha: g, at: hi, kind: { level: "udayast", visible: now, east, retrograde: isRetrogradeAt(g, speed) } });
      was = now;
      cursor = addSeconds(hi, 90);
    }
  }
  return sortEntries(events);
}

export type GocharLevel = "pada" | "nakshatra" | "rashi" | "patro" | "udayast";

/** `find_ingress_entries_in_range`. */
function ingressEntries(sky: Sky, from: number, until: number, level: GocharLevel, grahas: GrahaKey[]): Ingress[] {
  if (level === "udayast") return udayastEvents(sky, from, until, grahas);
  if (level === "patro") {
    const merged = ingressEntries(sky, from, until, "pada", grahas);
    merged.push(...ingressEntries(sky, from, until, "rashi", grahas.filter((g) => g !== "sun" && g !== "moon")));
    merged.push(...udayastEvents(sky, from, until, FIVE_PLANETS));
    merged.push(...motionStations(sky, from, until, FIVE_PLANETS));
    return sortEntries(merged);
  }
  const finder = level === "pada" ? nextPadaEntry : level === "nakshatra" ? nextNakshatraEntry : nextRashiEntry;
  const entries: Ingress[] = [];
  for (const g of grahas) {
    let cursor = from;
    while (cursor < until) {
      const entry = finder(sky, g, cursor);
      if (!entry || entry.at > until) break;
      entries.push(entry);
      cursor = addSeconds(entry.at, 90);
    }
  }
  return sortEntries(entries);
}

// ---------------------------------------------------------------- local stamps

/** `_attach_local_time`: the local stamp and the local civil day's JD, read from the printed instant. */
function attachLocalTime(entry: Json, at: number, place: Place): number {
  const wall = wallIn(at, place.timeZone);
  entry.entry_time_local = `${wall.iso.slice(0, 10)} ${wall.hm}`;
  entry.entry_time_local_short = wall.hm;
  entry.entry_jd = wall.jdn - 0.5;
  return wall.jdn - 0.5;
}

/** The sunrise on a civil day as the server holds it (whole seconds). */
function sunriseJd(sky: Sky, jdn: number, place: Place): number {
  const t = dayTimes(sky, jdn, place);
  if (!t) throw new Error("no sunrise");
  return t.sunrise;
}
const sunriseOnJdn = sunriseJd;

/** Both ends of a span's scan: the first day's sunrise and the sunrise after the last day. */
function sunriseWindow(sky: Sky, jdStart: number, jdEnd: number, place: Place): [number, number] {
  return [sunriseJd(sky, Math.floor(jdStart + 0.5), place), sunriseJd(sky, Math.floor(jdEnd + 0.5) + 1, place)];
}

// ---------------------------------------------------------------- the transit table

function nakshatraFields(lon: number, out: Json): void {
  const l = pyMod(lon, 360);
  const nak = pyInt(Math.floor(l / NAKSHATRA_SPAN)) % 27;
  const pos = l - nak * NAKSHATRA_SPAN;
  const pada = Math.min(pyInt(pos / PADA_SPAN) + 1, 4);
  const elapsed = (pos / NAKSHATRA_SPAN) * 120;
  const start = nak % 9;
  let cumulative = 0;
  let sub = DASHA_SEQUENCE[start];
  for (let i = 0; i < 9; i += 1) {
    const lord = DASHA_SEQUENCE[(start + i) % 9];
    cumulative += DASHA_YEARS[lord];
    if (elapsed < cumulative) {
      sub = lord;
      break;
    }
  }
  const star = DASHA_SEQUENCE[nak % 9];
  Object.assign(out, {
    nakshatra_no: nak + 1,
    nakshatra: NAKSHATRA_NAMES[nak],
    nakshatra_ne: NAKSHATRA_NAMES_NE[nak],
    pada,
    nakshatra_lord: star,
    nakshatra_lord_ne: LORD_NE[star],
    nakshatra_lord_en: LORD_EN[star],
    sub_lord: sub,
    sub_lord_ne: LORD_NE[sub],
    sub_lord_en: LORD_EN[sub],
  });
}

/** `get_gochar_table`: every graha's row at an instant. */
function gocharTable(sky: Sky, jd: number): [GrahaKey, Json][] {
  const rows = spashtaGrahas(sky, jd);
  return GRAHA_ALL.map((g) => {
    const row = rows.find((r) => r.key === g);
    const lon = row?.longitude ?? 0;
    const spd = row?.speed ?? 0;
    const rashi = pyInt(lon / 30) % 12;
    const [vedic, ne, symbol] = GRAHA_META[g];
    const retro = isRetrogradeAt(g, spd);
    const combust = combustAt(g, lon, spd, rows[0].longitude);
    const m: Json = {
      name_vedic: vedic,
      name_ne: ne,
      symbol,
      longitude: pyRound(lon, 4),
      dms_absolute: dms(lon, 3),
      rashi_no: rashi + 1,
      rashi: RASHI_NAMES[rashi],
      rashi_ne: RASHI_NAMES_NE[rashi],
      deg_in_rashi: pyRound(pyMod(lon, 30), 4),
      dms_in_rashi: dms(pyMod(lon, 30), 2),
      speed_deg_day: pyRound(spd, 4),
      is_retrograde: retro,
      is_combust: combust,
      motion: retro ? "Vakri" : "Margi",
      is_exalted: EXALT[g] !== undefined && EXALT[g] === rashi,
    };
    nakshatraFields(lon, m);
    return [g, m];
  });
}
function combustAt(g: GrahaKey, lon: number, speed: number, sun: number): boolean {
  const diff = pyMod(lon - sun, 360);
  const sep = Math.min(diff, 360 - diff);
  const retro = isRetrogradeAt(g, speed);
  switch (g) {
    case "mars": return sep < 17;
    case "jupiter": return sep < 11;
    case "saturn": return sep < 15;
    case "venus": return sep < (retro ? 8 : 10);
    case "mercury": return sep < (retro ? 12 : 14);
    case "moon": return sep < 13;
    default: return false;
  }
}

const bsLabel = (jdn: number): string | null => {
  const bs = bsDateOf(jdn);
  return bs ? `${bs.year}-${String(bs.month).padStart(2, "0")}-${String(bs.day).padStart(2, "0")}` : null;
};
const isoOfJdn = (jdn: number) => {
  const c = civilFromJdn(jdn);
  return `${String(c.year).padStart(4, "0")}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
};

type PlaceBlock = Place & { name?: string; cityId?: number };
const place = (p: PlaceBlock): Json => locationBlock({ year: 0, month: 0, day: 0, ...p });

/** `build_gochar(jd, location, include_next_entry=True, include_upcoming=…)` for the civil day `jdn`. */
export function gocharDay(sky: Sky, jdn: number, where: PlaceBlock, upcoming: boolean): Json | null {
  const times = dayTimes(sky, jdn, where);
  if (!times) return null;
  const sunrise = times.sunrise;
  const table: Json = {};
  for (const [g, row] of gocharTable(sky, sunrise)) {
    const stamp = (e: Ingress | null, keys: string[]): Json | null => {
      if (!e) return null;
      const m = entryJson(e);
      attachLocalTime(m, e.at, where);
      return Object.fromEntries(keys.map((k) => [k, m[k]]));
    };
    row.next_rashi_entry = stamp(nextRashiEntry(sky, g, sunrise), ["to_rashi", "to_rashi_ne", "entry_time_local", "entry_time_utc"]);
    row.next_nakshatra_entry = stamp(nextNakshatraEntry(sky, g, sunrise), ["to_nakshatra", "to_nakshatra_ne", "label_ne", "entry_time_local", "entry_time_local_short", "entry_time_utc"]);
    row.next_pada_entry = stamp(nextPadaEntry(sky, g, sunrise), ["to_nakshatra", "to_nakshatra_ne", "to_pada", "to_pada_ne", "label_ne", "entry_time_local", "entry_time_local_short", "entry_time_utc"]);
    table[g] = row;
  }
  const drik = sky.system === "drik";
  const out: Json = {
    date_bs: bsLabel(jdn),
    date_ad: isoOfJdn(jdn),
    anchor: "sunrise",
    computed_at: { utc: utcIso(sunrise), local: wallIn(sunrise, where.timeZone).hm, note: "Positions at local true sunrise (Udaya)" },
    location: place(where),
    ayanamsa: { name: drik ? "Lahiri" : "Surya Siddhanta", degrees: drik ? pyRound(sky.positionsAt(sunrise, 1, false)?.ayanamsha ?? 0, 6) : null },
    gochar: table,
    vedic_stars: [],
  };
  if (upcoming) out.upcoming_transits = upcomingRashiEntries(sky, sunrise, SLOW_GRAHAS, 3).map(entryJson);
  return out;
}

/** `build_gochar_ingress(jd_start, jd_end, location, level=, grahas=)`. */
export function gocharIngress(sky: Sky, jdStart: number, jdEnd: number, where: PlaceBlock, level: GocharLevel, grahas?: GrahaKey[]): Json | null {
  const list = grahas ?? GRAHA_ALL.filter((g) => g !== "moon");
  const first = Math.floor(jdStart + 0.5);
  const after = Math.floor(jdEnd + 0.5) + 1;
  const from = sunriseOnJdn(sky, first, where);
  const until = sunriseOnJdn(sky, after, where);
  const events: Json[] = [];
  for (const entry of ingressEntries(sky, from, until, level, list)) {
    const m = entryJson(entry);
    const entryJd = attachLocalTime(m, entry.at, where);
    const dayJdn = Math.floor(entryJd + 0.5);
    m.entry_vedic_jd = entry.at < sunriseOnJdn(sky, dayJdn, where) ? dayJdn - 1 - 0.5 : entryJd;
    events.push(m);
  }
  return { from_jd: jdStart, to_jd: jdEnd, level, location: place(where), events };
}

/** `build_gochar_year_summary(bs_year, location)`. */
export function gocharYear(sky: Sky, bsYear: number, where: PlaceBlock): Json | null {
  const first = bsMonth(bsYear, 1);
  const last = bsMonth(bsYear, 12);
  if (!first || !last) return null;
  const upcoming = upcomingRashiEntries(sky, sunriseOnJdn(sky, first.first, where), SLOW_GRAHAS, 4).map(entryJson);
  const snapshots: Json[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const range = bsMonth(bsYear, m);
    if (!range) return null;
    const mid = Math.min(range.length, 15);
    const jdn = range.first + mid - 1;
    const gochar: Json = {};
    for (const [g, row] of gocharTable(sky, sunriseOnJdn(sky, jdn, where))) {
      gochar[g] = { rashi: row.rashi, deg_in_rashi: row.deg_in_rashi, motion: row.motion, vakri: row.is_retrograde };
    }
    snapshots.push({ bs_month: m, snapshot_date_ad: isoOfJdn(jdn), snapshot_date_bs: `${bsYear}-${String(m).padStart(2, "0")}-${String(mid).padStart(2, "0")}`, gochar });
  }
  return {
    bs_year: bsYear,
    range_start_jd: first.first - 0.5,
    range_end_jd: last.first + last.length - 1 - 0.5,
    location: place(where),
    upcoming_transits: upcoming,
    monthly_snapshots: snapshots,
  };
}

// ---------------------------------------------------------------- graha detail

/** `build_graha_vakri_span`. */
export function grahaVakriSpan(sky: Sky, jdStart: number, jdEnd: number, where: PlaceBlock): Json {
  const [from, until] = sunriseWindow(sky, jdStart, jdEnd, where);
  const events = motionStations(sky, from, until, YEARLY_GRAHAS).map((e) => {
    const m = entryJson(e);
    attachLocalTime(m, e.at, where);
    return m;
  });
  return { range_start_jd: jdStart, range_end_jd: jdEnd, location: place(where), grahas: YEARLY_GRAHAS, events };
}

interface Stamp {
  value: Json;
  dayJd: number;
}
function stamp(at: number, where: Place): Stamp {
  const wall = wallIn(at, where.timeZone);
  const dayJd = wall.jdn - 0.5;
  return { value: { iso: utcIso(at), jd: dayJd, time_short: wall.hm }, dayJd };
}
interface Period {
  order: number;
  startIso: string;
  value: Json;
}
function period(order: number, graha: GrahaKey, start: Stamp | null, end: Stamp | null, hemisphere: string | null): Period {
  const startIso = ((start ?? end)?.value.iso as string | undefined) ?? "";
  return {
    order,
    startIso,
    value: {
      graha,
      graha_ne: GRAHA_META[graha][1],
      start: start?.value ?? null,
      end: end?.value ?? null,
      duration_days: start && end ? pyRoundInt(end.dayJd - start.dayJd) + 1 : null,
      hemisphere,
    },
  };
}

/** `_planet_asta_periods`: asta to udaya pairs per graha. */
function planetPeriods(sky: Sky, from: number, until: number, where: Place): Period[] {
  const events = udayastEvents(sky, from, until, YEARLY_GRAHAS);
  const order: GrahaKey[] = [];
  for (const e of events) if (!order.includes(e.graha)) order.push(e.graha);
  const periods: Period[] = [];
  for (const g of order) {
    const evs = events.filter((e) => e.graha === g).sort((a, b) => a.at - b.at);
    let open: { at: number; east: boolean } | null = null;
    const make = (asta: { at: number; east: boolean } | null, udaya: { at: number; east: boolean } | null) => {
      const hemisphere = (asta ?? udaya) ? ((asta ?? udaya)!.east ? "west" : "east") : null;
      return period(ASTA_GRAHAS.indexOf(g), g, asta ? stamp(asta.at, where) : null, udaya ? stamp(udaya.at, where) : null, hemisphere);
    };
    for (const e of evs) {
      if (e.kind.level !== "udayast") continue;
      if (e.kind.visible) {
        periods.push(make(open, { at: e.at, east: e.kind.east }));
        open = null;
      } else open = { at: e.at, east: e.kind.east };
    }
    if (open) periods.push(make(open, null));
  }
  return periods;
}

const elongationAt = (sky: Sky, jd: number) => {
  const diff = pyMod(positionLongitude(sky, "moon", jd) - positionLongitude(sky, "sun", jd), 360);
  return Math.min(diff, 360 - diff);
};
/** The instant the civil day `jdn` starts on the place's clock. */
function localMidnightJd(jdn: number, where: Place): number {
  const utc = jdn - 0.5;
  return utc - utcOffsetMinutes(where.timeZone, utc) / 1440;
}
/** The smallest elongation of a local civil day, sampled every 30 minutes (99 when the Moon is far from the Sun at noon). */
function dayMinElongation(sky: Sky, jdn: number, where: Place): number {
  const start = localMidnightJd(jdn, where);
  if (elongationAt(sky, start + 0.5) > 28) return 99;
  let min = Infinity;
  for (let i = 0; i < 48; i += 1) min = Math.min(min, elongationAt(sky, start + i / 48));
  return min;
}
function moonEvent(sky: Sky, jdn: number, where: Place, crossing: "rise" | "set"): Stamp | null {
  const start = localMidnightJd(jdn, where);
  const r = moonRiseSet(sky.source, start, where.latitude, where.longitude);
  const at = crossing === "rise" ? r.rise : r.set;
  if (at === null || at >= start + 1) return null;
  return stamp(at, where);
}
/** `_moon_tara_asta_periods`: runs of combust days, moonrise of the first to moonset of the last. */
function moonPeriods(sky: Sky, from: number, to: number, where: Place): Period[] {
  const groups: [number, number][] = [];
  let current: [number, number] | null = null;
  for (let jdn = from; jdn <= to; jdn += 1) {
    if (dayMinElongation(sky, jdn, where) < MOON_ASTA_ORB) current = [current ? current[0] : jdn, jdn];
    else if (current) {
      groups.push(current);
      current = null;
    }
  }
  if (current) groups.push(current);
  return groups.map(([a, b]) => period(2, "moon", moonEvent(sky, a, where, "rise"), moonEvent(sky, b, where, "set"), null));
}

/** `build_graha_asta_span`. */
export function grahaAstaSpan(sky: Sky, jdStart: number, jdEnd: number, where: PlaceBlock): Json {
  const [from, until] = sunriseWindow(sky, jdStart, jdEnd, where);
  const periods = planetPeriods(sky, from, until, where);
  periods.push(...moonPeriods(sky, Math.floor(jdStart + 0.5), Math.floor(jdEnd + 0.5), where));
  periods.sort((a, b) => a.order - b.order || (a.startIso < b.startIso ? -1 : a.startIso > b.startIso ? 1 : 0));
  return { range_start_jd: jdStart, range_end_jd: jdEnd, location: place(where), grahas: ASTA_GRAHAS, periods: periods.map((p) => p.value) };
}

// ---------------------------------------------------------------- graha sthiti

const dmsInRashi = (lon: number): string => {
  const l = pyMod(lon, 360);
  const [d, m, s] = dmsParts(pyMod(l, 30));
  return `${String(d).padStart(2, "0")}° ${RASHI_NAMES_NE[pyInt(Math.floor(l / 30)) % 12]} ${String(m).padStart(2, "0")}′ ${String(s).padStart(2, "0")}″`;
};
const dmsLatitude = (lat: number): string => {
  const [d, m, s] = dmsParts(Math.abs(lat));
  return `${String(d).padStart(2, "0")}° ${lat >= 0 ? "उ." : "द."} ${String(m).padStart(2, "0")}′ ${String(s).padStart(2, "0")}″`;
};
function dmsParts(value: number): [number, number, number] {
  let deg = pyInt(value);
  const mm = (value - deg) * 60;
  let minute = pyInt(mm);
  let sec = pyRoundInt((mm - minute) * 60);
  if (sec >= 60) {
    sec -= 60;
    minute += 1;
  }
  if (minute >= 60) {
    minute -= 60;
    deg += 1;
  }
  return [deg, minute, sec];
}

interface Sphuta {
  key: string;
  nameNe: string;
  vedic: string;
  symbol: string;
  lon: number;
  speed: number;
  coords: [number, number, number];
  retrograde: boolean;
  combust: boolean;
}
function sphutaJson(r: Sphuta): Json {
  const lon = pyMod(r.lon, 360);
  const nak = pyInt(Math.floor(lon / NAKSHATRA_SPAN)) % 27;
  const pada = Math.min(pyInt(pyMod(lon, NAKSHATRA_SPAN) / PADA_SPAN) + 1, 4);
  const fields: Json = {};
  nakshatraFields(lon, fields);
  return {
    graha: r.key,
    name_ne: r.nameNe,
    name_vedic: r.vedic,
    symbol: r.symbol,
    rekhamsha: dmsInRashi(r.lon),
    rashi_ne: RASHI_NAMES_NE[pyInt(Math.floor(pyMod(r.lon, 360) / 30)) % 12],
    nakshatra: NAKSHATRA_NAMES[nak],
    nakshatra_ne: NAKSHATRA_NAMES_NE[nak],
    pada,
    pada_ne: nepaliDigits(pada),
    nakshatra_lord_ne: fields.nakshatra_lord_ne,
    sub_lord_ne: fields.sub_lord_ne,
    full_degree: pyRound(pyMod(r.lon, 360), 2),
    shara: dmsLatitude(r.coords[0]),
    shara_deg: pyRound(r.coords[0], 4),
    speed_deg_day: pyRound(r.speed, 2),
    is_retrograde: r.retrograde,
    is_combust: r.combust,
    right_ascension: pyRound(r.coords[1], 2),
    declination: pyRound(r.coords[2], 2),
  };
}

/** `build_graha_sthiti(jd, location)`: the lagna and all nine grahas at sunrise. */
export function grahaSthiti(sky: Sky, jdn: number, where: PlaceBlock): Json | null {
  const times = dayTimes(sky, jdn, where);
  if (!times) return null;
  const sunrise = times.sunrise;
  const lagna = instantLagna(sky, sunrise, where.latitude, where.longitude);
  if (!lagna) return null;
  const table = planetsWithExtras(sky, sunrise) as Record<string, Json>;
  const spashta = spashtaGrahas(sky, sunrise);
  const rows: Json[] = [
    sphutaJson({ key: "lagna", nameNe: "लग्न", vedic: "Lagna", symbol: "↑", lon: lagnaAt(sky.source, sunrise, where.latitude, where.longitude) ?? 0, speed: lagna.speed as number, coords: [0, lagna.right_ascension as number, lagna.declination as number], retrograde: false, combust: false }),
  ];
  const sunLon = spashta[0].longitude;
  for (const g of GRAHA_ALL) {
    const row = spashta.find((r) => r.key === g);
    const extra = table[g] ?? {};
    const [vedic, ne, symbol] = GRAHA_META[g];
    const retro = isRetrogradeAt(g, row?.speed ?? 0);
    const combust = !(g === "sun" || g === "moon" || g === "rahu" || g === "ketu") && combustAt(g, row?.longitude ?? 0, row?.speed ?? 0, sunLon);
    rows.push(sphutaJson({ key: g, nameNe: ne, vedic, symbol, lon: row?.longitude ?? 0, speed: row?.speed ?? 0, coords: [Number(extra.latitude ?? 0), Number(extra.right_ascension ?? 0), Number(extra.declination ?? 0)], retrograde: retro, combust }));
  }
  return {
    date_ad: isoOfJdn(jdn),
    date_bs: bsLabel(jdn),
    anchor: "sunrise",
    timezone: where.timeZone,
    sunrise_local: wallIn(sunrise, where.timeZone).iso,
    location: place(where),
    rows,
  };
}
export { civilJdn };
