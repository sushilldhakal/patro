// Muhurta windows of the ceremonies a day route times (`patro::sait::ceremony_windows`): half-hour scan
// from sunrise, each instant judged against the ceremony's rules, edges refined to a second.
import { civilFromJdn, utcOffsetMinutes } from "../astronomy/lunar-month";
import { lagnaAt } from "../astronomy/siddhanta-offline";
import type { Sky } from "../astronomy/sky";
import { nextEclipseMax } from "../astronomy/surya-eclipse";
import { dayTimes, karanaAt, nakshatraAt, sunMoon, tithiInfo, varaAt, yogaAt, type Place } from "../panchanga/engine/blocks";
import { lunarCalendarBlock } from "../panchanga/engine/calendar-blocks";
import { pyMod, pyRound } from "../panchanga/engine/py";
import { KARANA_NAMES } from "../panchanga/engine/tables.generated";
import { CEREMONY_RULES } from "./ceremony-rules.generated";
import type { CeremonyWindows } from "./festival-saits";

type Rules = typeof CEREMONY_RULES;
/** A ceremony rule: the generated lists as plain arrays. */
type Rule = { [K in keyof Rules["vivah"]]: Rules["vivah"][K] extends readonly (infer T)[] ? readonly (T extends number ? number : string)[] : Rules["vivah"][K] extends boolean ? boolean : Rules["vivah"][K] extends number ? number : string };
const STEP = (30 * 60) / 86400;
const MIN_WINDOW = (5 * 60) / 86400;
const REFINE_TOLERANCE = 1 / 86400;
const CHATURMAS = ["Shrawan", "Bhadra", "Ashwin", "Kartik"];
const SHUNYA: Record<number, number[]> = { 1: [7, 10], 2: [9, 12], 3: [5, 10], 5: [3, 6], 7: [4, 9], 9: [4, 5], 11: [9, 12], 13: [2, 12] };
const DUR_MUHURTA = [[13], [11, 8], [3, 21], [7], [11, 5], [8, 3], [1, 15]];
const RIKTA = [4, 9, 14];
const stable = (v: number) => pyRound(pyRound(v, 9), 6);
const rashiOf = (lon: number) => ((Math.floor(lon / 30) % 12) + 12) % 12 + 1;
const has = (list: readonly (number | string)[], v: number | string | null | undefined) => v !== null && v !== undefined && list.includes(v);

/** Body index in the sky's order: sun, moon, mars, mercury, jupiter, venus, saturn, rahu. */
const BODY = { sun: 0, moon: 1, mars: 2, mercury: 3, jupiter: 4, venus: 5, saturn: 6, rahu: 7 } as const;
function lon(sky: Sky, body: keyof typeof BODY, jd: number): number {
  const p = sky.positionsAt(jd, 8, false);
  if (!p) throw new Error("no positions");
  return pyMod(p.longitude[BODY[body]], 360);
}

interface DayPanchanga {
  tithiAbsolute: number;
  tithiDisplay: number;
  paksha: string;
  vaara: number;
  sunRashi: number;
  jupiterRashi: number;
  jupiterCombust: boolean;
  venusCombust: boolean;
  jupiterBalaVriddha: boolean;
  venusBalaVriddha: boolean;
  lunarMonth: string | null;
  isAdhik: boolean;
  aayan: string;
}

const sep = (a: number, b: number) => {
  const d = pyMod(a - b, 360);
  return Math.min(d, 360 - d);
};

function dayPanchanga(sky: Sky, jdn: number, place: Place, sunrise: number): DayPanchanga {
  const t = tithiInfo(sky, sunrise);
  const sun = stable(lon(sky, "sun", sunrise));
  const jupiter = stable(lon(sky, "jupiter", sunrise));
  const venus = stable(lon(sky, "venus", sunrise));
  const p = sky.positionsAt(sunrise, 1, false);
  const tropical = pyMod(sun + (p?.ayanamsha ?? 0), 360);
  const observer = { sky, latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone };
  const layers = lunarCalendarBlock(jdn, t.paksha, observer) as { purnimant: { name: string | null; is_adhik: boolean } };
  return {
    tithiAbsolute: t.number,
    tithiDisplay: t.display,
    paksha: t.paksha,
    vaara: varaAt(sunrise, place.timeZone) + 1,
    sunRashi: rashiOf(sun),
    jupiterRashi: rashiOf(jupiter),
    jupiterCombust: sep(jupiter, sun) < 11,
    venusCombust: sep(venus, sun) < 10,
    jupiterBalaVriddha: sep(jupiter, sun) >= 11 && sep(jupiter, sun) < 14,
    venusBalaVriddha: sep(venus, sun) >= 10 && sep(venus, sun) < 13,
    lunarMonth: layers.purnimant.name,
    isAdhik: Boolean(layers.purnimant.is_adhik),
    aayan: tropical >= 90 && tropical < 270 ? "Dakshinayana" : "Uttarayana",
  };
}

const localNoon = (jdn: number, place: Place) => jdn - utcOffsetMinutes(place.timeZone, jdn - 0.5 + 0.5) / 1440;
const sunRashiAt = (sky: Sky, jd: number) => ((Math.floor(lon(sky, "sun", jd) / 30) % 12) + 12) % 12;
const isDagdha = (vaara: number, display: number) => [[1, 12], [2, 11], [3, 5], [4, 3], [5, 6], [6, 8], [7, 9]].some(([v, d]) => v === vaara && d === display);

function eclipseNear(jdn: number, pad: number, place: Place): boolean {
  if (pad <= 0) return false;
  const noon = jdn - 0.5 + 0.5;
  for (const kind of ["solar", "lunar"] as const) {
    for (const backward of [false, true]) {
      const max = nextEclipseMax(noon, kind, backward);
      if (max === null) continue;
      const localDay = Math.floor(max + 0.5 + utcOffsetMinutes(place.timeZone, max) / 1440);
      if (Math.abs(localDay - jdn) <= pad) return true;
    }
  }
  return false;
}

function udayaPaksha(sky: Sky, jdn: number, place: Place): "shukla" | "krishna" | null {
  const t = dayTimes(sky, jdn, place);
  return t ? tithiInfo(sky, t.sunrise).paksha : null;
}
function isKshayaPaksha(sky: Sky, jdn: number, place: Place): boolean {
  const paksha = udayaPaksha(sky, jdn, place);
  let start = jdn;
  let end = jdn;
  for (let i = 0; i < 40 && udayaPaksha(sky, start - 1, place) === paksha; i += 1) start -= 1;
  for (let i = 0; i < 40 && udayaPaksha(sky, end + 1, place) === paksha; i += 1) end += 1;
  return end - start + 1 <= 13;
}

function dayGate(sky: Sky, rule: Rule, jdn: number, place: Place, sunrise: number): { ok: boolean; vaara: number; dp: DayPanchanga } {
  const dp = dayPanchanga(sky, jdn, place, sunrise);
  const no = { ok: false, vaara: dp.vaara, dp };
  if (dp.isAdhik) return no;
  if (rule.eclipsePadDays > 0 && eclipseNear(jdn, rule.eclipsePadDays, place)) return no;
  if (rule.blockSankranti && sunRashiAt(sky, localNoon(jdn, place)) !== sunRashiAt(sky, localNoon(jdn + 1, place))) return no;
  if (rule.lunarMonths.length && !has(rule.lunarMonths, dp.lunarMonth)) return no;
  if (rule.sunRashis.length && !has(rule.sunRashis, dp.sunRashi)) return no;
  if (rule.avoidSunRashis.length && has(rule.avoidSunRashis, dp.sunRashi)) return no;
  if (rule.avoidGuruRashis.length && has(rule.avoidGuruRashis, dp.jupiterRashi)) return no;
  if (rule.blockChaturmas && dp.lunarMonth !== null && CHATURMAS.includes(dp.lunarMonth)) return no;
  if (rule.requireGuruUdaya && dp.jupiterCombust) return no;
  if (rule.requireShukraUdaya && dp.venusCombust) return no;
  if (rule.rejectGuruShukraBalaVriddha && (dp.jupiterBalaVriddha || dp.venusBalaVriddha)) return no;
  if (rule.requireUttarayana && dp.aayan !== "Uttarayana") return no;
  if (rule.avoidVaras.length && has(rule.avoidVaras, dp.vaara)) return no;
  if (rule.blockKshayaPaksha && isKshayaPaksha(sky, jdn, place)) return no;
  return { ok: true, vaara: dp.vaara, dp };
}

function lattaPierced(sky: Sky, noon: number, planets: readonly string[]): Set<number> {
  const out = new Set<number>();
  if (!planets.length) return out;
  const offsets: [string, number][] = [["sun", 11], ["mars", 2], ["saturn", 7], ["rahu", -8], ["ketu", -8]];
  const rahu = lon(sky, "rahu", noon);
  for (const [planet, offset] of offsets) {
    if (!planets.includes(planet)) continue;
    const l = planet === "sun" ? lon(sky, "sun", noon) : planet === "mars" ? lon(sky, "mars", noon) : planet === "saturn" ? lon(sky, "saturn", noon) : planet === "rahu" ? rahu : (rahu + 180) % 360;
    const nak = (((Math.floor(l / (360 / 27)) % 27) + 27) % 27) + 1;
    out.add((((nak - 1 + offset) % 27) + 27) % 27 + 1);
  }
  return out;
}

type Interval = [number, number];
const inIntervals = (at: number, ints: Interval[]) => ints.some(([s, e]) => s <= at && at < e);

function durIntervals(sunrise: number, sunset: number, nextSunrise: number, vaara: number): Interval[] {
  const dayS = (sunset - sunrise) * 86400;
  const nightS = (nextSunrise - sunset) * 86400;
  if (dayS <= 0 || nightS <= 0) return [];
  const dayPart = dayS / 15 / 86400;
  const nightPart = nightS / 15 / 86400;
  return DUR_MUHURTA[(vaara - 1) % 7].map((i): Interval => (i < 15 ? [sunrise + i * dayPart, sunrise + (i + 1) * dayPart] : [sunset + (i - 15) * nightPart, sunset + (i - 14) * nightPart]));
}

function sankrantiVetoes(sky: Sky, rule: Rule, sunrise: number, end: number): Interval[] {
  if (rule.sankrantiBufferHours <= 0 && rule.majorSankrantiBufferHours <= 0) return [];
  const pad = Math.max(rule.sankrantiBufferHours, rule.majorSankrantiBufferHours) / 24;
  const searchStart = sunrise - pad;
  const searchEnd = end + pad;
  const r0 = sunRashiAt(sky, searchStart);
  const r1 = sunRashiAt(sky, searchEnd);
  if (r0 === r1) return [];
  // `find_sankranti_after_jd(r1, search_start, 5)`: the entry into rashi r1 within five days (sixty from afar).
  const current = sunRashiAt(sky, searchStart);
  const before = (r1 + 11) % 12;
  const entry = current === r1 ? sky.prevBoundary("sankranti", searchStart)?.jd : sky.nextEntry("sankranti", r1, searchStart)?.jd;
  const reach = current === r1 || current === before ? 5 : 60;
  if (entry === undefined || !Number.isFinite(entry) || Math.abs(entry - searchStart) > reach) return [];
  const moment = Math.floor(entry * 86400) / 86400;
  const incoming = sunRashiAt(sky, moment + 60 / 86400) + 1;
  const hours = has(rule.majorSankrantiRashis, incoming) ? rule.majorSankrantiBufferHours : rule.sankrantiBufferHours;
  if (hours <= 0) return [];
  return [[moment - hours / 24, moment + hours / 24]];
}

function moonRashi(sky: Sky, jd: number) {
  return rashiOf(sunMoon(sky, jd)[1]);
}

function majorDoshaAt(sky: Sky, rule: Rule, at: number, vaara: number, pierced: Set<number>, inGodhuli: boolean, inDur: boolean, inSankranti: boolean, forDayKill: boolean): boolean {
  if (inSankranti) return true;
  if (rule.blockDurMuhurta && inDur && !forDayKill) return true;
  if (rule.avoidYogas.length && has(rule.avoidYogas, yogaAt(sky, at).number)) return true;
  if (rule.avoidKaranas.length && has(rule.avoidKaranas, karanaName(sky, at))) return true;
  const shielded = inGodhuli && rule.godhuliOverridesDagdhaShunya;
  if (!shielded) {
    const t = tithiInfo(sky, at);
    if (rule.checkDagdha && isDagdha(vaara, t.display)) return true;
    if (rule.checkShunya) {
      const drained = SHUNYA[t.display];
      if (drained && drained.includes(moonRashi(sky, at))) return true;
    }
  }
  if (pierced.size && pierced.has(nakshatraAt(sky, at).number)) return true;
  return false;
}

function karanaName(sky: Sky, jd: number): string {
  const i = karanaAt(sky, jd).number - 1;
  return KARANA_NAMES[i === 0 ? 10 : i >= 57 ? 7 + (i - 57) : (i - 1) % 7];
}

interface Ctx {
  sky: Sky;
  rule: Rule;
  place: Place;
  vaara: number;
  planetRashis: Record<string, number>;
  pierced: Set<number>;
  godhuli: Interval | null;
  dur: Interval[];
  sankranti: Interval[];
}

function windowOk(c: Ctx, at: number): [boolean, number] {
  const { sky, rule } = c;
  const inGodhuli = c.godhuli ? c.godhuli[0] <= at && at < c.godhuli[1] : false;
  if (inSank(c, at)) return [false, 0];
  if (rule.blockDurMuhurta && inIntervals(at, c.dur)) return [false, 0];
  const t = tithiInfo(sky, at);
  if (RIKTA.includes(t.display) || has(rule.avoidTithis, t.display)) return [false, 0];
  const shielded = inGodhuli && rule.godhuliOverridesDagdhaShunya;
  if (!shielded) {
    if (rule.checkDagdha && isDagdha(c.vaara, t.display)) return [false, 0];
    if (rule.checkShunya) {
      const drained = SHUNYA[t.display];
      if (drained && drained.includes(moonRashi(sky, at))) return [false, 0];
    }
  }
  if (rule.shuklaTithis.length || rule.krishnaTithis.length) {
    const allowed = t.paksha === "shukla" ? rule.shuklaTithis : rule.krishnaTithis;
    if (!has(allowed, t.display)) return [false, 0];
  } else if (rule.tithis.length && !has(rule.tithis, t.display)) return [false, 0];
  if (rule.shuklaOnly && t.paksha !== "shukla") return [false, 0];
  if (rule.avoidYogas.length && has(rule.avoidYogas, yogaAt(sky, at).number)) return [false, 0];
  if (rule.avoidKaranas.length && has(rule.avoidKaranas, karanaName(sky, at))) return [false, 0];
  const nak = nakshatraAt(sky, at).number;
  if (rule.nakshatras.length && !has(rule.nakshatras, nak)) return [false, 0];
  if (c.pierced.has(nak)) return [false, 0];
  const asc = lagnaAt(sky.source, at, c.place.latitude, c.place.longitude) ?? 0;
  const lagna = rashiOf(asc);
  if (rule.lagnas.length && !has(rule.lagnas, lagna)) return [false, 0];
  if (rule.avoidMoonHouses.length) {
    const house = ((moonRashi(sky, at) - lagna) % 12 + 12) % 12 + 1;
    if (has(rule.avoidMoonHouses, house)) return [false, 0];
  }
  if (rule.avoidMaleficHouses.length) {
    for (const planet of ["sun", "mars", "saturn", "rahu"]) {
      const r = c.planetRashis[planet];
      if (r === undefined) continue;
      const house = (((r - lagna) % 12) + 12) % 12 + 1;
      if (has(rule.avoidMaleficHouses, house)) return [false, 0];
    }
  }
  return [true, lagna];
}
const inSank = (c: Ctx, at: number) => inIntervals(at, c.sankranti);

function edgeRefine(c: Ctx, good0: number, bad0: number): [number, number] {
  let good = good0;
  let bad = bad0;
  while (Math.abs(bad - good) > REFINE_TOLERANCE) {
    const mid = (good + bad) / 2;
    if (windowOk(c, mid)[0]) good = mid;
    else bad = mid;
  }
  return [good, bad];
}

/** `muhurta_windows_for_rule` for one ceremony on the civil day `jdn`. */
function windowsFor(sky: Sky, rule: Rule, jdn: number, place: Place): Interval[] {
  const times = dayTimes(sky, jdn, place);
  if (!times) return [];
  const { sunrise, sunset, nextSunrise } = times;
  const gate = dayGate(sky, rule, jdn, place, sunrise);
  if (!gate.ok) return [];
  const noon = localNoon(jdn, place);
  const planetRashis: Record<string, number> = {};
  if (rule.avoidMaleficHouses.length) for (const p of ["sun", "mars", "saturn", "rahu"] as const) planetRashis[p] = rashiOf(lon(sky, p, noon));
  const pierced = lattaPierced(sky, noon, rule.grahaVedhaPlanets);
  const end = rule.endAtMadhyahna ? (sunrise + sunset) / 2 : rule.daytimeOnly ? sunset : nextSunrise;
  const dur = rule.blockDurMuhurta ? durIntervals(sunrise, sunset, nextSunrise, gate.vaara) : [];
  const godhuli: Interval | null = rule.godhuliOverridesDagdhaShunya || rule.dayKillOnMajorDosha ? [sunset, sunset + (nextSunrise - sunset) / 30] : null;
  const sankranti = sankrantiVetoes(sky, rule, sunrise, end);
  const c: Ctx = { sky, rule, place, vaara: gate.vaara, planetRashis, pierced, godhuli, dur, sankranti };
  if (rule.dayKillOnMajorDosha) {
    for (let at = sunrise; at < sunset; at += STEP) {
      if (majorDoshaAt(sky, rule, at, gate.vaara, pierced, sunset <= at && at < sunset + (nextSunrise - sunset) / 30, inIntervals(at, dur), inIntervals(at, sankranti), true)) return [];
    }
  }
  const windows: Interval[] = [];
  let runStart: number | null = null;
  let lastGood: number | null = null;
  const close = () => {
    if (runStart === null || lastGood === null) return;
    let start = runStart;
    let stop = Math.min(lastGood + STEP, end);
    if (start > sunrise) start = edgeRefine(c, start, start - STEP)[0];
    if (stop < end) stop = edgeRefine(c, lastGood, stop)[1];
    if (stop - start >= MIN_WINDOW) windows.push([start, stop]);
  };
  for (let at = sunrise; at <= end; at += STEP) {
    if (windowOk(c, at)[0]) {
      if (runStart === null) runStart = at;
      lastGood = at;
    } else if (runStart !== null) {
      close();
      runStart = null;
      lastGood = null;
    }
  }
  close();
  return windows;
}

/** The ceremonies a day route times (`CEREMONY_SAITS`): their muhurta windows on a civil day. */
export function ceremonyWindows(sky: Sky, jdn: number, place: Place): CeremonyWindows[] {
  return (["vivah", "bratabandha", "griha-pravesh"] as const).map((category) => {
    let windows: Interval[] = [];
    try {
      windows = windowsFor(sky, CEREMONY_RULES[category] as unknown as Rule, jdn, place);
    } catch {
      windows = [];
    }
    return { category, windows: windows.map(([start, end]) => ({ start, end })) };
  });
}
void civilFromJdn;
