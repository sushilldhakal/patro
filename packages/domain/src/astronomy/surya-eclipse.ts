// Eclipses by the Surya Siddhanta (Burgess, chapters IV and V), made on the client from the text's own
// arithmetic (`surya-formulas`), as the Rust server does (`astronomy::surya_siddhanta::eclipse`). The
// ayana-chalana is added only for the horizon work (altitude, the nonagesimal), as the text does.
import { ayanamshaAt, wrap360 } from "./siddhanta-offline";
import { suryaLongitude, suryaMeanDailyMotion, suryaMeanSun, suryaMoonLatitudeMinutes } from "./surya-formulas";
import { utcOffsetMinutes } from "./lunar-month";
import { isoLocal } from "./sky-month";

const RAD = Math.PI / 180;
const OBLIQUITY = 24;
const SUN_DIAMETER = 6500;
const MOON_DIAMETER = 480;
const EARTH_DIAMETER = 1600;
const MOON_ORBIT = 324_000;
const SUN_ORBIT = 4_331_500;
const YOJANAS_PER_MINUTE = 15;
const MAX_LUNATIONS = 48;
const SYNODIC_DAYS = 29.530588;

const wrap = wrap360;
const signed = (d: number) => wrap(d + 180) - 180;
const pyMod = (x: number, m: number) => ((x % m) + m) % m;

/** Longitude and central-difference speed (degrees per day) of the Sun or the Moon. */
function lonSpeed(body: "sun" | "moon", jd: number): [number, number] {
  const lon = suryaLongitude(body, jd);
  return [lon, signed(suryaLongitude(body, jd + 0.5) - suryaLongitude(body, jd - 0.5))];
}

const elongation = (jd: number) => wrap(suryaLongitude("moon", jd) - suryaLongitude("sun", jd));

/** The next moment after `jd` at which the elongation equals `target` (0 new, 180 full). */
function nextSyzygy(jd: number, target: number): number {
  let ahead = pyMod(target - elongation(jd), 360);
  if (ahead < 1e-6) ahead = 360;
  let t = jd + ahead / (360 / SYNODIC_DAYS);
  for (let i = 0; i < 8; i += 1) {
    const step = signed(target - elongation(t)) / (lonSpeed("moon", t)[1] - lonSpeed("sun", t)[1]);
    t += step;
    if (Math.abs(step) < 1e-7) break;
  }
  return t;
}

interface Measures {
  sun: number;
  moon: number;
  shadow: number;
  relative: number;
  parallax: number;
}

function measures(jd: number): Measures {
  const moonSpeed = lonSpeed("moon", jd)[1];
  const sunSpeed = lonSpeed("sun", jd)[1];
  const moonRatio = moonSpeed / suryaMeanDailyMotion("moon");
  const sunRatio = sunSpeed / suryaMeanDailyMotion("sun");
  const sunY = SUN_DIAMETER * sunRatio;
  const moonY = MOON_DIAMETER * moonRatio;
  const suchi = EARTH_DIAMETER * moonRatio;
  const shadowY = suchi - ((sunY - EARTH_DIAMETER) * MOON_DIAMETER) / SUN_DIAMETER;
  const relative = (moonSpeed - sunSpeed) * 60;
  return {
    sun: ((sunY * MOON_ORBIT) / SUN_ORBIT) / YOJANAS_PER_MINUTE,
    moon: moonY / YOJANAS_PER_MINUTE,
    shadow: shadowY / YOJANAS_PER_MINUTE,
    relative,
    parallax: relative / YOJANAS_PER_MINUTE,
  };
}

/** Half-duration in days for a contact at `reach` minutes, refined three times (IV.12-13). */
function halfDuration(middle: number, reach: number, relative: number, latitudeAt: (jd: number) => number, before: boolean): number | null {
  const contact = (half: number) => (before ? middle - half : middle + half);
  let latitude = latitudeAt(middle);
  if (Math.abs(latitude) >= reach) return null;
  let half = Math.sqrt(reach * reach - latitude * latitude) / relative;
  for (let i = 0; i < 3; i += 1) {
    latitude = latitudeAt(contact(half));
    if (Math.abs(latitude) >= reach) return half;
    half = Math.sqrt(reach * reach - latitude * latitude) / relative;
  }
  return half;
}

function contacts(middle: number, reach: number, relative: number, latitudeAt: (jd: number) => number): [number, number] | null {
  const b = halfDuration(middle, reach, relative, latitudeAt, true);
  const a = halfDuration(middle, reach, relative, latitudeAt, false);
  return b === null || a === null ? null : [middle - b, middle + a];
}

export type EclipseType = "total" | "annular" | "partial";

function lunarAt(full: number): { type: EclipseType; partial: [number, number] | null } | null {
  const m = measures(full);
  const latitude = suryaMoonLatitudeMinutes(full);
  const halfSum = (m.shadow + m.moon) / 2;
  if (Math.abs(latitude) >= halfSum) return null;
  const eclipsed = halfSum - Math.abs(latitude);
  return { type: eclipsed >= m.moon ? "total" : "partial", partial: contacts(full, halfSum, m.relative, suryaMoonLatitudeMinutes) };
}

function solarGlobal(newMoon: number): { type: EclipseType } | null {
  const m = measures(newMoon);
  const latitude = suryaMoonLatitudeMinutes(newMoon);
  if (Math.abs(latitude) >= (m.sun + m.moon) / 2 + m.parallax) return null;
  const central = Math.abs(latitude) < m.parallax;
  return { type: central ? (m.moon >= m.sun ? "total" : "annular") : "partial" };
}

const meanSunSayana = (jd: number) => wrap(suryaMeanSun(jd) + ayanamshaAt(jd));
const localSidereal = (jd: number, lon: number) => wrap(meanSunSayana(jd) + 360 * pyMod(jd + lon / 360 + 0.5, 1) - 180);

function ascendantSayana(jd: number, lat: number, lon: number): number {
  const ramc = localSidereal(jd, lon) * RAD;
  const eps = OBLIQUITY * RAD;
  return wrap((Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat * RAD) * Math.sin(eps))) * 180) / Math.PI);
}

/** Geometric altitude, degrees, of the Sun's or the Moon's centre. */
function altitude(body: "sun" | "moon", jd: number, lat: number, lon: number): number {
  const lam = (suryaLongitude(body, jd) + ayanamshaAt(jd)) * RAD;
  const beta = (body === "moon" ? suryaMoonLatitudeMinutes(jd) / 60 : 0) * RAD;
  const eps = OBLIQUITY * RAD;
  const ra = wrap((Math.atan2(Math.sin(lam) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps), Math.cos(lam)) * 180) / Math.PI);
  const dec = Math.asin(Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lam));
  const hour = (localSidereal(jd, lon) - ra) * RAD;
  const phi = lat * RAD;
  return (Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hour)) * 180) / Math.PI;
}

/** (parallax in longitude, in latitude) of the Moon, minutes, from the nonagesimal (V.9). */
function nonagesimalParallax(jd: number, lat: number, lon: number, relative: number): [number, number] {
  const p = relative / YOJANAS_PER_MINUTE;
  const nonagesimal = wrap(ascendantSayana(jd, lat, lon) - 90);
  const sunSayana = wrap(suryaLongitude("sun", jd) + ayanamshaAt(jd));
  const hour = (localSidereal(jd, lon) - 270) * RAD;
  const phi = lat * RAD;
  const dec = (90 - OBLIQUITY) * RAD;
  const poleAltitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hour));
  return [p * Math.cos(poleAltitude) * Math.sin((sunSayana - nonagesimal) * RAD), -p * Math.sin(poleAltitude)];
}

function solarLocal(newMoon: number, lat: number, lon: number): { visible: boolean; begin: number | null; end: number | null } | null {
  const m = measures(newMoon);
  let middle = newMoon;
  for (let i = 0; i < 4; i += 1) middle = newMoon - nonagesimalParallax(middle, lat, lon, m.relative)[0] / m.relative;
  const apparent = (t: number) => suryaMoonLatitudeMinutes(t) + nonagesimalParallax(t, lat, lon, m.relative)[1];
  const halfSum = (m.sun + m.moon) / 2;
  const atMiddle = apparent(middle);
  const sunUp = altitude("sun", middle, lat, lon) > 0;
  if (Math.abs(atMiddle) >= halfSum) return null;
  const before = halfDuration(middle, halfSum, m.relative, apparent, true);
  const after = halfDuration(middle, halfSum, m.relative, apparent, false);
  return { visible: sunUp, begin: before === null ? null : middle - before, end: after === null ? null : middle + after };
}

export interface EclipseEvent {
  kind: "solar" | "lunar";
  type: EclipseType;
  type_ne: string;
  type_en: string;
  max_utc: string;
  max_local: string;
  date_jd: number;
  visible: boolean;
  begin_local: string | null;
  end_local: string | null;
  penumbral_begin_local: null;
  penumbral_end_local: null;
}

const NAMES: Record<string, [string, string]> = {
  "solar total": ["पूर्ण सूर्यग्रहण", "Total solar eclipse"],
  "solar annular": ["वलयाकार सूर्यग्रहण", "Annular solar eclipse"],
  "solar partial": ["आंशिक सूर्यग्रहण", "Partial solar eclipse"],
  "lunar total": ["पूर्ण चन्द्रग्रहण", "Total lunar eclipse"],
  "lunar partial": ["आंशिक चन्द्रग्रहण", "Partial lunar eclipse"],
};

/**
 * The eclipses of one kind whose middle falls in `[startJd, endJd]`, seen from a place
 * (`jyotish::graha_detail::eclipse_span`). Null before 1582, where the server prints another calendar.
 */
export function suryaEclipseSpan(
  startJd: number,
  endJd: number,
  kind: "solar" | "lunar",
  place: { latitude: number; longitude: number; timeZone: string },
): { kind: string; range_start_jd: number; range_end_jd: number; events: EclipseEvent[] } | null {
  if (startJd < 2299160.5) return null;
  const solar = kind === "solar";
  const scanEnd = endJd + 1;
  const offset = (jd: number) => utcOffsetMinutes(place.timeZone, jd);
  const local = (jd: number | null) => (jd === null || jd === 0 ? null : isoLocal(jd, offset(jd)));
  const events: EclipseEvent[] = [];
  let cursor = startJd;
  for (let guard = 0; cursor < scanEnd && guard < 60; guard += 1) {
    let t = cursor;
    let found: { type: EclipseType; partial?: [number, number] | null } | null = null;
    for (let i = 0; i < MAX_LUNATIONS && !found; i += 1) {
      t = nextSyzygy(t, solar ? 0 : 180);
      found = solar ? solarGlobal(t) : lunarAt(t);
      if (!found) t += 1;
    }
    if (!found) break;
    const max = t;
    if (max >= scanEnd) break;
    let visible: boolean;
    let begin: number | null;
    let end: number | null;
    if (solar) {
      const seen = solarLocal(max, place.latitude, place.longitude);
      visible = !!seen?.visible;
      begin = seen?.begin ?? null;
      end = seen?.end ?? null;
    } else {
      visible = altitude("moon", max, place.latitude, place.longitude) > 0;
      begin = found.partial?.[0] ?? null;
      end = found.partial?.[1] ?? null;
    }
    const [ne, en] = NAMES[`${kind} ${found.type === "total" ? "total" : found.type === "annular" ? "annular" : "partial"}`] ?? NAMES[`${kind} partial`];
    const off = offset(max);
    events.push({
      kind,
      type: found.type,
      type_ne: ne,
      type_en: en,
      max_utc: isoLocal(max, 0),
      max_local: isoLocal(max, off),
      date_jd: Math.floor(max + 0.5 + off / 1440) - 0.5,
      visible,
      begin_local: local(begin),
      end_local: local(end),
      penumbral_begin_local: null,
      penumbral_end_local: null,
    });
    cursor = max + 10;
  }
  return { kind, range_start_jd: startJd, range_end_jd: endJd, events };
}
