// Planets (spashta graha), lagna, lagna spans with Pushkara Navamsha, udaya lagna and panchaka rahita
// (`panchanga::blocks_lagna`). The ascendant's crossings are found from the sky and its frame, so they
// serve the Surya Siddhanta and Drik alike.
import { lagnaAt, wrap360 } from "../../astronomy/siddhanta-offline";
import type { Sky } from "../../astronomy/sky";
import { karanaAt, nakshatraAt, tithiInfo, type Json, type Place } from "./blocks";
import { pyInt, pyMod, pyRound, pyRoundInt } from "./py";
import { addSeconds, secondsSince, utcIso, wallIn } from "./instant";
import { RASHI_NAMES, RASHI_NAMES_NE } from "./tables.generated";

const stableRound = (v: number) => pyRound(pyRound(v, 9), 6);

export function dms(value: number, width: number): string {
  let d = pyInt(value);
  const mFrac = (value - d) * 60;
  let m = pyInt(mFrac);
  let s = pyRoundInt((mFrac - m) * 60);
  if (s >= 60) {
    s -= 60;
    m += 1;
  }
  if (m >= 60) {
    m -= 60;
    d += 1;
  }
  return `${String(d).padStart(width, "0")}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}

// ---------------------------------------------------------------- planets

const ORDER = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "rahu"] as const;
/** The index of each graha in the sky's body order (sun, moon, mars, mercury, jupiter, venus, saturn, rahu). */
const BODY_INDEX: Record<(typeof ORDER)[number], number> = { sun: 0, moon: 1, mercury: 3, venus: 5, mars: 2, jupiter: 4, saturn: 6, rahu: 7 };

export interface Graha {
  key: string;
  longitude: number;
  speed: number;
}
export function spashtaGrahas(sky: Sky, jd: number): Graha[] {
  const at = sky.positionsAt(jd, 8, false);
  const ahead = sky.positionsAt(jd + 0.5, 8, false);
  const behind = sky.positionsAt(jd - 0.5, 8, false);
  if (!at || !ahead || !behind) throw new Error("no positions");
  const grahas = ORDER.map((key): Graha => {
    const i = BODY_INDEX[key];
    let diff = ahead.longitude[i] - behind.longitude[i];
    diff -= 360 * Math.round(diff / 360);
    return { key, longitude: stableRound(pyMod(at.longitude[i], 360)), speed: stableRound(diff) };
  });
  const rahu = grahas[7];
  grahas.push({ key: "ketu", longitude: stableRound(pyMod(rahu.longitude + 180, 360)), speed: stableRound(-rahu.speed) });
  return grahas;
}

export const isRetrograde = (g: Graha) => (g.key === "rahu" || g.key === "ketu" ? true : g.key === "sun" || g.key === "moon" ? false : g.speed < 0);
export function isCombust(g: Graha, sun: number): boolean {
  const diff = pyMod(g.longitude - sun, 360);
  const sep = Math.min(diff, 360 - diff);
  const retro = isRetrograde(g);
  switch (g.key) {
    case "mars": return sep < 17;
    case "jupiter": return sep < 11;
    case "saturn": return sep < 15;
    case "venus": return sep < (retro ? 8 : 10);
    case "mercury": return sep < (retro ? 12 : 14);
    case "moon": return sep < 13;
    default: return false;
  }
}

/** `spashta_table`: every graha at sunrise, in the text's order with Ketu last. */
export function planetTable(sky: Sky, jd: number): Json {
  const grahas = spashtaGrahas(sky, jd);
  const sun = grahas[0].longitude;
  const row = (key: string): Json => {
    const g = grahas.find((x) => x.key === key) as Graha;
    const i = pyInt(g.longitude / 30) % 12;
    return {
      longitude: g.longitude,
      speed: g.speed,
      rashi: i + 1,
      rashi_name: RASHI_NAMES[i],
      rashi_ne: RASHI_NAMES_NE[i],
      dms: dms(g.longitude, 3),
      deg_in_rashi: pyRound(pyMod(g.longitude, 30), 6),
      dms_in_rashi: dms(pyMod(g.longitude, 30), 2),
      is_retrograde: isRetrograde(g),
      is_combust: isCombust(g, sun),
    };
  };
  const out: Json = {};
  for (const k of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "rahu", "ketu"]) out[k] = row(k);
  return out;
}

// ---------------------------------------------------------------- the ascendant

const RAD = Math.PI / 180;
function sidereal(sky: Sky, jd: number, lon: number): number {
  if (sky.source.frame) return sky.source.frame.localSiderealDegrees(jd, lon);
  const p = sky.positionsAt(jd, 1, false);
  return wrap360((p?.meanSunSayana ?? 0) + 360 * pyMod(jd + lon / 360 + 0.5, 1) - 180);
}
const obliquity = (sky: Sky, jd: number) => sky.source.frame?.obliquityAt(jd) ?? 24;
const ascendant = (sky: Sky, jd: number, lat: number, lon: number) => lagnaAt(sky.source, jd, lat, lon);

/** The sidereal time (degrees) at which the ecliptic point `sayana` is rising, or null where it never rises. */
function ramcForAscendant(sayana: number, lat: number, eps: number): number | null {
  const lambda = sayana * RAD;
  const e = eps * RAD;
  const tanPhi = Math.tan(lat * RAD);
  const a = Math.cos(lambda);
  const b = Math.cos(e) * Math.sin(lambda);
  const r = Math.hypot(a, b);
  const delta = Math.atan2(b, a);
  const c = -tanPhi * Math.sin(e) * Math.sin(lambda);
  const ratio = c / r;
  if (Math.abs(ratio) > 1 || r === 0) return null;
  const spread = Math.acos(ratio);
  const facing = (t: number) => Math.cos(t) * Math.sin(lambda) - (Math.sin(t) * Math.cos(e) + tanPhi * Math.sin(e)) * Math.cos(lambda);
  const best = [delta + spread, delta - spread].reduce((x, y) => (facing(x) >= facing(y) ? x : y));
  return wrap360(best / RAD);
}

const signed = (d: number) => ((((d % 360) + 540) % 360) - 180);

/** The first instant after `jdFrom` at which the sidereal ascendant reaches `target` degrees. */
export function nextAscendantCrossing(sky: Sky, jdFrom: number, lat: number, lon: number, target: number): number | null {
  const T = wrap360(target);
  const p = sky.positionsAt(jdFrom, 1, false);
  if (!p) return null;
  const theta = ramcForAscendant(T + p.ayanamsha, lat, obliquity(sky, jdFrom));
  if (theta === null) return null;
  const rate = (sidereal(sky, jdFrom + 0.01, lon) - sidereal(sky, jdFrom, lon) + 360) % 360 * 100;
  const rateDay = rate > 0 ? rate : 360.9856;
  let t = jdFrom + pyMod(theta - sidereal(sky, jdFrom, lon), 360) / rateDay;
  for (let i = 0; i < 8; i += 1) {
    const a = ascendant(sky, t, lat, lon);
    const b = ascendant(sky, t + 1e-4, lat, lon);
    if (a === null || b === null) return null;
    const slope = signed(b - a) / 1e-4;
    if (!(slope > 0)) return null;
    const step = -signed(a - T) / slope;
    t += step;
    if (Math.abs(step) < 2e-8) break;
  }
  return t > jdFrom ? t : null;
}

const FALLBACK_SPAN_DAYS = 4 / 24;
export function nextLagnaBoundary(sky: Sky, jd: number, lat: number, lon: number): number {
  const asc = ascendant(sky, jd, lat, lon);
  if (asc === null) return jd + FALLBACK_SPAN_DAYS;
  const target = (Math.floor(asc / 30) + 1) * 30;
  return nextAscendantCrossing(sky, jd, lat, lon, target) ?? jd + FALLBACK_SPAN_DAYS;
}

export function lagnaBlock(sky: Sky, jd: number, lat: number, lon: number): Json | null {
  const asc = ascendant(sky, jd, lat, lon);
  if (asc === null) return null;
  const i = pyInt(asc / 30) % 12;
  return { number: i + 1, name: RASHI_NAMES[i], name_ne: RASHI_NAMES_NE[i], longitude: pyRound(asc, 6), degree_in_rashi: pyRound(pyMod(asc, 30), 4), anchor: "sunrise" };
}

// ---------------------------------------------------------------- lagna spans

const NAVAMSHA_DEG = 30 / 9;
const pushkaraDegrees = (rashi: number): [number, number] => {
  const [a, b] = [[7, 9], [3, 5], [6, 8], [1, 3]][(rashi - 1) % 4];
  return [(a - 1) * NAVAMSHA_DEG, (b - 1) * NAVAMSHA_DEG];
};
const dmsLabel = (deg: number) => {
  let d = pyInt(deg);
  let m = pyRoundInt((deg - d) * 60);
  if (m >= 60) {
    d += 1;
    m = 0;
  }
  return `${d}°${String(m).padStart(2, "0")}'`;
};

interface Span {
  number: number;
  start: number;
  end: number;
  row: Json;
}

function fromSunriseClocks(t: number, sunrise: number, zone: string) {
  let delta = secondsSince(t, sunrise);
  if (delta < 0) delta += 86400;
  const ghati = pyInt(Math.floor(delta / 1440));
  const rem = pyMod(delta, 1440) / 60;
  const pala = pyInt((rem * 60) / 24);
  const vipala = pyInt(pyMod(rem * 60, 24) * (60 / 24));
  const hours = pyInt(Math.floor(delta / 3600));
  const minutes = pyInt(Math.floor(pyMod(delta, 3600) / 60));
  const seconds = pyInt(pyMod(delta, 60));
  const p2 = (n: number) => String(n).padStart(2, "0");
  return { ghati: `${ghati}:${p2(pala)}:${p2(vipala)}`, hours: `${hours}:${p2(minutes)}:${p2(seconds)}`, local: wallIn(t, zone).hms };
}

/** `build_lagna_spans`: twelve lagna periods from sunrise, the twelfth stretched to the next sunrise. */
export function lagnaSpans(sky: Sky, sunrise: number, nextSunrise: number, place: Place): Span[] | null {
  const { latitude: lat, longitude: lon, timeZone: zone } = place;
  const spans: Span[] = [];
  let cursor = sunrise;
  for (let index = 0; index < 12; index += 1) {
    const asc = ascendant(sky, cursor, lat, lon);
    if (asc === null) return null;
    const i = pyInt(asc / 30) % 12;
    let end = index === 11 ? nextSunrise : Math.ceil((nextLagnaBoundary(sky, cursor, lat, lon) + 0.5) * 86400) / 86400 - 0.5;
    if (end <= cursor) end = addSeconds(cursor, 60);
    const s = fromSunriseClocks(cursor, sunrise, zone);
    const e = fromSunriseClocks(end, sunrise, zone);
    spans.push({
      number: i + 1,
      start: cursor,
      end,
      row: {
        number: i + 1,
        name: RASHI_NAMES[i],
        name_ne: RASHI_NAMES_NE[i],
        degree_in_rashi: pyRound(pyMod(asc, 30), 4),
        longitude: pyRound(asc, 6),
        start_time: utcIso(cursor),
        start_ghati_clock: s.ghati,
        start_hours_clock: s.hours,
        start_local_time: s.local,
        end_time: utcIso(end),
        end_ghati_clock: e.ghati,
        end_hours_clock: e.hours,
        end_local_time: e.local,
      },
    });
    cursor = end;
  }
  // Pushkara navamsha crossings inside each span.
  for (const span of spans) {
    const hits: Json[] = [];
    for (const deg of pushkaraDegrees(span.number)) {
      let at: number | null = null;
      if (span.end > span.start) {
        const a = ascendant(sky, span.start, lat, lon);
        const dStart = a === null ? 99 : pyMod(a, 30);
        if (Math.abs(dStart - deg) < 0.03 || (deg === 0 && dStart < 0.5)) at = span.start;
        else {
          const c = nextAscendantCrossing(sky, span.start, lat, lon, 30 * (span.number - 1) + deg);
          if (c !== null && c <= span.end + 5 / 86400) at = c;
        }
      }
      if (at === null) continue;
      const w = wallIn(at, zone);
      hits.push({ degree: pyRound(deg, 4), degree_dms: dmsLabel(deg), local_time: w.hms, local_time_short: w.hm });
    }
    span.row.pushkara_navamsha = hits;
  }
  return spans;
}

export const lagnaRows = (spans: Span[]): Json[] => spans.map((s) => s.row);

/** `build_udaya_lagna`: the lagna spans with short clock fields. */
export function udayaLagna(spans: Span[]): Json[] {
  const short = (t: unknown) => String(t).slice(0, 5);
  return spans.map(({ row: r }) => ({
    number: r.number,
    name: r.name,
    name_ne: r.name_ne,
    start_time: r.start_time,
    end_time: r.end_time,
    start_local_time: r.start_local_time,
    end_local_time: r.end_local_time,
    start_local_time_short: short(r.start_local_time),
    end_local_time_short: short(r.end_local_time),
    start_hours_clock: r.start_hours_clock,
    end_hours_clock: r.end_hours_clock,
    pushkara_navamsha: r.pushkara_navamsha ?? [],
  }));
}

const panchakaLabel = (rem: number): [string, string, boolean] =>
  rem === 1 ? ["Mrityu Panchaka", "मृत्यु पञ्चक", false] : rem === 2 ? ["Agni Panchaka", "अग्नि पञ्चक", false] : rem === 4 ? ["Raja Panchaka", "राज पञ्चक", false] : rem === 6 ? ["Chora Panchaka", "चोर पञ्चक", false] : rem === 8 ? ["Roga Panchaka", "रोग पञ्चक", false] : ["Shubha Muhurta", "शुभ मुहूर्त", true];

/** `build_panchaka_rahita`: (tithi + vaara + nakshatra + lagna) mod 9 per span, equal neighbours merged. */
export function panchakaRahita(sky: Sky, sunrise: number, spans: Span[], vaara: number, zone: string): Json[] {
  const merged: Json[] = [];
  const short = (t: string) => t.slice(0, 5);
  for (const span of spans) {
    const rem = (tithiInfo(sky, span.start).number + vaara + 1 + nakshatraAt(sky, span.start).number + span.number) % 9;
    const [en, ne, good] = panchakaLabel(rem);
    const s = fromSunriseClocks(span.start, sunrise, zone);
    const e = fromSunriseClocks(span.end, sunrise, zone);
    const last = merged[merged.length - 1];
    if (last && last.good === good && last.name_ne === ne) {
      last.end_time = utcIso(span.end);
      last.end_local_time = e.local;
      last.end_local_time_short = short(e.local);
      last.end_hours_clock = e.hours;
      continue;
    }
    merged.push({
      name: en,
      name_ne: ne,
      good,
      remainder: rem,
      start_time: utcIso(span.start),
      end_time: utcIso(span.end),
      start_local_time: s.local,
      end_local_time: e.local,
      start_local_time_short: short(s.local),
      end_local_time_short: short(e.local),
      start_hours_clock: s.hours,
      end_hours_clock: e.hours,
    });
  }
  return merged;
}
void karanaAt;
