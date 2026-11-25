// The day's blocks, written once for web and mobile (the shared calculation engine). Each follows the
// Rust server's builder of the same name (`panchanga::daily`, `blocks_time`), so a payload made here is
// the payload the server makes.
import { moonRiseSet } from "../../astronomy/moon-rise";
import { sunriseSunset, type PositionSource } from "../../astronomy/siddhanta-offline";
import type { Sky } from "../../astronomy/sky";
import { pyFloorDiv, pyInt, pyMod, pyRound, pyRoundInt } from "./py";
import { addSeconds, secondsSince, wallIn } from "./instant";
import {
  CHOGHADIYA,
  CHO_DAY_START,
  CHO_NIGHT_START,
  DAY_LORD,
  HORA_PLANETS,
  HORA_SEQUENCE,
  KARANA_NAMES,
  KARANA_NAMES_NE,
  NAKSHATRA_NAMES,
  NAKSHATRA_NAMES_NE,
  PHASE_NAMES,
  PHASE_NAMES_NE,
  RASHI_NAMES,
  RASHI_NAMES_NE,
  RITU,
  TITHI_NAMES,
  TITHI_NAMES_NE,
  VAARA_NAMES,
  VAARA_NAMES_NE,
  YOGA_NAMES,
  YOGA_NAMES_NE,
} from "./tables.generated";
import { utcIso } from "./instant";

export type Json = Record<string, unknown>;
export interface Place {
  latitude: number;
  longitude: number;
  timeZone: string;
}

const NAKSHATRA_SPAN = 360 / 27;
const PADA_SPAN = NAKSHATRA_SPAN / 4;
const SYNODIC_MONTH_DAYS = 29.530588853;
const SECONDS_IN_DAY = 86400;

export const nepaliDigits = (n: number | string) => String(n).replace(/[0-9]/g, (d) => "०१२३४५६७८९"[Number(d)]);

/** The Sun and Moon (sidereal, in the sky's own ayanamsha) at an instant. */
export function sunMoon(sky: Sky, jd: number): [number, number] {
  const p = sky.positionsAt(jd, 2, false);
  if (!p) throw new Error("no positions");
  return [p.longitude[0], p.longitude[1]];
}

// ---------------------------------------------------------------- the angas at an instant

export interface TithiInfo {
  number: number;
  paksha: "shukla" | "krishna";
  display: number;
  progress: number;
}
export function tithiInfo(sky: Sky, jd: number): TithiInfo {
  const [s, m] = sunMoon(sky, jd);
  const el = pyMod(m - s, 360);
  const number = pyInt(el / 12) + 1;
  return { number, paksha: number <= 15 ? "shukla" : "krishna", display: number <= 15 ? number : number - 15, progress: pyMod(el, 12) / 12 };
}
export const nakshatraAt = (sky: Sky, jd: number) => {
  const m = sunMoon(sky, jd)[1];
  const raw = m / NAKSHATRA_SPAN;
  return { number: (pyInt(raw) % 27) + 1, progress: pyMod(raw, 1), moon: m };
};
export const yogaAt = (sky: Sky, jd: number) => {
  const [s, m] = sunMoon(sky, jd);
  const raw = pyMod(s + m, 360) / NAKSHATRA_SPAN;
  return { number: (pyInt(raw) % 27) + 1, progress: pyMod(raw, 1) };
};
export const karanaAt = (sky: Sky, jd: number) => {
  const [s, m] = sunMoon(sky, jd);
  const el = pyMod(m - s, 360);
  return { number: pyInt(el / 6) + 1, progress: pyMod(el, 6) / 6 };
};
function karanaName(number: number): { name: string; ne: string } {
  const i = number - 1;
  const index = i === 0 ? 10 : i >= 57 ? 7 + (i - 57) : (i - 1) % 7;
  return { name: KARANA_NAMES[index], ne: KARANA_NAMES_NE[index] };
}
/** The weekday (0 = Sunday) on the zone's clock at an instant. */
export function varaAt(jd: number, timeZone: string): number {
  const w = wallIn(jd, timeZone);
  return (((w.jdn + 1) % 7) + 7) % 7;
}

// ---------------------------------------------------------------- boundaries of the angas

type Kind = "tithi" | "nakshatra" | "yoga" | "karana" | "moonRashi" | "pada";
const endOf = (sky: Sky, kind: Kind, jd: number): number => {
  const b = sky.nextBoundary(kind, jd);
  if (!b) throw new Error(`no ${kind} boundary`);
  return b.jd;
};
const startOf = (sky: Sky, kind: Kind, jd: number): number => {
  const b = sky.prevBoundary(kind, jd);
  if (!b) throw new Error(`no ${kind} boundary`);
  return b.jd;
};

// ---------------------------------------------------------------- clocks

type ShortClock = "nearest" | "truncated";
export function timeBlock(jd: number, zone: string, short: ShortClock): Json {
  const wall = wallIn(jd, zone);
  const shortHm = short === "nearest" ? wallIn(addSeconds(jd, 30), zone).hm : wall.hm;
  return { utc: utcIso(jd), local: wall.iso, local_time: wall.hms, local_time_short: shortHm };
}

interface FromSunrise {
  seconds: number;
  ghati: string;
  hours: string;
  local: string;
}
function fromSunrise(end: number, sunrise: number, zone: string): FromSunrise {
  let delta = secondsSince(end, sunrise);
  if (delta < 0) delta += 86400;
  const ghati = pyInt(pyFloorDiv(delta, 1440));
  const remMinutes = pyMod(delta, 1440) / 60;
  const pala = pyInt((remMinutes * 60) / 24);
  const vipala = pyInt(pyMod(remMinutes * 60, 24) * (60 / 24));
  const hours = pyInt(pyFloorDiv(delta, 3600));
  const minutes = pyInt(pyFloorDiv(pyMod(delta, 3600), 60));
  const seconds = pyInt(pyMod(delta, 60));
  const p2 = (n: number) => String(n).padStart(2, "0");
  return { seconds: pyRoundInt(delta), ghati: `${ghati}:${p2(pala)}:${p2(vipala)}`, hours: `${hours}:${p2(minutes)}:${p2(seconds)}`, local: wallIn(end, zone).hms };
}

export function dayLength(from: number, to: number): Json {
  const total = secondsSince(to, from);
  const ghadi = pyInt(pyFloorDiv(total, 1440));
  const remaining = pyMod(total, 1440);
  const pala = pyInt(pyFloorDiv(remaining, 24));
  const vipala = pyInt(pyMod(remaining, 24) * (60 / 24));
  const hours = pyInt(pyFloorDiv(total, 3600));
  const minutes = pyInt(pyFloorDiv(pyMod(total, 3600), 60));
  const seconds = pyInt(pyMod(total, 60));
  const p2 = (n: number) => String(n).padStart(2, "0");
  const ne = `${ghadi} घडी ${pala} पला`;
  const en = `${hours}hr ${minutes}min`;
  return {
    ghadi,
    pala,
    vipala,
    hours,
    minutes,
    seconds,
    total_minutes: pyRoundInt(total / 60),
    label_ne: ne,
    label_en: en,
    label_en_full: `${hours} Hours ${minutes} Mins ${p2(seconds)} Secs`,
    label_ne_full: `${hours} घण्टा ${minutes} मिनेट ${p2(seconds)} सेकेन्ड`,
    label_full_ne: `${ne} - ${en}`,
  };
}

// ---------------------------------------------------------------- anga blocks

interface Named {
  number: number;
  name: string;
  name_ne: string;
}

function endFields(target: Json, end: number, sunrise: number, zone: string): number {
  const f = fromSunrise(end, sunrise, zone);
  target.end_time = utcIso(end);
  target.end_ghati_clock = f.ghati;
  target.end_hours_clock = f.hours;
  target.end_local_time = f.local;
  return f.seconds;
}

function element(sunrise: number, zone: string, cur: Named, progress: number | null, span: [number, number], next: Named): Json {
  const s = fromSunrise(span[0], sunrise, zone);
  const block: Json = {
    number: cur.number,
    name: cur.name,
    name_ne: cur.name_ne,
    progress,
    start_time: utcIso(span[0]),
    start_ghati_clock: s.ghati,
    start_hours_clock: s.hours,
    start_local_time: s.local,
  };
  endFields(block, span[1], sunrise, zone);
  block.next = { number: next.number, name: next.name, name_ne: next.name_ne };
  return block;
}

const nextCyclic = (cur: number, size: number) => (cur >= size ? 1 : cur + 1);

function enrichNext(block: Json, end: number, sunrise: number, zone: string, findEnd: (jd: number) => number, third: (after: number, nextNumber: number) => Named): void {
  const nextEnd = findEnd(addSeconds(end, 90));
  const next = block.next as Json;
  const nextNumber = next.number as number;
  if (endFields(next, nextEnd, sunrise, zone) >= SECONDS_IN_DAY) return;
  const after = addSeconds(nextEnd, 90);
  const named = third(after, nextNumber);
  const t: Json = { number: named.number, name: named.name, name_ne: named.name_ne };
  endFields(t, findEnd(after), sunrise, zone);
  next.next = t;
}

const tithiNamed = (t: TithiInfo): Named => ({
  number: t.number,
  name: t.display === 15 ? (t.paksha === "shukla" ? "Purnima" : "Aausi") : TITHI_NAMES[t.display - 1],
  name_ne: t.display === 15 ? (t.paksha === "shukla" ? "पूर्णिमा" : "औंसी") : TITHI_NAMES_NE[t.display - 1],
});
const starNamed = (n: number, names: readonly string[], ne: readonly string[]): Named => ({ number: n, name: names[n - 1], name_ne: ne[n - 1] });

export function tithiBlock(sky: Sky, at: number, origin: number, zone: string, info: TithiInfo): Json {
  const start = startOf(sky, "tithi", at);
  const end = endOf(sky, "tithi", at);
  const next = tithiInfo(sky, addSeconds(end, 90));
  const block = element(origin, zone, tithiNamed(info), pyRound(info.progress, 4), [start, end], tithiNamed(next));
  enrichNext(block, end, origin, zone, (t) => endOf(sky, "tithi", t), (after) => tithiNamed(tithiInfo(sky, after)));
  return block;
}

export function nakshatraBlock(sky: Sky, at: number, origin: number, zone: string): Json {
  const nak = nakshatraAt(sky, at);
  const pada = Math.min(pyInt(pyMod(nak.moon, NAKSHATRA_SPAN) / PADA_SPAN) + 1, 4);
  const start = startOf(sky, "nakshatra", at);
  const end = endOf(sky, "nakshatra", at);
  const block = element(origin, zone, starNamed(nak.number, NAKSHATRA_NAMES, NAKSHATRA_NAMES_NE), pyRound(nak.progress, 4), [start, end], starNamed(nextCyclic(nak.number, 27), NAKSHATRA_NAMES, NAKSHATRA_NAMES_NE));
  block.pada = pada;
  enrichNext(block, end, origin, zone, (t) => endOf(sky, "nakshatra", t), (_a, n) => starNamed(nextCyclic(n, 27), NAKSHATRA_NAMES, NAKSHATRA_NAMES_NE));
  return block;
}

export function yogaBlock(sky: Sky, at: number, origin: number, zone: string): Json {
  const y = yogaAt(sky, at);
  const start = startOf(sky, "yoga", at);
  const end = endOf(sky, "yoga", at);
  const block = element(origin, zone, starNamed(y.number, YOGA_NAMES, YOGA_NAMES_NE), pyRound(y.progress, 4), [start, end], starNamed(nextCyclic(y.number, 27), YOGA_NAMES, YOGA_NAMES_NE));
  enrichNext(block, end, origin, zone, (t) => endOf(sky, "yoga", t), (_a, n) => starNamed(nextCyclic(n, 27), YOGA_NAMES, YOGA_NAMES_NE));
  return block;
}

const karanaNamed = (sky: Sky, jd: number): Named => {
  const k = karanaAt(sky, jd);
  const n = karanaName(k.number);
  return { number: k.number, name: n.name, name_ne: n.ne };
};
export function karanaBlock(sky: Sky, at: number, origin: number, zone: string): Json {
  const start = startOf(sky, "karana", at);
  const end = endOf(sky, "karana", at);
  const next = karanaNamed(sky, addSeconds(end, 90));
  const block = element(origin, zone, karanaNamed(sky, at), null, [start, end], next);
  endFields(block.next as Json, endOf(sky, "karana", addSeconds(end, 90)), origin, zone);
  return block;
}

export function rashiPayload(longitude: number): Json {
  const index = pyInt(longitude / 30) % 12;
  return { number: index + 1, name: RASHI_NAMES[index], name_ne: RASHI_NAMES_NE[index], longitude: pyRound(longitude, 6), progress: pyRound(pyMod(longitude, 30) / 30, 4) };
}

export function moonPhase(sky: Sky, jd: number): Json {
  const [sun, moon] = sunMoon(sky, jd);
  const elongation = pyMod(moon - sun, 360);
  const index = pyInt(pyFloorDiv(pyMod(elongation + 22.5, 360), 45));
  const d = pyMod(moon - sun, 360);
  const el = Math.abs(d > 180 ? d - 360 : d);
  const phaseAngle = 180 - el;
  const lit = (1 - Math.cos((el * Math.PI) / 180)) / 2;
  return {
    elongation: pyRound(elongation, 6),
    phase_index: index,
    name: PHASE_NAMES[index],
    name_ne: PHASE_NAMES_NE[index],
    illuminated_fraction: pyRound(lit, 6),
    phase_angle: pyRound(phaseAngle, 6),
    is_waxing: elongation < 180,
    age_days: pyRound((elongation / 360) * SYNODIC_MONTH_DAYS, 4),
  };
}

function attachEnd(span: Json, end: number, sunrise: number, dayEnd: number, zone: string): void {
  if (end >= dayEnd) return;
  const f = fromSunrise(end, sunrise, zone);
  span.end_time = utcIso(end);
  span.end_local_time = f.local;
  span.end_local_time_short = f.local.slice(0, 5);
  span.end_hours_clock = f.hours;
  span.end_ghati_clock = f.ghati;
}

export function chandraRashiSpans(sky: Sky, sunrise: number, nextSunrise: number, zone: string): Json[] {
  const spans: Json[] = [];
  let cursor = sunrise;
  while (cursor < nextSunrise && spans.length < 4) {
    const index = pyInt(sunMoon(sky, cursor)[1] / 30) % 12;
    const end = Math.min(endOf(sky, "moonRashi", cursor), nextSunrise);
    const span: Json = { number: index + 1, name: RASHI_NAMES[index], name_ne: RASHI_NAMES_NE[index] };
    attachEnd(span, end, sunrise, nextSunrise, zone);
    spans.push(span);
    if (end >= nextSunrise) break;
    cursor = addSeconds(end, 90);
  }
  return spans;
}

export function nakshatraPadaSpans(sky: Sky, sunrise: number, nextSunrise: number, zone: string): Json[] {
  const spans: Json[] = [];
  let cursor = sunrise;
  while (cursor < nextSunrise && spans.length < 8) {
    const moon = sunMoon(sky, cursor)[1];
    let number = pyInt(moon / NAKSHATRA_SPAN) + 1;
    if (number > 27) number = 1;
    const pada = Math.min(pyInt(pyMod(moon, NAKSHATRA_SPAN) / PADA_SPAN) + 1, 4);
    const end = Math.min(endOf(sky, "pada", cursor), nextSunrise);
    const span: Json = { nakshatra_number: number, nakshatra_name: NAKSHATRA_NAMES[number - 1], nakshatra_name_ne: NAKSHATRA_NAMES_NE[number - 1], pada, pada_ne: nepaliDigits(pada) };
    attachEnd(span, end, sunrise, nextSunrise, zone);
    spans.push(span);
    if (end >= nextSunrise) break;
    cursor = addSeconds(end, 90);
  }
  return spans;
}

export function suryaNakshatra(sunLongitude: number): Json {
  let number = pyInt(sunLongitude / NAKSHATRA_SPAN) + 1;
  if (number > 27) number = 1;
  return { number, name: NAKSHATRA_NAMES[number - 1], name_ne: NAKSHATRA_NAMES_NE[number - 1] };
}

// ---------------------------------------------------------------- seasons and ayana

const sunRashiNumber = (lon: number) => (pyInt(Math.floor(lon / 30)) % 12) + 1;

function rituFrom(lon: number, lat: number, basis: string): Json {
  const slot = pyInt(pyFloorDiv(pyMod(lon - 330, 360), 60));
  const i = lat < 0 ? (slot + 3) % 6 : slot;
  const [number, name, sanskrit, ne, season] = RITU[i];
  return { number, name, name_sanskrit: sanskrit, name_ne: ne, season, solar_slot: slot, sun_rashi: sunRashiNumber(lon), basis };
}
function ayanaFrom(lon: number, basis: string): Json {
  const uttara = !(lon >= 90 && lon < 270);
  return {
    name: uttara ? "Uttarayana" : "Dakshinayana",
    name_ne: uttara ? "उत्तरायण" : "दक्षिणायण",
    name_sanskrit: uttara ? "Uttarayana" : "Dakshinayana",
    sun_rashi: sunRashiNumber(lon),
    basis,
    kranti_mark: uttara ? "उ" : "द",
  };
}
/** The tropical Sun: the sidereal Sun plus the system's own ayanamsha (the text's ayana-chalana for Surya). */
export function tropicalSun(sky: Sky, jd: number): number {
  const p = sky.positionsAt(jd, 1, false);
  if (!p) throw new Error("no positions");
  return pyMod(p.longitude[0] + p.ayanamsha, 360);
}
export const rituAt = (sky: Sky, jd: number, lat: number) => rituFrom(tropicalSun(sky, jd), lat, lat < 0 ? "tropical_southern" : "tropical");
export const rituVedic = (sky: Sky, jd: number, lat: number) => rituFrom(pyMod(sunMoon(sky, jd)[0], 360), lat, "sidereal");
export const aayan = (sky: Sky, jd: number) => ayanaFrom(tropicalSun(sky, jd), "tropical");
export const aayanVedic = (sky: Sky, jd: number) => ayanaFrom(pyMod(sunMoon(sky, jd)[0], 360), "sidereal");

// ---------------------------------------------------------------- sun and moon of the day

export interface DayTimes {
  sunrise: number;
  sunset: number;
  nextSunrise: number;
  moonrise: number | null;
  moonset: number | null;
}

/** Whole seconds, as the server prints a rise or set. */
const wholeSeconds = (jd: number) => Math.floor((jd + 0.5) * 86400) / 86400 - 0.5;

/** The day's own sunrise and sunset (whole seconds), or null where the Sun does not rise or set. */
export function sunTimes(sky: Sky, civilJdn: number, place: Place): { sunrise: number; sunset: number } | null {
  const today = sunriseSunset(sky.source, civilJdn - 0.5, place.latitude, place.longitude);
  if (today.sunriseJd === null || today.sunsetJd === null) return null;
  return { sunrise: wholeSeconds(today.sunriseJd), sunset: wholeSeconds(today.sunsetJd) };
}

/** Sunrise, sunset, the next sunrise and the Moon's rise and set that fall between sunrises. */
export function dayTimes(sky: Sky, civilJdn: number, place: Place): DayTimes | null {
  const source: PositionSource = sky.source;
  const dayStart = civilJdn - 0.5;
  const today = sunriseSunset(source, dayStart, place.latitude, place.longitude);
  const tomorrow = sunriseSunset(source, dayStart + 1, place.latitude, place.longitude);
  if (today.sunriseJd === null || today.sunsetJd === null || tomorrow.sunriseJd === null) return null;
  const sunrise = wholeSeconds(today.sunriseJd);
  const nextSunrise = wholeSeconds(tomorrow.sunriseJd);
  const moon = moonRiseSet(source, sunrise, place.latitude, place.longitude);
  return {
    sunrise,
    sunset: wholeSeconds(today.sunsetJd),
    nextSunrise,
    moonrise: moon.rise !== null && moon.rise < nextSunrise ? wholeSeconds(moon.rise) : null,
    moonset: moon.set !== null && moon.set < nextSunrise ? wholeSeconds(moon.set) : null,
  };
}
export { wholeSeconds, VAARA_NAMES, VAARA_NAMES_NE };

// ---------------------------------------------------------------- choghadiya and hora

/** `build_choghadiya`: eight day and eight night segments in ghati coordinates. */
export function choghadiya(dayGhati: number, vaara: number): Json[] {
  const dSeg = dayGhati / 8;
  const nSeg = (60 - dayGhati) / 8;
  const dow = vaara % 7;
  const seg = (c: readonly [string, string, string, string, boolean], start: number, end: number, phase: string): Json => ({
    name_ne: c[0],
    name_en: c[1],
    name: c[1],
    quality_ne: c[2],
    quality_en: c[3],
    start_g: start,
    end_g: end,
    bad: c[4],
    phase,
  });
  const out: Json[] = [];
  for (let i = 0; i < 8; i += 1) out.push(seg(CHOGHADIYA[(CHO_DAY_START[dow] + i) % 7], i * dSeg, (i + 1) * dSeg, "day"));
  for (let i = 0; i < 8; i += 1) out.push(seg(CHOGHADIYA[(CHO_NIGHT_START[dow] + 5 * i) % 7], dayGhati + i * nSeg, dayGhati + (i + 1) * nSeg, "night"));
  return out;
}

function horaLord(vaara: number, index: number): string {
  const start = Math.max(0, HORA_SEQUENCE.indexOf(DAY_LORD[vaara % 7]));
  return HORA_SEQUENCE[(start + index) % 7];
}

/** `build_hora`: twelve day and twelve night slots. */
export function hora(sunrise: number, sunset: number, nextSunrise: number, vaara: number, zone: string): Json[] {
  const dayS = secondsSince(sunset, sunrise);
  const nightS = secondsSince(nextSunrise, sunset);
  const dayGhati = Math.min((dayS / (dayS + nightS)) * 60, 60);
  const [dayHora, nightHora] = [dayS / 12, nightS / 12];
  const [dayG, nightG] = [dayGhati / 12, (60 - dayGhati) / 12];
  const slot = (index: number, night: boolean, planet: string, start: number, end: number, sg: number, eg: number): Json => {
    const row = HORA_PLANETS.find((p) => p[0] === planet) ?? HORA_PLANETS[0];
    const bad = row[3];
    return {
      index,
      phase: night ? "night" : "day",
      phase_ne: night ? "रात" : "दिन",
      planet,
      planet_ne: row[1],
      planet_en: row[2],
      quality_ne: bad ? "अशुभ" : "शुभ",
      tone: bad ? "bad" : "good",
      bad,
      start_local_time_short: wallIn(start, zone).hm,
      end_local_time_short: wallIn(end, zone).hm,
      start_g: pyRound(sg, 4),
      end_g: pyRound(eg, 4),
    };
  };
  const out: Json[] = [];
  for (let i = 0; i < 12; i += 1) out.push(slot(i + 1, false, horaLord(vaara, i), addSeconds(sunrise, i * dayHora), addSeconds(sunrise, (i + 1) * dayHora), i * dayG, (i + 1) * dayG));
  for (let i = 0; i < 12; i += 1) out.push(slot(i + 1, true, horaLord(vaara, 12 + i), addSeconds(sunset, i * nightHora), addSeconds(sunset, (i + 1) * nightHora), dayGhati + i * nightG, dayGhati + (i + 1) * nightG));
  return out;
}
