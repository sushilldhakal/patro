/**
 * The kundali routes made on the device (apps/rust `handlers/kundali.rs` over `jyotish`):
 * `/planetary/positions`, `/kundali/vimshottari`, `/kundali/dasha/expand`. Each takes the birth
 * instant as a Julian Day (UT) and the place it is read at, and answers the server's shape.
 */
import type { Sky } from "../../astronomy/sky";
import { instantLagna, planetsWithExtras } from "../../panchanga/engine/at-time";
import { moonPhase } from "../../panchanga/engine/blocks";
import { locationBlock, type DayInput } from "../../panchanga/engine/day";
import { eraLanguage } from "../../panchanga/engine/era-render";
import { pyRound } from "../../panchanga/engine/py";
import { utcIso, wallIn } from "../../panchanga/engine/instant";
import { suryaLongitude } from "../../astronomy/surya-formulas";
import { localInstant } from "../../panchanga/engine/midnight";
import { bsToJdn, civilJdn, FIRST_DEVICE_JDN } from "../../astronomy/lunar-month";
import { shadbala } from "./shadbala-engine";
import { parseIso, usFromJd, vimshottariPayload } from "./vimshottari-engine";

type Json = Record<string, unknown>;
/** Where the chart is read: the place block the server echoes. */
export type KundaliPlace = Omit<DayInput, "year" | "month" | "day">;
/** The era the request was written in, echoed with its language as the server does. */
export interface KundaliEcho {
  era?: string;
  language?: string;
}

/** How a kundali request names its moment (`instant_for_request`): a Julian Day or era parts with a clock, or a `datetime`. */
export interface KundaliMoment {
  jd?: number;
  clock?: string;
  datetime?: string;
  era?: string;
  year?: number;
  month?: number;
  day?: number;
}

const clockSeconds = (clock: string): number | null => {
  const m = /^(\d{1,2}):(\d\d)(?::(\d\d))?$/.exec(clock.trim());
  if (!m) return null;
  const [h, mi, s] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
  return h > 23 || mi > 59 || s > 59 ? null : h * 3600 + mi * 60 + s;
};

/** The moment as a Julian Day (UT): a clock on the place's wall, or a `datetime` (its own offset, else the place's). Null for the server. */
export function momentJd(q: KundaliMoment, timeZone: string): number | null {
  if (q.datetime) {
    const text = q.datetime.trim();
    const parsed = parseIso(text);
    if (!parsed) return null;
    const hasOffset = /(Z|[+-]\d\d:\d\d(:\d\d)?)$/.test(text) && text.includes("T");
    const jdOfUs = (us: number) => us / 86_400_000_000 + 2440587.5;
    if (hasOffset) return jdOfUs(parsed.us);
    const wall = jdOfUs(parsed.us); // read as UTC: the wall clock as a day count
    const jdn = Math.floor(wall + 0.5);
    return jdn < FIRST_DEVICE_JDN ? null : localInstant(jdn, Math.round((wall + 0.5 - jdn) * 86400), timeZone);
  }
  if (!q.clock) return null;
  const seconds = clockSeconds(q.clock);
  if (seconds === null) return null;
  let jdn: number | null = null;
  if (q.jd !== undefined) jdn = Math.floor(q.jd + 0.5);
  else if (q.year !== undefined && q.month !== undefined && q.day !== undefined) {
    if (q.era === "bs") jdn = bsToJdn(q.year, q.month, q.day);
    else if (q.era === "ad" || q.era === undefined) jdn = civilJdn(q.year, q.month, q.day);
  }
  if (jdn === null || jdn < FIRST_DEVICE_JDN) return null;
  return localInstant(jdn, seconds, timeZone);
}

const ayanamshaKey = (sky: Sky) => (sky.system === "surya" ? "surya_siddhanta" : "lahiri");
const echo = (q: KundaliEcho): Json => (q.era ? { era: q.era, language: q.language ?? eraLanguage(q.era) } : {});
const placeBlock = (place: KundaliPlace) => locationBlock({ ...place, year: 0, month: 0, day: 0 } as DayInput);

/** `/planetary/positions`: the nine grahas and the lagna at an instant. */
export function planetaryPositions(sky: Sky, jd: number, place: KundaliPlace, q: KundaliEcho = {}): Json | null {
  const lagna = instantLagna(sky, jd, place.latitude, place.longitude);
  if (!lagna) return null;
  return {
    planets: planetsWithExtras(sky, jd),
    lagna,
    moon_phase: moonPhase(sky, jd),
    anchor: "instant",
    computed_at: utcIso(jd),
    ayanamsha: ayanamshaKey(sky),
    location: placeBlock(place),
    query_instant: wallIn(jd, place.timeZone).iso,
    ...echo(q),
  };
}

/** `/kundali/vimshottari`: the mahadasha sequence from the birth Moon (`cycles` 1 to 3). */
export function vimshottari(sky: Sky, jd: number, place: KundaliPlace, cycles: number, q: KundaliEcho = {}): Json | null {
  if (!Number.isInteger(cycles) || cycles < 1 || cycles > 3) return null;
  // A dasha date moves ~1.8 h per arcsecond of Moon: read the text's own formula, not the fitted sky.
  const p = sky.system === "surya" ? null : sky.positionsAt(jd, 2, false);
  if (sky.system !== "surya" && !p) return null;
  const moon = p ? p.longitude[1] : suryaLongitude("moon", jd);
  return {
    ayanamsha: "surya_siddhanta",
    moon_longitude: pyRound(moon, 6),
    location: placeBlock(place),
    query_instant: wallIn(jd, place.timeZone).iso,
    ...vimshottariPayload(moon, usFromJd(jd), cycles),
    ...echo(q),
  };
}

/** `/shadbala`: sixfold strength at an instant. */
export function shadbalaRoute(sky: Sky, jd: number, place: KundaliPlace, q: KundaliEcho = {}): Json | null {
  const payload = shadbala(sky, jd, place);
  return payload && { ...payload, location: placeBlock(place), query_instant: wallIn(jd, place.timeZone).iso, ...echo(q) };
}

export { dashaExpand } from "./vimshottari-engine";
