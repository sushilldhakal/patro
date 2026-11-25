/**
 * `/kundali/detail` made on the device: `jyotish::kundali_detail::assemble` in apps/rust. The birth
 * instant's panchanga (the at-time response), shadbala, three dasha trees, bhava bala, vimshopaka,
 * ashtakavarga, the yoga checklist, graha shanti, 20 varga charts, upagrahas, avakahada, birth facts.
 *
 * Three parts read "now" (which dashas to show, how many cycles, Saturn's transit): the caller passes it.
 */
import type { Sky } from "../../astronomy/sky";
import { castAshtakavarga } from "../rashifal/engine";
import { atTimeResponse } from "../../panchanga/engine/at-time";
import { choghadiya, dayTimes } from "../../panchanga/engine/blocks";
import { locationBlock, type DayInput } from "../../panchanga/engine/day";
import { wallIn } from "../../panchanga/engine/instant";
import { pyFloorDiv, pyInt, pyMod, pyRound, pyRoundInt } from "../../panchanga/engine/py";
import { RASHI_NAMES, RASHI_NAMES_NE } from "../../panchanga/engine/tables.generated";
import { civilFromJdn } from "../../astronomy/lunar-month";
import { suryaLongitude } from "../../astronomy/surya-formulas";
import { eraLanguage } from "../../panchanga/engine/era-render";
import * as A from "./avakahada-tables.generated";
import {
  ALL, angularSep, buildChart, combustOrb, dignity, EN, ENEMIES, EXALT_SIGN, FRIENDS, nakshatraOf, SEVEN, shadbalaFacts, SIGN_LORD, signOf,
  type GrahaKey, type RawPlanet,
} from "./chart-facts";
import { drishti, naturalRel, shadbala, temporalRel } from "./shadbala-engine";
import { grahaShanti } from "./shanti-engine";
import { VARGA_DIVISIONS, vargaRashi } from "./vargas";
import { dashaTrees, usFromJd, VIMSHOTTARI } from "./vimshottari-engine";
import { fullYogaCatalog, yogasApi } from "./yogas-engine";

type Json = Record<string, unknown>;
const NAK_LORD = VIMSHOTTARI.keys as readonly GrahaKey[];

function dmsParts(longitude: number): Json {
  const lon = pyMod(longitude, 360);
  const rashi = pyInt(pyFloorDiv(lon, 30)) + 1;
  const d = pyMod(lon, 30);
  let deg = pyInt(d);
  const mFloat = (d - deg) * 60;
  let minute = pyInt(mFloat);
  let sec = pyRoundInt((mFloat - minute) * 60);
  if (sec >= 60) { sec -= 60; minute += 1; }
  if (minute >= 60) { minute -= 60; deg += 1; }
  return { rashiNum: rashi, deg, min: minute, sec };
}

function kpSubLord(longitude: number): GrahaKey {
  const lon = pyMod(longitude, 360);
  const span = 360 / 27;
  const nak = Math.min(pyInt(pyFloorDiv(lon, span)), 26);
  const elapsed = ((lon - nak * span) / span) * 120;
  const start = nak % 9;
  let cumulative = 0;
  for (let i = 0; i < 9; i += 1) {
    const k = (start + i) % 9;
    cumulative += VIMSHOTTARI.years[k];
    if (elapsed < cumulative) return NAK_LORD[k];
  }
  return NAK_LORD[start];
}

function dignityApi(g: GrahaKey, longitude: number, vr: number, division: number): string | null {
  if (EXALT_SIGN[g] === undefined) return null;
  const raw = division === 1 ? dignity(g, longitude) : dignity(g, (vr - 1) * 30 + 1);
  return raw === "friend" ? "friend_house" : raw === "enemy" ? "enemy_house" : raw === "neutral" ? "neutral_house" : raw;
}
function relation(g: GrahaKey, owner: GrahaKey): string | null {
  if (EXALT_SIGN[g] === undefined) return null;
  return g === owner ? "self" : FRIENDS[g].includes(owner) ? "friend" : ENEMIES[g].includes(owner) ? "enemy" : "neutral";
}

function vargaCharts(lagnaLon: number, planets: RawPlanet[]): Json {
  const points: [GrahaKey | null, number, boolean][] = [[null, lagnaLon, false], ...ALL.map((g, i): [GrahaKey, number, boolean] => [g, planets[i].longitude, planets[i].retrograde])];
  const key = (g: GrahaKey | null) => g ?? "lagna";
  const entries: Json = {};
  for (const division of VARGA_DIVISIONS) {
    entries[String(division)] = points.map(([g, lon, retro]) => {
      const vr = vargaRashi(division, lon);
      const [nak, pada] = nakshatraOf(lon);
      const owner = SIGN_LORD[vr - 1];
      return {
        key: key(g), vargaRashi: vr, dms: dmsParts(lon), nakshatraIndex: nak, pada, nakshatraLord: NAK_LORD[nak % 9], subLord: kpSubLord(lon), ownerKey: owner,
        relation: g ? relation(g, owner) : null, dignity: g ? dignityApi(g, lon, vr, division) : null, retrograde: g !== null && retro,
      };
    });
  }
  const pointMap: Json = {};
  for (const [g, lon, retro] of points) pointMap[key(g)] = retro ? { longitude: lon, retrograde: true } : { longitude: lon };
  const owned: Json = {};
  for (const g of ALL) owned[g] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((r) => SIGN_LORD[r - 1] === g);
  return { divisions: VARGA_DIVISIONS, points: pointMap, entries, ownedRashis: owned };
}

// ── Bhava Bala ──
function signTypeAt(degree0: number): "human" | "quadruped" | "watery" | "insect" {
  const degree = pyMod(degree0, 360);
  const sign = pyInt(pyFloorDiv(degree, 30));
  const within = pyMod(degree, 30);
  if (sign === 8) return within < 15 ? "human" : "quadruped";
  if (sign === 9) return within < 15 ? "quadruped" : "watery";
  if ([0, 1, 4].includes(sign)) return "quadruped";
  if ([2, 5, 6, 10].includes(sign)) return "human";
  if ([3, 11].includes(sign)) return "watery";
  return "insect";
}
function digBala(house: number, madhya: number): number {
  const strong = { human: 1, quadruped: 10, watery: 4, insect: 7 }[signTypeAt(madhya)];
  const weak = ((strong - 1 + 6) % 12) + 1;
  const dist = Math.abs(house - weak);
  return 10 * Math.min(dist, 12 - dist);
}
const sbBenefic = (g: GrahaKey) => g === "moon" || g === "mercury" || g === "jupiter" || g === "venus";

function bhavaBala(lagnaLon: number, lons: number[], sb: Json): Json {
  const rows = (sb.planets as Json[]) ?? [];
  const virupas = (g: GrahaKey) => (rows.find((r) => r.key === g)?.total_virupas as number) ?? 0;
  const norm = (x: number) => pyMod(x, 360);
  const houses: Json[] = [];
  for (let house = 1; house <= 12; house += 1) {
    const madhya = norm(lagnaLon + (house - 1) * 30);
    const sign = pyInt(pyFloorDiv(madhya, 30)) % 12;
    const lord = SIGN_LORD[sign];
    const bhavadhipati = virupas(lord);
    const disha = digBala(house, madhya);
    let drishtiBase = 0;
    for (const g of SEVEN) {
      const d = drishti(g, norm(madhya - lons[ALL.indexOf(g)]));
      drishtiBase += sbBenefic(g) ? d : -d;
    }
    let special = 0;
    const qualifiers: GrahaKey[] = [lord];
    for (const g of ["jupiter", "venus", "mercury"] as GrahaKey[]) if (!qualifiers.includes(g)) qualifiers.push(g);
    for (const g of qualifiers) {
      const lon = lons[ALL.indexOf(g)];
      special += pyInt(pyFloorDiv(norm(lon), 30)) === sign ? 60 : drishti(g, norm(madhya - lon));
    }
    const drishtiTotal = drishtiBase + special;
    const total = bhavadhipati + disha + drishtiTotal;
    houses.push({
      house, madhyaLongitude: pyRound(madhya, 4), lordKey: lord, lordName: EN[lord], bhavadhipati: pyRound(bhavadhipati, 2), disha: pyRound(disha, 2),
      drishti: pyRound(drishtiTotal, 2), drishtiBase: pyRound(drishtiBase, 2), specialAddition: pyRound(special, 2), totalVirupas: pyRound(total, 2),
      totalPinda: pyRound(total, 2), rupas: pyRound(total / 60, 2), percent: pyRound((total / 500) * 100, 2),
    });
  }
  const pinda = (i: number) => houses[i].totalPinda as number;
  let strongest = 0;
  let weakest = 0;
  for (let i = 1; i < 12; i += 1) {
    if (pinda(i) > pinda(strongest)) strongest = i;
    if (pinda(i) < pinda(weakest)) weakest = i;
  }
  const rulership: Json = {};
  for (const g of SEVEN) {
    const ruled = houses.filter((h) => h.lordKey === g).map((h) => h.percent as number);
    if (ruled.length) rulership[g] = pyRound(ruled.reduce((a, b) => a + b, 0) / ruled.length, 2);
  }
  const bhavaPercent: Json = {};
  for (const g of SEVEN) {
    const off = norm(lons[ALL.indexOf(g)] - lagnaLon + 15);
    const signed = pyMod(off, 30) - 15;
    bhavaPercent[g] = { house: pyInt(pyFloorDiv(off, 30)) + 1, offsetFromMadhya: pyRound(signed, 4), percent: pyRound(Math.max(0, (1 - Math.abs(signed) / 15) * 100), 2) };
  }
  return { houses, strongest: houses[strongest], weakest: houses[weakest], rulershipPercent: rulership, referenceVirupas: 500, planetBhavaPercent: bhavaPercent };
}

// ── Vimshopaka ──
const CLASSIFICATIONS: [string, string, string, [number, number][]][] = [
  ["shadvarga", "Shadvarga (6)", "षड्वर्ग (६)", [[1, 6], [2, 2], [3, 4], [9, 5], [12, 2], [30, 1]]],
  ["saptavarga", "Saptavarga (7)", "सप्तवर्ग (७)", [[1, 5], [2, 2], [3, 3], [7, 2.5], [9, 4.5], [12, 2], [30, 1]]],
  ["dashavarga", "Dashavarga (10)", "दशवर्ग (१०)", [[1, 3], [2, 1.5], [3, 1.5], [7, 1.5], [9, 3], [10, 1.5], [12, 1.5], [16, 1.5], [30, 1.5], [60, 3.5]]],
  ["shodashavarga", "Shodashavarga (16)", "षोडशवर्ग (१६)", [[1, 3.5], [2, 1], [3, 1], [4, 0.5], [7, 0.5], [9, 3], [10, 0.5], [12, 0.5], [16, 2], [20, 0.5], [24, 0.5], [27, 0.5], [30, 1], [40, 0.5], [45, 0.5], [60, 4]]],
];
const EXALT_DEG: Record<string, number> = { sun: 10, moon: 33, mars: 298, mercury: 165, jupiter: 95, venus: 357 };
function vimshopaka(lons: number[]): Json {
  const d1 = lons.map(signOf);
  const vishwa = (p: GrahaKey, sign: number) => {
    const lord = SIGN_LORD[sign];
    const exalt = signOf(EXALT_DEG[p] ?? 200);
    if (lord === p || sign === exalt) return 20;
    if (sign === (exalt + 6) % 12) return 0;
    const score = naturalRel(p, lord) + temporalRel(p, lord, d1);
    return score === 2 ? 18 : score === 1 ? 15 : score === 0 ? 10 : score === -1 ? 7 : 5;
  };
  const grade = (s: number) => (s >= 15 ? "full" : s >= 10 ? "mediocre" : s >= 5 ? "little" : "incapable");
  const NE7: Record<string, string> = { sun: "सूर्य", moon: "चन्द्र", mars: "मंगल", mercury: "बुध", jupiter: "बृहस्पति", venus: "शुक्र", saturn: "शनि" };
  return {
    classifications: CLASSIFICATIONS.map(([key, label, labelNe, table]) => ({ key, label, label_ne: labelNe, divisions: table.map(([d]) => d) })),
    planets: SEVEN.map((p) => {
      const scores: Json = {};
      for (const [key, , , table] of CLASSIFICATIONS) {
        let total = 0;
        for (const [division, points] of table) total += (points * vishwa(p, vargaRashi(division, lons[ALL.indexOf(p)]) - 1)) / 20;
        scores[key] = { score: pyRound(total, 2), grade: grade(total) };
      }
      return { key: p, name: EN[p], name_ne: NE7[p], scores };
    }),
    max_score: 20,
    method: "Vimshopaka Bala (Parashari, 20-point varga strength)",
  };
}

// ── Avakahada and birth facts ──
const bi = (ne: string, en: string) => ({ ne, en });
function avakahada(moonLon: number, moonRashi: number, lagnaRashi: number): Json {
  const [nak, pada] = nakshatraOf(moonLon);
  const [nameNe, nameEn, aksharas, charan, yoni, gana] = A.AVAKAHADA[nak];
  const pi = Math.min(Math.max(pada, 1), 4) - 1;
  const varna = (charan[pi] - 1) % 4;
  const bhava = ((moonRashi + 12 - lagnaRashi) % 12) + 1;
  const rashiPaya = [1, 6, 11].includes(bhava) ? 0 : [2, 5, 9].includes(bhava) ? 1 : [3, 7, 10].includes(bhava) ? 2 : 3;
  const np = A.NAKSHATRA_PAYA[nak] as number;
  const yunja = nak < 9 ? 0 : nak < 18 ? 1 : 2;
  const [ganaNe, ganaEn] = gana === "देव" ? ["देव", "Deva"] : gana === "नर" ? ["मनुष्य", "Manushya"] : ["राक्षस", "Rakshasa"];
  return {
    nakshatra: bi(nameNe, nameEn), nakshatraIndex: nak, pada,
    rashiPaya: bi(A.PAYA_NE[rashiPaya] as string, A.PAYA_EN[rashiPaya] as string),
    nakshatraPaya: bi(A.PAYA_NE[np] as string, A.PAYA_EN[np] as string),
    tattva: bi(A.ELEM_NE[(moonRashi - 1) % 4] as string, A.ELEM_EN[(moonRashi - 1) % 4] as string),
    yunja: bi(A.YUNJA_NE[yunja] as string, A.YUNJA_EN[yunja] as string),
    vashya: bi(A.VASHYA_NE[moonRashi - 1] as string, A.VASHYA_EN[moonRashi - 1] as string),
    tara: bi(A.TARA_NE[nak % 9] as string, A.TARA_EN[nak % 9] as string),
    gana: bi(ganaNe, ganaEn),
    akshara: bi(aksharas[pi], aksharas[pi]),
    nadi: bi(A.NADI_NE[nak % 3] as string, A.NADI_EN[nak % 3] as string),
    asana: bi(A.ASANA_NE[pi] as string, A.ASANA_EN[pi] as string),
    yoni: bi(yoni, yoni),
    jati: bi(A.VARNA_NE[varna] as string, A.VARNA_EN[varna] as string),
  };
}
function ghadi(totalSeconds: number): Json {
  const remaining = pyMod(totalSeconds, 1440);
  return { ghadi: pyInt(pyFloorDiv(totalSeconds, 1440)), pala: pyInt(pyFloorDiv(remaining, 24)), vipala: pyInt(pyMod(remaining, 24) * (60 / 24)) };
}
function belaantarMinutes(panchanga: Json): number {
  const detail = (panchanga.detail as Json) ?? {};
  const sc = (detail.solar_corrections ?? panchanga.solar_corrections) as Json | undefined;
  const block = sc?.belaantar as Json | undefined;
  if (!block || !Object.keys(block).length) return 0;
  const total = ((block.minutes as number) ?? 0) + ((block.seconds as number) ?? 0) / 60;
  return block.sign === "rin" ? -total : total;
}
const clockMinutes = (clock: unknown): number | null => {
  if (typeof clock !== "string") return null;
  const [h, m] = clock.trim().split(":").map(Number);
  return Number.isInteger(h) && Number.isInteger(m) ? h * 60 + m : null;
};
const CHOGHADIYA_EN: Record<string, string> = { उद्वेग: "Udvega", चर: "Chara", लाभ: "Labha", अमृत: "Amrita", काल: "Kala", शुभ: "Shubha", रोग: "Roga" };
/**
 * `_choghadiya_at_birth`. The server reads the weekday from `panchanga.vaara`, which the at-time block
 * does not have, so it always lays out Sunday's choghadiya; the device reads the birth day's own weekday.
 */
function choghadiyaAtBirth(panchanga: Json, birthClock: string): Json | null {
  const sun = (panchanga.sun as Json) ?? {};
  const sr = clockMinutes(sun.sunrise);
  const ss = clockMinutes(sun.sunset);
  const birth = clockMinutes(birthClock);
  if (sr === null || ss === null || birth === null) return null;
  let dayG = (ss - sr) / 24;
  while (dayG < 0) dayG += 60;
  dayG = Math.min(dayG, 60);
  const vaara = (((panchanga.detail as Json)?.vaara as Json)?.number as number) ?? 0;
  let g = (birth - sr) / 24;
  while (g < 0) g += 60;
  g = Math.min(g, 60);
  const seg = choghadiya(dayG, vaara).find((x) => (x.start_g as number) <= g && g < (x.end_g as number));
  if (!seg) return null;
  const nameNe = seg.name_ne as string;
  const bad = Boolean(seg.bad);
  return { nameNe, nameEn: CHOGHADIYA_EN[nameNe] ?? null, quality: bad ? "अशुभ" : ["लाभ", "अमृत", "शुभ"].includes(nameNe) ? "शुभ" : "सामान्य", bad };
}
const upagrahas = (rows: Json[]) =>
  rows.map((row) => {
    const lon = (row.longitude as number) ?? 0;
    const [nak, pada] = nakshatraOf(lon);
    return { key: row.key, name: row.name ?? null, name_ne: row.name_ne ?? null, longitude: lon, dms: dmsParts(lon), nakshatraIndex: nak, pada, nakshatraLord: NAK_LORD[nak % 9] };
  });

// ── Ashtakavarga ──
const CONTRIBUTORS = ["lagna", "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
const TRIKONAS = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]];
const EKADHIPATYA: [number, number][] = [[0, 7], [1, 6], [2, 5], [8, 11], [9, 10]];
const RASIMANA = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12];
const GRAHAMANA = [5, 5, 8, 5, 10, 7, 5];
function reduce(bav: number[], occupied: boolean[]): number[] {
  const out = [...bav];
  for (const group of TRIKONAS) {
    const low = Math.min(...group.map((i) => out[i]));
    for (const i of group) out[i] -= low;
  }
  for (const [a, b] of EKADHIPATYA) {
    const [va, vb] = [out[a], out[b]];
    if (occupied[a] && occupied[b]) continue;
    if (!occupied[a] && !occupied[b]) {
      const v = va === vb ? 0 : Math.min(va, vb);
      out[a] = v;
      out[b] = v;
    } else if (occupied[a]) out[b] = va < vb ? va : 0;
    else out[a] = vb < va ? vb : 0;
  }
  return out;
}
function ashtakavargaPayload(grahaLons: number[], lagnaLon: number): Json {
  const signs = grahaLons.map(signOf);
  const lagnaSign = signOf(lagnaLon);
  const cast = castAshtakavarga(signs, lagnaSign);
  const raw = [cast.lagnaBav, ...cast.bav];
  const occupied = new Array<boolean>(12).fill(false);
  for (const s of signs) occupied[s] = true;
  const reduced = raw.map((r) => reduce(r, occupied));
  const rows = (table: number[][]) =>
    Array.from({ length: 12 }, (_, sign) => ({
      rashi: sign + 1, rashiEn: RASHI_NAMES[sign], rashiNe: RASHI_NAMES_NE[sign],
      bindus: Object.fromEntries(CONTRIBUTORS.map((name, t) => [name, table[t][sign]])),
      sarvashtaka: table.slice(1).reduce((a, t) => a + t[sign], 0),
    }));
  const shodhya = CONTRIBUTORS.map((name, t) => {
    const red = reduced[t];
    const rashiPinda = red.reduce((a, v, s) => a + v * RASIMANA[s], 0);
    const grahaPinda = red.reduce((a, v, s) => a + v * signs.reduce((x, gs, g) => x + (gs === s ? GRAHAMANA[g] : 0), 0), 0);
    return { target: name, rashiPinda, grahaPinda, shodhyaPinda: rashiPinda + grahaPinda };
  });
  const signMap: Json = { lagna: lagnaSign + 1 };
  CONTRIBUTORS.slice(1).forEach((name, g) => (signMap[name] = signs[g] + 1));
  return { raw: rows(raw), reduced: rows(reduced), shodhyaPinda: shodhya, signs: signMap };
}

/** `assemble`: the whole detail payload for a birth at `jd` (UT), read at `place`, with "now" at `nowJd`. */
export function kundaliDetail(
  sky: Sky,
  jd: number,
  place: Omit<DayInput, "year" | "month" | "day">,
  nowJd: number,
  q: { era?: string; language?: string; date?: string } = {},
): Json | null {
  const zone = place.timeZone;
  const local = wallIn(jd, zone);
  const civil = civilFromJdn(local.jdn);
  const panchanga = atTimeResponse(sky, { ...place, year: civil.year, month: civil.month, day: civil.day }, { clock: local.hms, surya: sky });
  if (!panchanga) return null;
  // A moment named by era parts echoes them as `date` (YYYY-MM-DD in that era).
  if (q.date) panchanga.date = q.date;
  const detail = panchanga.detail as Json;
  const table = detail.planets as Record<string, Json>;
  const lagnaLon = ((detail.instant_lagna as Json)?.longitude as number) ?? 0;
  const lagnaRashi = signOf(lagnaLon) + 1;
  const raw: RawPlanet[] = ALL.map((g) => ({ longitude: (table[g]?.longitude as number) ?? 0, retrograde: Boolean(table[g]?.is_retrograde ?? table[g]?.retrograde) }));
  const lons = raw.map((r) => r.longitude);
  const sb = shadbala(sky, jd, place);
  if (!sb) return null;
  const moonLon = lons[1];
  const sunLon = lons[0];
  const nowUs = usFromJd(nowJd);
  // A dasha date moves ~1.8 h per arcsecond of Moon: the text's own formula, not the fitted sky.
  const trees = dashaTrees(sky.system === "surya" ? suryaLongitude("moon", jd) : moonLon, usFromJd(jd), nowUs);

  // The vedic day: sunrise to sunrise, the previous one when the birth is before today's sunrise.
  let times = dayTimes(sky, local.jdn, place);
  if (times && jd < times.sunrise) times = dayTimes(sky, local.jdn - 1, place);
  if (!times) return null;
  const isDay = times.sunrise <= jd && jd < times.sunset;
  const rows = (detail.upagrahas as Json[]) ?? [];
  const upLon = (key: string) => (rows.find((r) => r.key === key)?.longitude as number | undefined) ?? null;
  const chart = buildChart(raw, { lagnaLon, shadbala: shadbalaFacts(sb), timeline: trees.timeline, now: nowUs, isDay, gulikaLon: upLon("gulika"), mandiLon: upLon("mandi") });

  const birthClock = local.hm;
  let delta = (jd - times.sunrise) * 86400;
  if (delta < 0) delta += 86400;
  const correction = belaantarMinutes(panchanga);
  const corrected = Math.max(0, delta - correction * 60);
  const [moonNak, moonPada] = nakshatraOf(moonLon);
  const yogaIndex = (((panchanga.yoga as Json)?.number as number) ?? 1) - 1;
  const yuddha = sb.yuddha && Object.keys(sb.yuddha as Json).length ? sb.yuddha : { wars: [], byPlanet: {} };
  const combustion: Json = {};
  for (const g of ALL) {
    if (g === "sun" || g === "rahu" || g === "ketu") combustion[g] = null;
    else if (g === "moon") combustion[g] = angularSep(moonLon, sunLon) < 12;
    else {
      const orb = combustOrb(g, raw[ALL.indexOf(g)].retrograde);
      combustion[g] = orb !== null && angularSep(lons[ALL.indexOf(g)], sunLon) < orb;
    }
  }
  const saturnNow = sky.positionsAt(nowJd, 7, false)?.longitude[6];
  const saturnRashi = saturnNow === undefined ? null : signOf(saturnNow) + 1;
  return {
    panchanga,
    shadbala: sb,
    dasha: trees.dasha,
    tribhagiDasha: trees.tribhagiDasha,
    yoginiDasha: trees.yoginiDasha,
    yuddha,
    bhavaBala: bhavaBala(lagnaLon, lons, sb),
    vimshopaka: vimshopaka(lons),
    ashtakavarga: ashtakavargaPayload(lons.slice(0, 7), lagnaLon),
    yogas: yogasApi(fullYogaCatalog(chart)),
    grahaShanti: grahaShanti(chart, saturnRashi),
    vargaCharts: vargaCharts(lagnaLon, raw),
    upagrahas: upagrahas(rows),
    avakahada: avakahada(moonLon, signOf(moonLon) + 1, lagnaRashi),
    birthMeta: {
      birthClock,
      isDayBirth: isDay,
      ishtaKala: ghadi(delta),
      ahoratriIshtaKala: ghadi(corrected),
      choghadiyaAtBirth: choghadiyaAtBirth(panchanga, birthClock),
      solarCorrectionMinutes: pyRound(correction, 4),
      moonNakshatra: { index: moonNak, number: moonNak + 1, pada: moonPada },
      yoga: { index: yogaIndex, number: yogaIndex + 1 },
    },
    combustion,
    lagnaRashi,
    ayanamsha: sky.system === "drik" ? "lahiri" : "surya_siddhanta",
    location: locationBlock({ ...place, year: 0, month: 0, day: 0 } as DayInput),
    birth_instant: local.iso,
    ...(q.era ? { era: q.era, language: q.language ?? eraLanguage(q.era) } : {}),
  };
}
