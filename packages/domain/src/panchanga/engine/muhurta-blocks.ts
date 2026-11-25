// The muhurta block: Rahu Kalam, Yamaganda, Gulika, Abhijit, and the extended auspicious and
// inauspicious timings (`panchanga::blocks_muhurta`).
import { civilFromJdn } from "../../astronomy/lunar-month";
import type { Sky } from "../../astronomy/sky";
import { karanaAt, nakshatraAt, sunMoon, tithiInfo, yogaAt, type Json } from "./blocks";
import { pyInt, pyMod, pyRound } from "./py";
import { addSeconds, secondsSince, utcIso, wallIn } from "./instant";

const RAHU_KALAM_PERIOD = [8, 2, 7, 5, 6, 4, 3];
const YAMAGANDA_PERIOD = [5, 4, 3, 2, 1, 7, 6];
const GULIKA_PERIOD = [7, 6, 5, 4, 3, 2, 1];
const AMRITA_VARJYAM: [number, number][] = [[42, 50], [48, 24], [54, 30], [52, 4], [38, 14], [35, 11], [54, 30], [44, 20], [56, 32], [54, 30], [44, 20], [42, 18], [45, 21], [44, 20], [38, 14], [38, 14], [34, 10], [38, 14], [44, 20], [48, 20], [44, 24], [34, 10], [34, 10], [42, 18], [40, 16], [48, 24], [54, 30]];
const SARVARTHA_SIDDHI = [[3, 7, 11, 12, 20, 25], [3, 4, 7, 16, 21], [0, 2, 8, 12, 25], [2, 3, 4, 12, 16, 24, 25], [6, 7, 16, 26], [0, 6, 16, 21, 26], [3, 14, 21]];
const GANDA_MOOLA = [0, 8, 9, 17, 18, 26];
const AADAL_COUNTS = [2, 7, 9, 14, 16, 21, 23, 28];
const VIDAAL_COUNTS = [3, 6, 10, 13, 17, 20, 24, 27];
const DUR_MUHURTA = [[13], [11, 8], [3, 21], [7], [11, 5], [8, 3], [1, 15]];
const ABHIJIT_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 27, 21, 22, 23, 24, 25, 26];
const TITHI_RANDHRA_GHATIS: [number, number][] = [[1, 5], [4, 8], [6, 9], [8, 14], [9, 25], [12, 10]];
const TITHI_VISHA_GHATI = [15, 5, 6, 7, 8, 9, 10, 14, 16, 18, 20, 20, 10, 14, 0];
const YOGA_VISHA: [number, number | null][] = [[1, 5], [6, 6], [9, 5], [10, 6], [13, 9], [15, 3], [17, null]];
const GHATI_SECONDS = 24 * 60;
const NAKSHATRA_SPAN = 360 / 27;

interface Period {
  sky: Sky;
  sunrise: number;
  sunset: number;
  nextSunrise: number;
  zone: string;
}

function periodBlock(sunrise: number, sunset: number, period: number, zone: string, lord: string): Json & { start_time: string; end_time: string; start_local: string; end_local: string } {
  const horaS = secondsSince(sunset, sunrise) / 8;
  const start = addSeconds(sunrise, (period - 1) * horaS);
  const end = addSeconds(sunrise, period * horaS);
  const sl = wallIn(start, zone);
  const el = wallIn(end, zone);
  return { lord, period_no: period, start_time: sl.hm, end_time: el.hm, start_local: sl.iso, end_local: el.iso, start_utc: utcIso(start), end_utc: utcIso(end), is_auspicious: false } as never;
}

function abhijit(sunrise: number, sunset: number, zone: string, vaara: number): (Json & { start_time: string; end_time: string; start_local: string; end_local: string }) | null {
  if (vaara % 7 === 3) return null;
  const total = secondsSince(sunset, sunrise);
  const muhurtaS = total / 15;
  const noon = addSeconds(sunrise, total / 2);
  const start = addSeconds(sunrise, 7 * muhurtaS);
  const end = addSeconds(sunrise, 8 * muhurtaS);
  const sl = wallIn(start, zone);
  const el = wallIn(end, zone);
  return { name: "Abhijit", muhurta_no: 8, start_time: sl.hm, end_time: el.hm, start_local: sl.iso, end_local: el.iso, start_utc: utcIso(start), end_utc: utcIso(end), solar_noon: wallIn(noon, zone).hm, duration_minutes: pyRound(muhurtaS / 60, 1), is_auspicious: true } as never;
}

// ---------------------------------------------------------------- windows

function fromSunriseLocal(end: number, zone: string): string {
  return wallIn(end, zone).hms;
}

class DayWindows {
  private readonly d: Period;
  constructor(d: Period) {
    this.d = d;
  }

  segment(start: number, end: number, runsOn: boolean): Json {
    const { zone, nextSunrise } = this.d;
    const local = wallIn(start, zone);
    const endsInside = end < nextSunrise;
    const seg: Json = { start_time: utcIso(start), end_time: utcIso(end), start_local_time: local.iso, start_local_time_short: local.hm };
    if (runsOn || end >= nextSunrise) seg.until_full_night = true;
    if (endsInside) {
      seg.end_local_time = fromSunriseLocal(end, zone);
      seg.end_local_time_short = wallIn(end, zone).hm;
    }
    const day = (t: number) => Math.floor(t + 0.5);
    if (day(end) !== day(start)) seg.spans_midnight = true;
    return seg;
  }

  clip(start: number, end: number): Json | null {
    const { sunrise, nextSunrise } = this.d;
    const vs = Math.max(start, sunrise);
    const ve = Math.min(end, nextSunrise);
    return vs < ve ? this.segment(vs, ve, ve >= nextSunrise && end > nextSunrise) : null;
  }
}

interface Interval {
  index: number;
  number: number;
  display: number;
  paksha: "shukla" | "krishna";
  start: number;
  end: number;
}

const nextOf = (sky: Sky, kind: "tithi" | "nakshatra" | "yoga" | "karana" | "sunNakshatra" | "sunDegree", jd: number) => {
  const b = sky.nextBoundary(kind, jd);
  if (!b) throw new Error("no boundary");
  return b.jd;
};
const prevOf = (sky: Sky, kind: "tithi" | "nakshatra" | "yoga", jd: number) => {
  const b = sky.prevBoundary(kind, jd);
  if (!b) throw new Error("no boundary");
  return b.jd;
};

function moonIntervals(d: Period): Interval[] {
  const out: Interval[] = [];
  let cursor = d.sunrise;
  while (cursor < d.nextSunrise) {
    const n = nakshatraAt(d.sky, cursor).number;
    const start = prevOf(d.sky, "nakshatra", cursor);
    const end = nextOf(d.sky, "nakshatra", cursor);
    out.push({ index: n - 1, number: n, display: 0, paksha: "shukla", start, end });
    if (end >= d.nextSunrise) break;
    cursor = addSeconds(end, 90);
  }
  return out;
}
function sunIntervals(d: Period): Interval[] {
  const out: Interval[] = [];
  let cursor = d.sunrise;
  while (cursor < d.nextSunrise) {
    let n = pyInt(sunMoon(d.sky, cursor)[0] / NAKSHATRA_SPAN) + 1;
    if (n > 27) n = 1;
    const end = Math.min(nextOf(d.sky, "sunNakshatra", cursor), d.nextSunrise);
    out.push({ index: n - 1, number: n, display: 0, paksha: "shukla", start: cursor, end });
    if (end >= d.nextSunrise) break;
    cursor = addSeconds(end, 90);
  }
  return out;
}
function tithiIntervals(d: Period): Interval[] {
  const out: Interval[] = [];
  let cursor = d.sunrise;
  for (let i = 0; i < 40 && cursor < d.nextSunrise; i += 1) {
    const t = tithiInfo(d.sky, cursor);
    const end = nextOf(d.sky, "tithi", cursor);
    out.push({ index: 0, number: t.number, display: t.display, paksha: t.paksha, start: prevOf(d.sky, "tithi", cursor), end });
    if (end >= d.nextSunrise) break;
    cursor = addSeconds(end, 90);
  }
  return out;
}
function yogaIntervals(d: Period): Interval[] {
  const out: Interval[] = [];
  let cursor = d.sunrise;
  for (let i = 0; i < 40 && cursor < d.nextSunrise; i += 1) {
    const end = nextOf(d.sky, "yoga", cursor);
    out.push({ index: 0, number: yogaAt(d.sky, cursor).number, display: 0, paksha: "shukla", start: prevOf(d.sky, "yoga", cursor), end });
    if (end >= d.nextSunrise) break;
    cursor = addSeconds(end, 90);
  }
  return out;
}

const compact = (v: (Json | null)[]): Json[] => v.filter((x): x is Json => x !== null);

function countWithAbhijit(sun: number, moon: number): number {
  const s = ABHIJIT_ORDER.indexOf(sun);
  const m = ABHIJIT_ORDER.indexOf(moon);
  if (s < 0 || m < 0) return 0;
  const total = ABHIJIT_ORDER.length;
  if (s <= m) {
    const count = (m - s + 1) % total;
    return count === 0 ? total : count;
  }
  return total - s + m + 1;
}

const entry = (key: string, en: string, ne: string, segments: Json[], good: boolean): Json => ({ key, name_en: en, name_ne: ne, is_auspicious: good, segments });

function extended(d: Period, w: DayWindows, vaara: number): [Json[], Json[]] {
  const dayS = secondsSince(d.sunset, d.sunrise);
  const nightS = secondsSince(d.nextSunrise, d.sunset);
  const dayPart = dayS / 15;
  const nightPart = nightS / 15;
  const sandhyaS = 3 * (nightS / 30);
  const wd = vaara % 7;
  const good: Json[] = [];
  const bad: Json[] = [];
  const pushIf = (list: Json[], key: string, en: string, ne: string, segs: Json[], g: boolean) => {
    if (segs.length) list.push(entry(key, en, ne, segs, g));
  };
  const moons = moonIntervals(d);
  const suns = sunIntervals(d);
  const periodWindows = (nak: Interval, offset: number) => {
    const duration = secondsSince(nak.end, nak.start);
    const start = addSeconds(nak.start, (duration * offset) / 60);
    return w.clip(start, addSeconds(start, (duration * 4) / 60));
  };
  pushIf(good, "amrit_kalam", "Amrit Kalam", "अमृत काल", compact(moons.map((n) => periodWindows(n, AMRITA_VARJYAM[n.index % 27][0]))), true);
  pushIf(bad, "varjyam", "Varjyam", "वर्ज्यम्", compact(moons.map((n) => periodWindows(n, AMRITA_VARJYAM[n.index % 27][1]))), false);
  pushIf(good, "sarvartha_siddhi", "Sarvartha Siddhi Yoga", "सर्वार्थ सिद्धि योग", compact(moons.filter((n) => SARVARTHA_SIDDHI[wd].includes(n.index)).map((n) => w.clip(n.start, n.end))), true);

  const fixed = (start: number, end: number) => [w.segment(start, end, false)];
  const vij = addSeconds(d.sunrise, 10 * dayPart);
  good.push(entry("vijaya_muhurta", "Vijaya Muhurta", "विजय मुहूर्त", fixed(vij, addSeconds(vij, dayPart)), true));
  good.push(entry("godhuli_muhurta", "Godhuli Muhurta", "गोधूलि मुहूर्त", fixed(d.sunset, addSeconds(d.sunset, nightS / 30)), true));
  good.push(entry("pratah_sandhya", "Pratah Sandhya", "प्रातः सन्ध्या", fixed(addSeconds(d.sunrise, -sandhyaS), d.sunrise), true));
  good.push(entry("sayahna_sandhya", "Sayahna Sandhya", "सायं सन्ध्या", fixed(d.sunset, addSeconds(d.sunset, sandhyaS)), true));
  const nish = addSeconds(d.sunset, 7 * nightPart);
  good.push(entry("nishita_muhurta", "Nishita Muhurta", "निशिता मुहूर्त", fixed(nish, addSeconds(nish, nightPart)), true));
  good.push(entry("brahma_muhurta", "Brahma Muhurta", "ब्रह्म मुहूर्त", fixed(addSeconds(d.sunrise, -2 * nightPart), addSeconds(d.sunrise, -nightPart)), true));

  pushIf(bad, "dur_muhurtam", "Dur Muhurtam", "दुर्मुहूर्तम्", compact(DUR_MUHURTA[wd].map((i) => {
    const [base, part, n] = i < 15 ? [d.sunrise, dayPart, i] : [d.sunset, nightPart, i - 15];
    return w.clip(addSeconds(base, n * part), addSeconds(base, (n + 1) * part));
  })), false);

  // Bhadra: the Vishti karana.
  const vishti: Json[] = [];
  let cursor = d.sunrise;
  while (cursor < d.nextSunrise) {
    const kEnd = nextOf(d.sky, "karana", cursor);
    const k = karanaAt(d.sky, cursor).number - 1;
    const isVishti = k !== 0 && k < 57 && (k - 1) % 7 === 6;
    if (!isVishti) {
      cursor = addSeconds(kEnd, 90);
      continue;
    }
    const end = Math.min(kEnd, d.nextSunrise);
    const seg = w.clip(cursor, end);
    if (seg) vishti.push(seg);
    cursor = addSeconds(end, 90);
  }
  pushIf(bad, "bhadra", "Bhadra", "भद्रा", vishti, false);
  pushIf(bad, "ganda_moola", "Ganda Moola", "गण्ड मूल", compact(moons.filter((n) => GANDA_MOOLA.includes(n.index)).map((n) => w.clip(n.start, n.end))), false);
  const overlap = (counts: number[]) => {
    const out: Json[] = [];
    for (const m of moons) for (const s of suns) {
      const start = Math.max(m.start, s.start);
      const end = Math.min(m.end, s.end);
      if (start >= end || !counts.includes(countWithAbhijit(s.index, m.index))) continue;
      const seg = w.clip(start, end);
      if (seg) out.push(seg);
    }
    return out;
  };
  pushIf(bad, "aadal_yoga", "Aadal Yoga", "आडाल योग", overlap(AADAL_COUNTS), false);
  pushIf(bad, "vidaal_yoga", "Vidaal Yoga", "विडाल योग", overlap(VIDAAL_COUNTS), false);

  // Baana.
  const baana: Json[] = [];
  cursor = d.sunrise;
  for (let i = 0; i < 48 && cursor < d.nextSunrise; i += 1) {
    const degree = pyInt(pyMod(sunMoon(d.sky, cursor)[0], 30)) + 1;
    const bandEnd = nextOf(d.sky, "sunDegree", cursor);
    const meta = [1, 10, 19, 28].includes(degree) ? ["Mrityu", "मृत्यु"] : [2, 11, 20, 29].includes(degree) ? ["Agni", "अग्नि"] : [4, 13, 21].includes(degree) ? ["Raja", "राज"] : [6, 15, 24].includes(degree) ? ["Chora", "चोर"] : [8, 17, 26].includes(degree) ? ["Roga", "रोग"] : null;
    if (meta) {
      const seg = w.clip(cursor, bandEnd);
      if (seg) baana.push({ ...seg, subtitle_en: meta[0], subtitle_ne: meta[1], is_auspicious: false });
    }
    if (bandEnd >= d.nextSunrise) break;
    cursor = addSeconds(bandEnd, 30);
  }
  pushIf(bad, "baana", "Baana", "बाण", baana, false);

  const dagdha = [12, 11, 5, 3, 6, 8, 9][wd];
  const badTithi: Json[] = [];
  const randhra: Json[] = [];
  const visha: Json[] = [];
  for (const t of tithiIntervals(d)) {
    if ([4, 9, 14].includes(t.display) || (t.display === 15 && t.paksha === "krishna") || dagdha === t.display) {
      const s = w.clip(t.start, t.end);
      if (s) badTithi.push(s);
    }
    const r = TITHI_RANDHRA_GHATIS.find(([dd]) => dd === t.display);
    if (r) {
      const s = w.clip(t.start, addSeconds(t.start, r[1] * GHATI_SECONDS));
      if (s) randhra.push(s);
    }
    const offset = TITHI_VISHA_GHATI[t.display - 1];
    const tDur = secondsSince(t.end, t.start);
    const vStart = addSeconds(t.start, (tDur * offset) / 60);
    const s = w.clip(vStart, addSeconds(vStart, (tDur * 4) / 60));
    if (s) visha.push(s);
  }
  pushIf(bad, "tithi", "Tithi", "तिथि", badTithi, false);
  pushIf(bad, "tithi_randhra", "Tithi Randhra", "तिथि रन्ध्र", randhra, false);
  pushIf(bad, "visha_tithi", "Tithi Visha", "तिथि विष", visha, false);
  pushIf(bad, "visha_yoga", "Yoga Visha", "योग विष", compact(yogaIntervals(d).map((y) => {
    const row = YOGA_VISHA.find(([n]) => n === y.number);
    if (!row) return null;
    const end = row[1] === null ? y.end : addSeconds(y.start, (secondsSince(y.end, y.start) * row[1]) / 60);
    return w.clip(y.start, end);
  })), false);
  return [good, bad];
}

const legacy = (key: string, en: string, ne: string, b: { start_time: string; end_time: string; start_local: string; end_local: string } | null, good: boolean): Json | null =>
  b ? { key, name_en: en, name_ne: ne, is_auspicious: good, segments: [{ start_local_time_short: b.start_time, end_local_time_short: b.end_time, start_time: b.start_local, end_time: b.end_local }] } : null;

/** `build_muhurta_block` + `enrich_muhurta_block`; `full` false is the plain block (no timings). */
export function muhurtaBlock(sky: Sky, sunrise: number, sunset: number, nextSunrise: number, vaara: number, zone: string, full: boolean): Json {
  const total = secondsSince(sunset, sunrise);
  const wd = vaara % 7;
  const rahu = periodBlock(sunrise, sunset, RAHU_KALAM_PERIOD[wd], zone, "Rahu");
  const yama = periodBlock(sunrise, sunset, YAMAGANDA_PERIOD[wd], zone, "Yama");
  const gulika = periodBlock(sunrise, sunset, GULIKA_PERIOD[wd], zone, "Gulika (Manda-putra)");
  const abh = abhijit(sunrise, sunset, zone, vaara);
  const out: Json = { hora_duration_minutes: pyRound(total / 8 / 60, 1), muhurta_duration_minutes: pyRound(total / 15 / 60, 1), rahu_kalam: rahu, yamaganda: yama, gulika, abhijit: abh };
  if (!full) return out;
  const d: Period = { sky, sunrise, sunset, nextSunrise, zone };
  const [good, bad] = extended(d, new DayWindows(d), vaara);
  const a = legacy("abhijit", "Abhijit Muhurta", "अभिजित् मुहूर्त", abh, true);
  if (a) good.splice(Math.min(2, good.length), 0, a);
  for (const [key, en, ne, block] of [["rahu_kalam", "Rahu Kaal", "राहु काल", rahu], ["yamaganda", "Yamaganda", "यमगण्ड", yama], ["gulika", "Gulika Kaal", "गुलिक काल", gulika]] as const) {
    const e = legacy(key, en, ne, block as never, false);
    if (e) bad.unshift(e);
  }
  out.auspicious_timings = good;
  out.inauspicious_timings = bad;
  return out;
}
void civilFromJdn;
