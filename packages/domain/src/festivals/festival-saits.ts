// Festival sait (साइत) windows at the observer (`festivals::sait`): the lagna and kaal windows inside the
// tithi of the five ritual festivals, and the ceremony saits cut from muhurta windows.
import type { Sky } from "../astronomy/sky";
import { dayTimes, nakshatraAt, sunMoon, tithiInfo, yogaAt, type Json, type Place } from "../panchanga/engine/blocks";
import { nextLagnaBoundary } from "../panchanga/engine/lagna-blocks";
import { wallIn, utcIso } from "../panchanga/engine/instant";
import { lagnaAt } from "../astronomy/siddhanta-offline";
import { civilFromJdn } from "../astronomy/lunar-month";
import { RASHI_NAMES, RASHI_NAMES_NE } from "../panchanga/engine/tables.generated";

const MIN_SAIT_DAYS = (12 * 60) / 86400;
const STHIRA = [2, 5, 8, 11];
const DWISWABHAVA = [3, 6, 9, 12];
const SHUBHA = [2, 3, 5, 6, 8, 9, 11, 12];
const NIGHT_KAALS = ["pradosh", "purva_ratri"];
const CHANDRA_VASA_DIRECTIONS = ["east", "south", "west", "north"];

interface Window {
  start: number;
  end: number;
}
interface SaitRule {
  ritual: string;
  tithi: number;
  paksha: "shukla" | "krishna";
  windows: string[];
  lagnas: number[][];
  tika: boolean;
  avoidNakshatras: number[];
  avoidYogas: number[];
}
const RULES: Record<string, SaitRule> = {
  ghatasthapana: { ritual: "ghatasthapana", tithi: 1, paksha: "shukla", windows: ["pratah", "abhijit", "until_madhyahna"], lagnas: [DWISWABHAVA, STHIRA], tika: false, avoidNakshatras: [14], avoidYogas: [27] },
  fulpati: { ritual: "fulpati", tithi: 7, paksha: "shukla", windows: ["abhijit", "madhyahna", "until_madhyahna"], lagnas: [SHUBHA], tika: false, avoidNakshatras: [], avoidYogas: [] },
  "vijaya-dashami": { ritual: "dashain-tika", tithi: 10, paksha: "shukla", windows: ["abhijit", "madhyahna", "until_madhyahna"], lagnas: [SHUBHA], tika: true, avoidNakshatras: [], avoidYogas: [] },
  "laxmi-puja": { ritual: "laxmi-puja", tithi: 15, paksha: "krishna", windows: ["pradosh", "purva_ratri"], lagnas: [[2], STHIRA], tika: false, avoidNakshatras: [], avoidYogas: [] },
  "bhai-tika": { ritual: "bhai-tika", tithi: 2, paksha: "shukla", windows: ["abhijit_aparahna", "until_aparahna"], lagnas: [SHUBHA], tika: true, avoidNakshatras: [], avoidYogas: [] },
};
const absoluteTithi = (r: SaitRule) => (r.paksha === "krishna" ? r.tithi + 15 : r.tithi);

interface LagnaSpan {
  number: number;
  name: string;
  name_ne: string;
  window: Window;
}
interface DaySky {
  sky: Sky;
  sunrise: number;
  sunset: number;
  nextSunrise: number;
  lagnaSpans: LagnaSpan[];
}

const lagnaRashi = (sky: Sky, jd: number, p: Place) => (Math.trunc((lagnaAt(sky.source, jd, p.latitude, p.longitude) ?? 0) / 30) % 12) + 1;

function localSky(sky: Sky, jdn: number, place: Place): DaySky | null {
  const t = dayTimes(sky, jdn, place);
  if (!t) return null;
  const spans: LagnaSpan[] = [];
  let cursor = t.sunrise;
  for (let i = 0; i < 14 && cursor < t.nextSunrise; i += 1) {
    const number = lagnaRashi(sky, cursor, place);
    // The first second the next sign is rising, so reading the ascendant there gives the next sign.
    let end = Math.min(Math.ceil((nextLagnaBoundary(sky, cursor, place.latitude, place.longitude) + 0.5) * 86400) / 86400 - 0.5, t.nextSunrise);
    if (end <= cursor) end = cursor + 60 / 86400;
    spans.push({ number, name: RASHI_NAMES[number - 1], name_ne: RASHI_NAMES_NE[number - 1], window: { start: cursor, end } });
    cursor = end;
  }
  return { sky, sunrise: t.sunrise, sunset: t.sunset, nextSunrise: t.nextSunrise, lagnaSpans: spans };
}

function kaalWindows(s: DaySky): Record<string, Window> {
  const day = s.sunset - s.sunrise;
  const night = s.nextSunrise - s.sunset;
  const muhurta = day / 15;
  const fifth = day / 5;
  return {
    pratah: { start: s.sunrise, end: s.sunrise + day / 3 },
    abhijit: { start: s.sunrise + 7 * muhurta, end: s.sunrise + 8 * muhurta },
    madhyahna: { start: s.sunrise + 2 * fifth, end: s.sunrise + 3 * fifth },
    aparahna: { start: s.sunrise + 3 * fifth, end: s.sunrise + 4 * fifth },
    abhijit_aparahna: { start: s.sunrise + 7 * muhurta, end: s.sunrise + 4 * fifth },
    until_madhyahna: { start: s.sunrise, end: s.sunrise + 3 * fifth },
    until_aparahna: { start: s.sunrise, end: s.sunrise + 4 * fifth },
    pradosh: { start: s.sunset, end: s.sunset + night / 5 },
    purva_ratri: { start: s.sunset, end: s.sunset + night / 2 },
  };
}

const intersect = (a: Window, b: Window): Window | null => {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return end > start ? { start, end } : null;
};
const clipAll = (w: Window, spans: Window[]) => spans.map((s) => intersect(w, s)).filter((x): x is Window => x !== null);
function subtract(spans: Window[], holes: Window[]): Window[] {
  let out = spans;
  for (const hole of holes) {
    const cut: Window[] = [];
    for (const span of out) {
      if (hole.end <= span.start || hole.start >= span.end) {
        cut.push(span);
        continue;
      }
      if (span.start < hole.start) cut.push({ start: span.start, end: hole.start });
      if (hole.end < span.end) cut.push({ start: hole.end, end: span.end });
    }
    out = cut;
  }
  return out;
}

function spansWhere(sky: Sky, kind: "tithi" | "nakshatra" | "yoga", start: number, end: number, numberAt: (jd: number) => number, wanted: number[]): Window[] {
  const spans: Window[] = [];
  let cursor = start;
  for (let i = 0; i < 6 && cursor < end; i += 1) {
    const boundary = sky.nextBoundary(kind, cursor)?.jd ?? end;
    if (wanted.includes(numberAt(cursor))) spans.push({ start: cursor, end: Math.min(boundary, end) });
    cursor = boundary + 1 / 86400;
  }
  return spans;
}

const timeBlock = (start: number, end: number, zone: string): Json => {
  const a = wallIn(start, zone);
  return { start: utcIso(start), end: utcIso(end), date_local: a.iso.slice(0, 10), start_local: a.hm, end_local: wallIn(end, zone).hm };
};

function chandraVasa(sky: Sky, at: number): Json {
  const number = (Math.trunc(sunMoon(sky, at)[1] / 30) % 12) + 1;
  return { direction: CHANDRA_VASA_DIRECTIONS[(number - 1) % 4], moon_rashi: { number, name: RASHI_NAMES[number - 1], name_ne: RASHI_NAMES_NE[number - 1] } };
}

interface Found {
  sait: Json;
  inPrimary: boolean;
  hasLagna: boolean;
}

function saitOn(rule: SaitRule, s: DaySky, zone: string): Found | null {
  const sky = s.sky;
  const kaals = kaalWindows(s);
  const tithi = spansWhere(sky, "tithi", s.sunrise, s.nextSunrise, (jd) => tithiInfo(sky, jd).number, [absoluteTithi(rule)]);
  if (!tithi.length) return null;
  const avoided = [
    ...(rule.avoidNakshatras.length ? spansWhere(sky, "nakshatra", s.sunrise, s.nextSunrise, (jd) => nakshatraAt(sky, jd).number, rule.avoidNakshatras) : []),
    ...(rule.avoidYogas.length ? spansWhere(sky, "yoga", s.sunrise, s.nextSunrise, (jd) => yogaAt(sky, jd).number, rule.avoidYogas) : []),
  ];
  const clean = subtract(tithi, avoided);
  const same = clean.length === tithi.length && clean.every((w, i) => w.start === tithi[i].start && w.end === tithi[i].end);
  const passLists = same ? [tithi] : [clean, tithi];
  const first = kaals[rule.windows[0]];
  if (!first) return null;
  const anchor = first.start + (first.end - first.start) / 2;
  const distance = (hit: Window) => (hit.start <= anchor && anchor <= hit.end ? 0 : Math.min(Math.abs(hit.start - anchor), Math.abs(hit.end - anchor)));
  const alternate = (kaal: string, sait: Window): Json | null => {
    const abhijit = kaals.abhijit;
    if (!abhijit || NIGHT_KAALS.includes(kaal) || intersect(abhijit, sait)) return null;
    const part = clipAll(abhijit, tithi)[0];
    return part ? { ...timeBlock(part.start, part.end, zone), kaal: "abhijit" } : null;
  };
  const entry = (kaal: string, sait: Window, lagna: LagnaSpan | null): Found => ({
    sait: {
      ritual: rule.ritual,
      kaal,
      window: timeBlock(kaals[kaal].start, kaals[kaal].end, zone),
      sait: timeBlock(sait.start, sait.end, zone),
      lagna: lagna ? { number: lagna.number, name: lagna.name, name_ne: lagna.name_ne } : null,
      alternate: alternate(kaal, sait),
      facing: rule.tika ? chandraVasa(sky, sait.start) : null,
    },
    inPrimary: clipAll(first, tithi).length > 0,
    hasLagna: lagna !== null,
  });
  for (const spans of passLists) {
    for (const kaal of rule.windows) {
      const open = kaals[kaal];
      if (!open) continue;
      const openParts = clipAll(open, spans);
      for (const group of rule.lagnas) {
        const hits: [Window, LagnaSpan][] = [];
        for (const span of s.lagnaSpans) {
          if (!group.includes(span.number)) continue;
          for (const hit of clipAll(span.window, openParts)) if (hit.end - hit.start >= MIN_SAIT_DAYS) hits.push([hit, span]);
        }
        if (hits.length) {
          hits.sort((a, b) => distance(a[0]) - distance(b[0]) || a[0].start - b[0].start);
          return entry(kaal, hits[0][0], hits[0][1]);
        }
      }
    }
  }
  for (const spans of passLists) {
    for (const kaal of rule.windows) {
      const open = kaals[kaal];
      if (!open) continue;
      const part = clipAll(open, spans)[0];
      if (part) return entry(kaal, part, null);
    }
  }
  return null;
}

/** Saits for ritual festivals among `ids` on the civil day `jdn`. */
export function festivalSaits(sky: Sky, jdn: number, ids: string[], place: Place): Json[] {
  const wanted = [...new Set(ids)].filter((id) => RULES[id]);
  if (!wanted.length) return [];
  const skies = new Map<number, DaySky>();
  const out: Json[] = [];
  for (const id of wanted) {
    let best: Found | null = null;
    for (const offset of [0, -1, 1]) {
      if (!skies.has(offset)) {
        const s = localSky(sky, jdn + offset, place);
        if (!s) continue;
        skies.set(offset, s);
      }
      const found = saitOn(RULES[id], skies.get(offset) as DaySky, place.timeZone);
      if (!found) continue;
      if (!best || found.inPrimary > best.inPrimary || (found.inPrimary === best.inPrimary && found.hasLagna > best.hasLagna)) best = found;
      if (best.inPrimary && best.hasLagna) break;
    }
    if (best) out.push({ kind: "festival", festival_id: id, timezone: place.timeZone, ...best.sait });
  }
  return out;
}

export interface CeremonyWindows {
  category: "vivah" | "bratabandha" | "griha-pravesh";
  windows: Window[];
}
export const CEREMONY_SAITS: [CeremonyWindows["category"], number[]][] = [["vivah", [2, 3, 6, 7, 9, 12]], ["bratabandha", SHUBHA], ["griha-pravesh", SHUBHA]];

export function ceremonySaits(sky: Sky, jdn: number, place: Place, found: CeremonyWindows[]): Json[] {
  if (found.every((c) => !c.windows.length)) return [];
  const s = localSky(sky, jdn, place);
  if (!s) return [];
  const out: Json[] = [];
  for (const c of found) {
    const permitted = CEREMONY_SAITS.find(([cat]) => cat === c.category)?.[1];
    if (!permitted) continue;
    for (const whole of c.windows) {
      for (const span of s.lagnaSpans) {
        if (!permitted.includes(span.number)) continue;
        const part = intersect(whole, span.window);
        if (!part || part.end - part.start < MIN_SAIT_DAYS) continue;
        out.push({
          kind: "ceremony",
          festival_id: c.category,
          timezone: place.timeZone,
          ritual: c.category,
          kaal: null,
          window: timeBlock(whole.start, whole.end, place.timeZone),
          sait: timeBlock(part.start, part.end, place.timeZone),
          lagna: { number: span.number, name: span.name, name_ne: span.name_ne },
          alternate: null,
          facing: null,
        });
      }
    }
  }
  return out;
}
void civilFromJdn;
