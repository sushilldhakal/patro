// The scored rashifal (`jyotish::rashifal`: `engine/jyotish/rashifal_engine.py` and its windows): daily, the
// Aitabar to Sanibar week, the BS month and the BS year (sampled every three days), all read at the observer's own
// sunrise from the reader's sky. Layers, weights and words are the server's; the tables are generated from its source.
import { bsDateOf, bsMonth, civilFromJdn } from "../../astronomy/lunar-month";
import { lagnaAt } from "../../astronomy/siddhanta-offline";
import type { Sky } from "../../astronomy/sky";
import { drikFrame } from "../../astronomy/drik-source";
import { ayanamshaAt } from "../../astronomy/siddhanta-offline";
import { dayTimes, nepaliDigits, varaAt, type Json, type Place } from "../../panchanga/engine/blocks";
import { hora as horaSlots } from "../../panchanga/engine/blocks";
import { planetTable } from "../../panchanga/engine/lagna-blocks";
import { pyInt, pyMod, pyRound, pyRoundInt } from "../../panchanga/engine/py";
import { NAVATARA, RASHI_NAMA_AKSHARAS_NE, RASHI_NAMES, RASHI_NAMES_NE, RASHI_TITLE_EN } from "../../panchanga/engine/tables.generated";
import * as T from "./tables.generated";

// ---------------------------------------------------------------- the grahas

export type Graha = "sun" | "moon" | "mars" | "mercury" | "jupiter" | "venus" | "saturn" | "rahu" | "ketu";
export const GRAHAS: readonly Graha[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];
const SEVEN: readonly Graha[] = GRAHAS.slice(0, 7);
const idx = (g: Graha) => GRAHAS.indexOf(g);
export const GRAHA_NE: Record<Graha, string> = { sun: "सूर्य", moon: "चन्द्र", mars: "मंगल", mercury: "बुध", jupiter: "बृहस्पति", venus: "शुक्र", saturn: "शनि", rahu: "राहु", ketu: "केतु" };
export const GRAHA_EN: Record<Graha, string> = { sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter", venus: "Venus", saturn: "Saturn", rahu: "Rahu", ketu: "Ketu" };
const EXALT: Partial<Record<Graha, number>> = { sun: 0, moon: 1, mars: 9, mercury: 5, jupiter: 3, venus: 11, saturn: 6 };
const OWN_SIGNS: Record<Graha, number[]> = { sun: [4], moon: [3], mars: [0, 7], mercury: [2, 5], jupiter: [8, 11], venus: [1, 6], saturn: [9, 10], rahu: [], ketu: [] };
const MOOLA: Partial<Record<Graha, [number, number, number]>> = { sun: [4, 0, 20], moon: [1, 4, 30], mars: [0, 0, 12], mercury: [5, 16, 20], jupiter: [8, 0, 10], venus: [6, 0, 15], saturn: [10, 0, 20] };
const FRIENDS: Record<Graha, Graha[]> = { sun: ["moon", "mars", "jupiter"], moon: ["sun", "mercury"], mars: ["sun", "moon", "jupiter"], mercury: ["sun", "venus"], jupiter: ["sun", "moon", "mars"], venus: ["mercury", "saturn"], saturn: ["mercury", "venus"], rahu: [], ketu: [] };
const ENEMIES: Record<Graha, Graha[]> = { sun: ["venus", "saturn"], mars: ["mercury"], mercury: ["moon"], jupiter: ["mercury", "venus"], venus: ["sun", "moon"], saturn: ["sun", "moon", "mars"], moon: [], rahu: [], ketu: [] };
const NAISARGIKA: Partial<Record<Graha, number>> = { sun: 60, moon: 51.43, venus: 42.86, jupiter: 34.29, mercury: 25.71, mars: 17.14, saturn: 8.57 };
export const SIGN_LORD: Graha[] = ["mars", "venus", "mercury", "moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn", "saturn", "jupiter"];

export const signOf = (longitude: number): number => pyInt(Math.floor(pyMod(longitude, 360) / 30)) % 12;

// ---------------------------------------------------------------- Ashtakavarga

export interface Ashtakavarga {
  /** Bindus of each graha's BAV (sun to saturn). */
  bav: number[][];
  lagnaBav: number[];
  sarva: number[];
}

/** `Ashtakavarga::cast`: the seven grahas' signs (sun to saturn) and the lagna's. */
export function castAshtakavarga(grahaSigns: number[], lagnaSign: number): Ashtakavarga {
  const base = [...grahaSigns, lagnaSign];
  const bhinna = (target: number): number[] => {
    const bindus = new Array<number>(12).fill(0);
    (T.BENEFIC_HOUSES[target] as readonly (readonly number[])[]).forEach((houses, contributor) => {
      for (const house of houses) bindus[(base[contributor] + house - 1) % 12] += 1;
    });
    return bindus;
  };
  const bav = SEVEN.map((_, t) => bhinna(t));
  const sarva = new Array<number>(12).fill(0);
  for (const row of bav) row.forEach((b, s) => (sarva[s] += b));
  return { bav, lagnaBav: bhinna(7), sarva };
}

// ---------------------------------------------------------------- the day frame

export interface Placement {
  longitude: number;
  degInRashi: number;
  retrograde: boolean;
  combust: boolean;
}
export interface DayFrame {
  jdn: number;
  jdSunrise: number;
  vaaraNum: number;
  positions: Placement[];
  grahaSign: number[];
  lagnaSign: number;
  tithiIndex: number;
  dayFraction: number;
  sav: number[];
  bav: number[][];
  hora: Json[] | null;
}
const sign = (f: DayFrame, g: Graha) => f.grahaSign[idx(g)];
const moonSign = (f: DayFrame) => sign(f, "moon");
const sunSign = (f: DayFrame) => sign(f, "sun");
const moonWaxing = (f: DayFrame) => f.tithiIndex < 15;
const NATONNATA_SWING = 0.6;
function natonnata(f: DayFrame, g: Graha): number {
  let share: number;
  if (g === "sun" || g === "jupiter" || g === "venus") share = f.dayFraction;
  else if (g === "moon" || g === "mars" || g === "saturn") share = 1 - f.dayFraction;
  else return 1;
  return 1 + (share - 0.5) * NATONNATA_SWING;
}
const RAD = Math.PI / 180;
function dayFractionFor(latitude: number, declination: number): number {
  const product = -Math.tan(latitude * RAD) * Math.tan(declination * RAD);
  if (product <= -1) return 1;
  if (product >= 1) return 0;
  return Math.acos(product) / RAD / 180;
}

/** `build_day_frame`: everything one sunrise contributes, made once and read twelve times. */
export function buildDayFrame(sky: Sky, jdn: number, place: Place, withHora: boolean): DayFrame | null {
  const times = dayTimes(sky, jdn, place);
  if (!times) return null;
  const jd = times.sunrise;
  const table = planetTable(sky, jd) as Record<string, Json>;
  const positions: Placement[] = [];
  const grahaSign: number[] = [];
  for (const g of GRAHAS) {
    const row = table[g];
    positions.push({ longitude: row.longitude as number, degInRashi: row.deg_in_rashi as number, retrograde: row.is_retrograde as boolean, combust: row.is_combust as boolean });
    grahaSign.push(signOf(row.longitude as number));
  }
  const asc = lagnaAt(sky.source, jd, place.latitude, place.longitude);
  if (asc === null) return null;
  const lagnaSign = pyInt(asc / 30) % 12;
  const lagnaLongitude = pyRound(asc, 6);
  const elongation = pyMod(positions[1].longitude - positions[0].longitude, 360);
  const tithiIndex = pyInt(Math.floor(elongation / 12));
  // The Sun's declination: the text's 24 degrees, or Drik's mean obliquity of date.
  const aya = sky.system === "drik" ? sky.positionsAt(jd, 1, false)?.ayanamsha ?? 0 : ayanamshaAt(jd);
  const lam = (positions[0].longitude + aya) * RAD;
  const eps = (sky.system === "drik" ? drikFrame.obliquityAt(jd) : 24) * RAD;
  const dec = pyRound(Math.asin(Math.sin(eps) * Math.sin(lam)) / RAD, 4);
  const dayFraction = dayFractionFor(place.latitude, dec);
  const av = castAshtakavarga(SEVEN.map((g) => grahaSign[idx(g)]), signOf(lagnaLongitude));
  const vaaraNum = varaAt(jd, place.timeZone);
  const hora = withHora ? horaSlots(times.sunrise, times.sunset, times.nextSunrise, vaaraNum, place.timeZone) : null;
  return { jdn, jdSunrise: jd, vaaraNum, positions, grahaSign, lagnaSign, tithiIndex, dayFraction: pyRound(dayFraction, 6), sav: av.sarva, bav: av.bav, hora };
}

// ---------------------------------------------------------------- tones and periods

export type Period = "daily" | "weekly" | "monthly" | "yearly";
export const PERIODS: Period[] = ["daily", "weekly", "monthly", "yearly"];
const pIndex = (p: Period) => PERIODS.indexOf(p);

const TONE_SCORE = [-1, -0.5, 0, 0.5, 1];
const toneFor = (score: number): number => (score >= 0.45 ? 4 : score >= 0.15 ? 3 : score > -0.15 ? 2 : score > -0.45 ? 1 : 0);
const toneFromKey = (key: string): number => (key === "worst" ? 0 : key === "bad" ? 1 : key === "good" ? 3 : key === "best" ? 4 : 2);
const toneKey = (tone: number) => T.TONE_KEYS[tone];

export const clampTo = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export const clamp = (value: number) => clampTo(value, -1, 1);
export const houseFrom = (target: number, reference: number) => ((target + 12 - reference) % 12) + 1;
export const percentOf = (score: number): number => pyRoundInt(((score + 1) / 2) * 100);

// ---------------------------------------------------------------- layers

function naisargikaFactor(g: Graha): number {
  const v = NAISARGIKA[g];
  if (v === undefined) return 1;
  const share = (v - 8.57) / (60 - 8.57);
  return 1 + (share - 0.5) * 0.25;
}

export interface GocharRow {
  graha: Graha;
  sign: number;
  house: number;
  favourable: boolean;
  vedhaBy: Graha | null;
  bindu: number | null;
  retrograde: boolean;
  combust: boolean;
  weight: number;
  score: number;
}

function vedhaBlocked(f: DayFrame, g: Graha, house: number, reference: number): Graha | null {
  const vedhaHouse = T.VEDHA[idx(g)][house];
  if (vedhaHouse === 0) return null;
  const vedhaSign = (reference + vedhaHouse - 1) % 12;
  for (const other of GRAHAS) {
    if (other === g || sign(f, other) !== vedhaSign) continue;
    if ((g === "sun" && other === "saturn") || (g === "saturn" && other === "sun") || (g === "moon" && other === "mercury") || (g === "mercury" && other === "moon")) continue;
    return other;
  }
  return null;
}
function binduFactor(f: DayFrame, g: Graha): [number | null, number] {
  if (idx(g) >= 7) return [null, 1];
  const bindu = f.bav[idx(g)][sign(f, g)];
  return [bindu, clampTo(1 + (bindu - 4) * 0.15, 0.4, 1.6)];
}

/** `gochar_rows`: every graha's transit from `reference`. */
export function gocharRows(f: DayFrame, reference: number, period: Period): GocharRow[] {
  const weights = T.GRAHA_PERIOD_WEIGHT[pIndex(period)];
  return GRAHAS.map((g) => {
    const s = sign(f, g);
    const house = houseFrom(s, reference);
    const favourable = (T.GOCHAR_BENEFIC_HOUSES[idx(g)] as readonly number[]).includes(house);
    let base = favourable ? 1 : -1;
    const blocker = vedhaBlocked(f, g, house, reference);
    if (blocker) base *= 0.15;
    const [bindu, factor] = binduFactor(f, g);
    let score = base * factor;
    const pos = f.positions[idx(g)];
    if (pos.combust) score *= 0.45;
    if (pos.retrograde && (g === "mars" || g === "jupiter" || g === "saturn" || g === "mercury" || g === "venus")) score *= 1.2;
    if (g === "moon") score *= moonWaxing(f) ? 1.15 : 0.8;
    return { graha: g, sign: s, house, favourable, vedhaBy: blocker, bindu, retrograde: pos.retrograde, combust: pos.combust, weight: pyRound(weights[idx(g)] * natonnata(f, g) * naisargikaFactor(g), 4), score: pyRound(clamp(score), 4) };
  });
}
export function gocharScore(rows: GocharRow[]): number {
  let total = rows.reduce((a, r) => a + r.weight, 0);
  if (total === 0) total = 1;
  return clamp(rows.reduce((a, r) => a + r.score * r.weight, 0) / total);
}

export interface Sudarshana {
  score: number;
}
function sudarshana(f: DayFrame, period: Period): Sudarshana {
  const refs = [f.lagnaSign, moonSign(f), sunSign(f)];
  const weights = [0.5, 0.3, 0.2];
  let total = 0;
  refs.forEach((reference, i) => {
    total += gocharScore(gocharRows(f, reference, period)) * weights[i];
  });
  return { score: pyRound(clamp(total), 4) };
}

export interface RashiLord {
  score: number;
  lord: Graha;
  house: number;
  sign: number;
  dignity: number;
  combust: boolean;
  retrograde: boolean;
}
/** `_dignity`: the index into `DIGNITY_KEYS` and the score. */
export function dignity(g: Graha, s: number, degreeInSign: number): [number, number] {
  const exalt = EXALT[g];
  if (exalt !== undefined) {
    if (s === exalt) return [0, 1];
    if (s === (exalt + 6) % 12) return [6, -1];
  }
  const moola = MOOLA[g];
  if (moola && s === moola[0] && moola[1] <= degreeInSign && degreeInSign <= moola[2]) return [1, 0.85];
  if (OWN_SIGNS[g].includes(s)) return [2, 0.7];
  const lord = SIGN_LORD[s];
  if (lord === g) return [2, 0.7];
  if (FRIENDS[g].includes(lord)) return [3, 0.4];
  if (ENEMIES[g].includes(lord)) return [5, -0.45];
  return [4, 0];
}
export function rashiLordBlock(f: DayFrame, rashi: number): RashiLord {
  const lord = SIGN_LORD[rashi];
  const pos = f.positions[idx(lord)];
  const s = sign(f, lord);
  const house = houseFrom(s, rashi);
  const [dig, digScore] = dignity(lord, s, pos.degInRashi);
  let score = 0.55 * digScore + 0.45 * T.HOUSE_STANDING[house];
  if (pos.combust) score -= 0.35;
  if (pos.retrograde) score -= 0.08;
  return { score: pyRound(clamp(score), 4), lord, house, sign: s, dignity: dig, combust: pos.combust, retrograde: pos.retrograde };
}

export interface Chandrabala {
  score: number;
  taraNum: number;
  tone: number;
}
const taraLabels = (c: Chandrabala): [string, string, string, string] => {
  const [tara, taraEn, quality, qualityEn] = NAVATARA[(c.taraNum - 1) % 9];
  return [tara, quality, taraEn, qualityEn];
};
export function chandrabalaBlock(f: DayFrame, rashi: number): Chandrabala {
  const diff = (moonSign(f) + 12 - rashi) % 12;
  const taraNum = diff === 0 ? 1 : ((9 - (diff % 9)) % 9) + 1;
  const tone = toneFromKey(NAVATARA[(taraNum - 1) % 9][4]);
  return { score: TONE_SCORE[tone], taraNum, tone };
}

export interface Moorti {
  score: number;
  kind: number;
  houseFromMoon: number;
}
export function moortiBlock(f: DayFrame, rashi: number): Moorti {
  const house = houseFrom(moonSign(f), rashi);
  const kind = T.MOORTI_BY_HOUSE[house];
  return { score: T.MOORTI_SCORE[kind], kind, houseFromMoon: house };
}

export interface AvBlock {
  score: number;
  sav: number;
  savTrikona: number;
  savKendra: number;
}
const sumBindus = (f: DayFrame, rashi: number, houses: number[]) => houses.reduce((a, h) => a + f.sav[(rashi + h - 1) % 12], 0);
export function ashtakavargaBlock(f: DayFrame, rashi: number): AvBlock {
  const own = f.sav[rashi];
  const trikona = sumBindus(f, rashi, [1, 5, 9]);
  const kendra = sumBindus(f, rashi, [1, 4, 7, 10]);
  const score = clamp(0.5 * ((own - 28) / 8) + 0.3 * ((trikona / 3 - 28) / 8) + 0.2 * ((kendra / 4 - 28) / 8));
  return { score: pyRound(score, 4), sav: own, savTrikona: pyRound(trikona / 3, 2), savKendra: pyRound(kendra / 4, 2) };
}

export interface Cycle {
  score: number;
  graha: Graha;
  house: number;
  sign: number;
}
export function cycleBlock(f: DayFrame, rashi: number, period: Period): Cycle {
  const graha = T.CYCLE_GRAHA[pIndex(period)] as Graha;
  const s = sign(f, graha);
  const house = houseFrom(s, rashi);
  return { score: pyRound(T.HOUSE_STANDING[house], 4), graha, house, sign: s };
}

const VARA_LORD: Graha[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
export interface VaaraHora {
  score: number;
  relation: number;
  dayLord: Graha;
  rashiLord: Graha;
  horaWindow: [string, string] | null;
}
export function vaaraHoraBlock(f: DayFrame, rashi: number): VaaraHora {
  const lord = SIGN_LORD[rashi];
  const dayLord = VARA_LORD[f.vaaraNum % 7];
  let score = 0;
  let relation = 2;
  if (dayLord === lord) [score, relation] = [0.8, 0];
  else if (FRIENDS[lord].includes(dayLord)) [score, relation] = [0.5, 1];
  else if (ENEMIES[lord].includes(dayLord)) [score, relation] = [-0.5, 3];
  const slot = f.hora?.find((s) => s.planet === lord && s.phase === "day");
  return { score, relation, dayLord, rashiLord: lord, horaWindow: slot ? [String(slot.start_local_time_short ?? ""), String(slot.end_local_time_short ?? "")] : null };
}

export interface Domain {
  key: number;
  score: number;
  raw: number;
  tenants: Graha[];
}
export function domainScores(f: DayFrame, rashi: number, rows: GocharRow[]): Domain[] {
  return T.DOMAIN_HOUSES.map((houses, key) => {
    const list = houses as readonly (readonly [number, number])[];
    const weightTotal = list.reduce((a, [, w]) => a + w, 0);
    const savTerm = list.reduce((a, [h, w]) => a + ((f.sav[(rashi + h - 1) % 12] - 28) / 8) * w, 0) / weightTotal;
    let tenantTotal = 0;
    let tenantWeight = 0;
    const tenants: Graha[] = [];
    for (const [house, w] of list) {
      for (const row of rows.filter((r) => r.house === house)) {
        tenantTotal += row.score * w;
        tenantWeight += w;
        tenants.push(row.graha);
      }
    }
    const transitTerm = tenantWeight === 0 ? 0 : tenantTotal / tenantWeight;
    const karakas = T.DOMAIN_KARAKA[key] as readonly Graha[];
    const karakaSum = karakas.reduce((a, k) => a + (rows.find((r) => r.graha === k)?.score ?? 0), 0);
    const raw = clamp(0.4 * savTerm + 0.4 * transitTerm + 0.2 * (karakaSum / karakas.length));
    return { key, score: pyRound(raw, 4), raw, tenants };
  });
}

export interface Scored {
  rashi: number;
  score: number;
  raw: number;
  gochar: number;
  rows: GocharRow[];
  chandrabala: Chandrabala;
  moorti: Moorti;
  ashtakavarga: AvBlock;
  rashiLord: RashiLord;
  sudarshana: Sudarshana;
  cycle: Cycle;
  vaara: VaaraHora;
  domains: Domain[];
}
export const layerScores = (s: Scored): number[] => [s.gochar, s.chandrabala.score, s.moorti.score, s.ashtakavarga.score, s.rashiLord.score, s.sudarshana.score, s.cycle.score, s.vaara.score];

export function scoreSign(f: DayFrame, rashi: number, period: Period): Scored {
  const rows = gocharRows(f, rashi, period);
  const s: Scored = {
    rashi,
    score: 0,
    raw: 0,
    gochar: gocharScore(rows),
    chandrabala: chandrabalaBlock(f, rashi),
    moorti: moortiBlock(f, rashi),
    ashtakavarga: ashtakavargaBlock(f, rashi),
    rashiLord: rashiLordBlock(f, rashi),
    sudarshana: sudarshana(f, period),
    cycle: cycleBlock(f, rashi, period),
    vaara: vaaraHoraBlock(f, rashi),
    domains: domainScores(f, rashi, rows),
    rows,
  };
  const weights = T.LAYER_WEIGHTS[pIndex(period)];
  s.raw = clamp(layerScores(s).reduce((a, v, i) => a + v * weights[i], 0));
  s.score = pyRound(s.raw, 4);
  return s;
}

// ---------------------------------------------------------------- the words

type Lang = "ne" | "en";
const num = (value: number, lang: Lang) => (lang === "ne" ? nepaliDigits(value) : String(value));
const grahaList = (names: string[], lang: Lang) => (lang === "ne" || names.length < 2 ? names.join(", ") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);
const lc = (s: string) => s.toLowerCase();

export function layerNote(index: number, s: Scored, lang: Lang): string {
  const ne = lang === "ne";
  switch (index) {
    case 1: {
      const [tara, quality, taraEn, qualityEn] = taraLabels(s.chandrabala);
      return ne ? `नवतारा ${tara} (${quality})` : `Navatara ${taraEn} — ${lc(qualityEn)}`;
    }
    case 2:
      return ne ? `गोचर चन्द्र ${s.moorti.houseFromMoon} भाव — मूर्ति ${T.MOORTI_NE[s.moorti.kind]}` : `Transit Moon in house ${s.moorti.houseFromMoon} — ${T.MOORTI_EN[s.moorti.kind]} moorti`;
    case 3:
      return ne ? `सर्वाष्टकवर्ग ${nepaliDigits(s.ashtakavarga.sav)} बिन्दु` : `Sarvashtakavarga ${s.ashtakavarga.sav} bindus`;
    case 4: {
      const l = s.rashiLord;
      return ne ? `राशिस्वामी ${GRAHA_NE[l.lord]} ${l.house} भावमा, ${T.DIGNITY_NE[l.dignity]}` : `Sign lord ${GRAHA_EN[l.lord]} in house ${l.house}, ${lc(T.DIGNITY_EN[l.dignity])}`;
    }
    case 5:
      return ne ? "लग्न, चन्द्र र सूर्य — तीनै चक्रको संयुक्त फल" : "Combined verdict of the lagna, Chandra and Surya chakras";
    case 6:
      return ne ? `${GRAHA_NE[s.cycle.graha]} ${s.cycle.house} भावमा` : `${GRAHA_EN[s.cycle.graha]} in house ${s.cycle.house}`;
    case 7: {
      const v = s.vaara;
      return ne ? `वारपति ${GRAHA_NE[v.dayLord]} — राशिस्वामीसँग ${T.RELATION_NE[v.relation]}` : `Day lord ${GRAHA_EN[v.dayLord]} — ${T.RELATION_EN[v.relation]} to the sign lord`;
    }
    default:
      return "";
  }
}

function primaryHouse(domain: number): number {
  const houses = T.DOMAIN_HOUSES[domain] as readonly (readonly [number, number])[];
  let best = houses[0];
  for (const h of houses.slice(1)) if (h[1] > best[1]) best = h;
  return best[0];
}
function savNote(sav: number, lang: Lang): string {
  const ne = lang === "ne";
  const count = ne ? nepaliDigits(sav) : String(sav);
  if (sav >= 30) return ne ? `अष्टकवर्गमा यस राशिमा ${count} बिन्दु छन् — औसतभन्दा बलियो आधार, जसले प्रतिकूल गोचरको असर पनि खुम्च्याइदिन्छ।` : `The sign holds ${count} Ashtakavarga bindus — an above-average base, which blunts even an adverse transit.`;
  if (sav <= 25) return ne ? `अष्टकवर्गमा यस राशिमा ${count} बिन्दु मात्र छन् — आधार पातलो भएकाले अनुकूल गोचरको फल पनि पूरै नआउन सक्छ।` : `The sign holds only ${count} Ashtakavarga bindus — a thin base, so even a favourable transit may not deliver in full.`;
  return ne ? `अष्टकवर्गमा यस राशिमा ${count} बिन्दु छन् — औसत आधार, जसले गोचरको फल जस्ताको तस्तै देखाउँछ।` : `The sign holds ${count} Ashtakavarga bindus — an average base, which lets the transits read much as they stand.`;
}
function loudest(rows: GocharRow[]): GocharRow {
  let best = rows[0];
  for (const r of rows.slice(1)) if (Math.abs(r.score) * r.weight > Math.abs(best.score) * best.weight) best = r;
  return best;
}
export function culprit(rows: GocharRow[]): number {
  let best = rows[0];
  for (const r of rows.slice(1)) if (r.score * r.weight < best.score * best.weight) best = r;
  return idx(best.graha);
}
export const remedy = (rows: GocharRow[], lang: Lang): string => (lang === "ne" ? T.REMEDY_NE : T.REMEDY_EN)[culprit(rows)];

export interface Inputs {
  tone: number;
  period: Period;
  rows: GocharRow[];
  domains: [number, number][];
  lord: RashiLord;
  chandra: Chandrabala;
  moorti: Moorti;
  sav: number;
  cycle: Cycle;
  vaara: VaaraHora;
}
/** Tone words a caller may swap (the personal rashifal has its own). */
export interface ToneWords {
  opener: readonly string[];
  closer: readonly string[];
}
export const TONE_WORDS: Record<Lang, ToneWords> = { ne: { opener: T.TONE_OPENER_NE, closer: T.TONE_CLOSER_NE }, en: { opener: T.TONE_OPENER_EN, closer: T.TONE_CLOSER_EN } };

export function compose(inp: Inputs, lang: Lang, words: ToneWords = TONE_WORDS[lang]): string {
  const ne = lang === "ne";
  const pi = pIndex(inp.period);
  const ti = inp.tone;
  const periodWord = ne ? T.PERIOD_NE[pi] : T.PERIOD_EN[pi];
  const parts: string[] = [words.opener[ti].replace("{period}", periodWord)];
  const ranked = [...inp.domains].sort((a, b) => b[1] - a[1]);
  const strong = ranked[0];
  const weak = ranked[ranked.length - 1];
  if (strong[1] > 0.08) {
    const house = primaryHouse(strong[0]);
    parts.push(ne ? `${T.DOMAIN_NE[strong[0]]} पक्ष बलियो छ — ${T.HOUSE_THEME_NE[house]}मा ध्यान दिँदा प्रतिफल मिल्छ।` : `${T.DOMAIN_EN[strong[0]]} is the strong side — attention to ${T.HOUSE_THEME_EN[house]} pays off.`);
  }
  if (weak[1] < -0.08) {
    const house = primaryHouse(weak[0]);
    parts.push(ne ? `${T.DOMAIN_NE[weak[0]]} पक्षमा भने सतर्कता चाहिन्छ; ${T.HOUSE_THEME_NE[house]}सँग जोडिएका कुरामा हतार नगर्नुहोस्।` : `Take extra care on the ${lc(T.DOMAIN_EN[weak[0]])} side — do not rush what touches ${T.HOUSE_THEME_EN[house]}.`);
  }
  const loud = loudest(inp.rows);
  const loudHouse = num(loud.house, lang);
  const loudSign = ne ? RASHI_NAMES_NE[loud.sign] : RASHI_NAMES[loud.sign];
  const house = loud.house;
  if (loud.vedhaBy) {
    parts.push(ne ? `${GRAHA_NE[loud.graha]} ${loudSign} राशि हुँदै ${loudHouse} भावमा छन् तर ${GRAHA_NE[loud.vedhaBy]}को वेध परेकाले फल रोकिन्छ — नतिजा ढिलो आउँछ।` : `${GRAHA_EN[loud.graha]} moves through ${loudSign} into house ${house} but ${GRAHA_EN[loud.vedhaBy]} obstructs it, so the result stalls and arrives late.`);
  } else if (loud.favourable) {
    parts.push(ne ? `${GRAHA_NE[loud.graha]} ${loudSign} राशिबाट ${loudHouse} भावमा रहेकाले ${T.HOUSE_THEME_NE[house]}मा प्रत्यक्ष साथ मिल्छ।` : `${GRAHA_EN[loud.graha]} transiting ${loudSign} into house ${house} gives direct support to ${T.HOUSE_THEME_EN[house]}.`);
  } else {
    parts.push(ne ? `${GRAHA_NE[loud.graha]} ${loudSign} राशिबाट ${loudHouse} भावमा रहेकाले ${T.HOUSE_THEME_NE[house]}मा दबाब पर्न सक्छ; यसै क्षेत्रमा बढी सचेत रहनुहोस्।` : `${GRAHA_EN[loud.graha]} in ${loudSign}, house ${house}, can press on ${T.HOUSE_THEME_EN[house]} — that is the area to stay alert in.`);
  }
  const name = (r: GocharRow) => (ne ? GRAHA_NE[r.graha] : GRAHA_EN[r.graha]);
  const vakri = inp.rows.filter((r) => r.retrograde).map(name);
  const asta = inp.rows.filter((r) => r.combust).map(name);
  if (vakri.length) {
    const names = grahaList(vakri, lang);
    const verb = vakri.length === 1 ? "stands" : "stand";
    parts.push(ne ? `${names} वक्री रहेकाले अघि सुरु गरेर अलपत्र परेका काम फेरि अगाडि आउँछन् — नयाँ थाल्नुभन्दा अधुरो काम टुङ्ग्याउन यो समय राम्रो हो।` : `${names} ${verb} retrograde, so unfinished business started earlier resurfaces — a better window for closing what is open than for starting something new.`);
  }
  if (asta.length) {
    const names = grahaList(asta, lang);
    const [verb, pronoun] = asta.length === 1 ? ["is", "it"] : ["are", "they"];
    parts.push(ne ? `${names} अस्त भएकाले त्यससँग जोडिएको विषयमा अहिले निर्णय गर्न हतार नगर्नुहोस्।` : `${names} ${verb} combust, so hold off on decisions tied to what ${pronoun} signifies.`);
  }
  parts.push(savNote(inp.sav, lang));
  const sl = inp.lord;
  parts.push(ne ? `राशिस्वामी ${GRAHA_NE[sl.lord]} ${num(sl.house, lang)} भावमा ${T.DIGNITY_NE[sl.dignity]} अवस्थामा छन्, त्यसैले ${T.HOUSE_THEME_NE[sl.house]}सँग जोडिएको प्रयासले नै समग्र फल निर्धारण गर्छ।` : `The sign lord ${GRAHA_EN[sl.lord]} stands in house ${sl.house}, ${lc(T.DIGNITY_EN[sl.dignity])}, so effort tied to ${T.HOUSE_THEME_EN[sl.house]} is what decides the overall result.`);
  if (inp.period === "daily" || inp.period === "weekly") {
    const [tara, quality, taraEn, qualityEn] = taraLabels(inp.chandra);
    const m = inp.moorti;
    parts.push(ne ? `चन्द्रबल ${tara} (${quality}) र गोचर चन्द्र जन्म राशिबाट ${num(m.houseFromMoon, lang)} भावमा — मूर्ति ${T.MOORTI_NE[m.kind]}।` : `Chandrabala is ${taraEn} (${lc(qualityEn)}), with the transit Moon ${m.houseFromMoon} houses from the sign — a ${T.MOORTI_EN[m.kind]} moorti.`);
    const v = inp.vaara;
    parts.push(ne ? `वारपति ${GRAHA_NE[v.dayLord]} राशिस्वामीसँग ${T.RELATION_NE[v.relation]} छन्।` : `The day lord ${GRAHA_EN[v.dayLord]} is ${T.RELATION_EN[v.relation]}.`);
  } else {
    const c = inp.cycle;
    parts.push(ne ? `${periodWord}को कालचक्रमा ${GRAHA_NE[c.graha]} ${RASHI_NAMES_NE[c.sign]} राशि हुँदै ${num(c.house, lang)} भावमा छन्, जसले सिङ्गो अवधिको गति निर्धारण गर्छ।` : `For ${lc(periodWord)} the time-lord ${GRAHA_EN[c.graha]} runs through ${RASHI_NAMES[c.sign]} in house ${c.house}, setting the pace of the whole window.`);
  }
  if (inp.tone === 0 || inp.tone === 1) parts.push(remedy(inp.rows, lang));
  parts.push(words.closer[ti]);
  return parts.join(" ");
}

// ---------------------------------------------------------------- payloads

const AGGREGATE_PEAK_WEIGHT = 0.35;
const grade = (percent: number): Json => {
  const g = (T.GRADE_FLOOR as readonly (readonly [number, string, string, string])[]).find((x) => percent >= x[0]) ?? [0, "nil", "निर्बल", "Nil"];
  return { grade: g[1], grade_ne: g[2], grade_en: g[3] };
};
const identity = (rashi: number): Json => ({ index: rashi, id: rashi + 1, name: RASHI_NAMES_NE[rashi], name_en: RASHI_NAMES[rashi], title_en: RASHI_TITLE_EN[rashi], syllables_ne: RASHI_NAMA_AKSHARAS_NE[rashi] });
function lordLuck(rashi: number, horaWindow: [string, string] | null): Json {
  const lord = SIGN_LORD[rashi];
  const i = idx(lord);
  const number = T.LORD_NUMBER[i];
  return {
    lucky_lord: lord,
    lucky_lord_ne: GRAHA_NE[lord],
    lucky_lord_en: GRAHA_EN[lord],
    lucky_color_ne: T.LORD_COLOR_NE[i],
    lucky_color_en: T.LORD_COLOR_EN[i],
    lucky_number: number,
    lucky_number_ne: nepaliDigits(number),
    lucky_number_en: String(number),
    lucky_direction_ne: T.LORD_DISHA_NE[i],
    lucky_direction_en: T.LORD_DISHA_EN[i],
    lucky_time: horaWindow ? { planet: lord, planet_ne: GRAHA_NE[lord], planet_en: GRAHA_EN[lord], start_local_time_short: horaWindow[0], end_local_time_short: horaWindow[1], phase: "day" } : null,
  };
}
export const lordJson = (l: RashiLord): Json => ({ score: l.score, lord: l.lord, lord_ne: GRAHA_NE[l.lord], lord_en: GRAHA_EN[l.lord], house: l.house, sign: l.sign + 1, sign_ne: RASHI_NAMES_NE[l.sign], sign_en: RASHI_NAMES[l.sign], dignity: T.DIGNITY_KEYS[l.dignity], dignity_ne: T.DIGNITY_NE[l.dignity], dignity_en: T.DIGNITY_EN[l.dignity], combust: l.combust, retrograde: l.retrograde });
export const rowsJson = (rows: GocharRow[]): Json[] =>
  rows.map((r) => ({
    graha: r.graha,
    graha_ne: GRAHA_NE[r.graha],
    graha_en: GRAHA_EN[r.graha],
    sign: r.sign + 1,
    sign_ne: RASHI_NAMES_NE[r.sign],
    sign_en: RASHI_NAMES[r.sign],
    house: r.house,
    favourable: r.favourable,
    vedha_by: r.vedhaBy,
    vedha_by_ne: r.vedhaBy ? GRAHA_NE[r.vedhaBy] : null,
    bindu: r.bindu,
    retrograde: r.retrograde,
    combust: r.combust,
    weight: r.weight,
    score: r.score,
  }));
const avJson = (a: AvBlock): Json => ({ score: a.score, sav: a.sav, sav_trikona: a.savTrikona, sav_kendra: a.savKendra });
const cycleJson = (c: Cycle): Json => ({ score: c.score, graha: c.graha, graha_ne: GRAHA_NE[c.graha], graha_en: GRAHA_EN[c.graha], house: c.house, sign: c.sign + 1, sign_ne: RASHI_NAMES_NE[c.sign], sign_en: RASHI_NAMES[c.sign] });
function domainJson(key: number, score: number, value: number, tenants: Graha[]): Json {
  const houses = (T.DOMAIN_HOUSES[key] as readonly (readonly [number, number])[]).map(([h]) => h).sort((a, b) => a - b);
  return { key: T.DOMAIN_KEYS[key], label_ne: T.DOMAIN_NE[key], label_en: T.DOMAIN_EN[key], score, percent: percentOf(value), tone: toneKey(toneFor(value)), houses, karaka: [...(T.DOMAIN_KARAKA[key] as readonly Graha[])], tenants };
}
/** The layer names, weights and words of a rashifal flavour (general or personal). */
export interface LayerSet {
  keys: readonly string[];
  labelNe: readonly string[];
  labelEn: readonly string[];
  weights: readonly (readonly number[])[];
}
export const GENERAL_LAYERS: LayerSet = { keys: T.LAYER_KEYS, labelNe: T.LAYER_LABEL_NE, labelEn: T.LAYER_LABEL_EN, weights: T.LAYER_WEIGHTS };
const component = (layers: LayerSet, i: number, value: number, weight: number, note: (i: number, lang: Lang) => string): Json => ({
  key: layers.keys[i],
  label_ne: layers.labelNe[i],
  label_en: layers.labelEn[i],
  score: pyRound(value, 4),
  percent: percentOf(value),
  weight,
  tone: toneKey(toneFor(value)),
  note_ne: note(i, "ne"),
  note_en: note(i, "en"),
});
export function components(layers: LayerSet, values: number[], period: Period, note: (i: number, lang: Lang) => string): Json[] {
  const weights = layers.weights[pIndex(period)];
  const order = values.map((_, i) => i).filter((i) => weights[i] > 0).sort((a, b) => weights[b] - weights[a]);
  return order.map((i) => component(layers, i, values[i], weights[i], note));
}
const inputsOf = (s: Scored, tone: number, period: Period, domains: [number, number][]): Inputs => ({ tone, period, rows: s.rows, domains, lord: s.rashiLord, chandra: s.chandrabala, moorti: s.moorti, sav: s.ashtakavarga.sav, cycle: s.cycle, vaara: s.vaara });
function legacyFields(s: Scored): Json {
  const [tara, quality] = taraLabels(s.chandrabala);
  const m = s.moorti;
  return { tara, quality, tara_num: s.chandrabala.taraNum, house_from_moon: m.houseFromMoon, moorti: T.MOORTI_KEYS[m.kind], moorti_ne: T.MOORTI_NE[m.kind], moorti_en: T.MOORTI_EN[m.kind] };
}

/** `build_sign_payload`. */
export function signPayload(f: DayFrame, rashi: number, period: Period): Json {
  const s = scoreSign(f, rashi, period);
  const tone = toneFor(s.raw);
  const percent = percentOf(s.raw);
  const domains = s.domains.map((d): [number, number] => [d.key, d.score]);
  return {
    ...identity(rashi),
    ...lordLuck(rashi, s.vaara.horaWindow),
    score: s.score,
    percent,
    stars: tone + 1,
    tone: toneKey(tone),
    ...grade(percent),
    ...legacyFields(s),
    rashi_lord: lordJson(s.rashiLord),
    components: components(GENERAL_LAYERS, layerScores(s), period, (i, lang) => layerNote(i, s, lang)),
    domains: s.domains.map((d) => domainJson(d.key, d.score, d.raw, d.tenants)),
    gochar: rowsJson(s.rows),
    ashtakavarga: avJson(s.ashtakavarga),
    cycle: cycleJson(s.cycle),
    remedy_ne: remedy(s.rows, "ne"),
    remedy_en: remedy(s.rows, "en"),
    prediction_ne: compose(inputsOf(s, tone, period, domains), "ne"),
    prediction_en: compose(inputsOf(s, tone, period, domains), "en"),
  };
}

const BS_MONTH_NAMES = ["Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
const BS_MONTH_NAMES_NE = ["बैशाख", "जेठ", "आषाढ", "श्रावण", "भाद्र", "आश्विन", "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत्र"];
const isoOf = (jdn: number) => {
  const c = civilFromJdn(jdn);
  return `${String(c.year).padStart(4, "0")}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
};
export const bsLabelText = (jdn: number): string | null => {
  const bs = bsDateOf(jdn);
  return bs ? `${bs.year} ${BS_MONTH_NAMES_NE[bs.month - 1]} ${bs.day}` : null;
};
const dayMarker = (f: DayFrame, score: number): Json => ({ date_ad: isoOf(f.jdn), date_bs: bsLabelText(f.jdn), score: pyRound(score, 4), percent: percentOf(score), tone: toneKey(toneFor(score)) });
const mean = (values: number[]) => values.reduce((a, v) => a + v, 0) / values.length;

/** `aggregate_sign`: a window of frames merged into one reading. */
export function aggregateSign(rashi: number, frames: DayFrame[], period: Period): Json {
  const scored = frames.map((f) => scoreSign(f, rashi, period));
  const n = scored.length;
  const avg = mean(scored.map((s) => s.score));
  let bestI = 0;
  let worstI = 0;
  scored.forEach((s, i) => {
    if (s.score > scored[bestI].score) bestI = i;
    if (s.score < scored[worstI].score) worstI = i;
  });
  const best = scored[bestI].score;
  const worst = scored[worstI].score;
  const peak = Math.abs(worst) > Math.abs(best) ? worst : best;
  const score = clamp(avg * (1 - AGGREGATE_PEAK_WEIGHT) + peak * AGGREGATE_PEAK_WEIGHT);
  const tone = toneFor(score);
  const layerMeans = Array.from({ length: 8 }, (_, k) => mean(scored.map((s) => layerScores(s)[k])));
  const domainValues = T.DOMAIN_KEYS.map((_, i) => clamp(mean(scored.map((s) => s.domains[i].score))));
  const domainRounded = domainValues.map((v, i): [number, number] => [i, pyRound(v, 4)]);
  const mid = scored[Math.floor(n / 2)];
  const pct = percentOf(score);
  const bestMarker = dayMarker(frames[bestI], best);
  const weakMarker = dayMarker(frames[worstI], worst);
  const label = (m: Json) => String(m.date_bs ?? m.date_ad ?? "");
  const base = (lang: Lang) => compose(inputsOf(mid, tone, period, domainRounded), lang);
  return {
    ...identity(rashi),
    ...lordLuck(rashi, null),
    score: pyRound(score, 4),
    percent: pct,
    stars: tone + 1,
    tone: toneKey(tone),
    ...grade(pct),
    mean_score: pyRound(clamp(avg), 4),
    ...legacyFields(mid),
    rashi_lord: lordJson(mid.rashiLord),
    components: components(GENERAL_LAYERS, layerMeans, period, (i, lang) => layerNote(i, scored[0], lang)),
    domains: domainRounded.map(([i, r]) => domainJson(i, r, domainValues[i], [])),
    gochar: rowsJson(mid.rows),
    ashtakavarga: avJson(mid.ashtakavarga),
    cycle: cycleJson(mid.cycle),
    days_in_period: frames.length,
    best_day: bestMarker,
    weak_day: weakMarker,
    remedy_ne: remedy(mid.rows, "ne"),
    remedy_en: remedy(mid.rows, "en"),
    prediction_ne: `${base("ne")} यस अवधिको सबैभन्दा अनुकूल दिन ${nepaliDigits(label(bestMarker))}, सबैभन्दा सतर्क रहनुपर्ने दिन ${nepaliDigits(label(weakMarker))}।`,
    prediction_en: `${base("en")} The strongest day in this window is ${bestMarker.date_ad}; the one to watch is ${weakMarker.date_ad}.`,
  };
}

/** `detect_ingresses`: sign changes between consecutive frames. */
export function ingresses(frames: DayFrame[], grahas: readonly Graha[], rashi: number | null): Json[] {
  const events: Json[] = [];
  for (let i = 1; i < frames.length; i += 1) {
    const prev = frames[i - 1];
    const curr = frames[i];
    for (const g of grahas) {
      const from = sign(prev, g);
      const to = sign(curr, g);
      if (from === to) continue;
      const event: Json = { graha: g, graha_ne: GRAHA_NE[g], graha_en: GRAHA_EN[g], date_ad: isoOf(curr.jdn), date_bs: bsLabelText(curr.jdn), from_sign: from + 1, from_sign_ne: RASHI_NAMES_NE[from], to_sign: to + 1, to_sign_ne: RASHI_NAMES_NE[to], to_sign_en: RASHI_NAMES[to] };
      if (rashi !== null) {
        event.from_house = houseFrom(from, rashi);
        event.to_house = houseFrom(to, rashi);
      }
      events.push(event);
    }
  }
  return events;
}
export const frameSummary = (f: DayFrame): Json => {
  const [moon, sun, lagna] = [moonSign(f), sunSign(f), f.lagnaSign];
  return {
    date_ad: isoOf(f.jdn),
    jd_sunrise: f.jdSunrise,
    vaara_num: f.vaaraNum,
    paksha: moonWaxing(f) ? "shukla" : "krishna",
    tithi_index: f.tithiIndex,
    day_fraction: f.dayFraction,
    moon_sign: moon + 1,
    moon_sign_ne: RASHI_NAMES_NE[moon],
    moon_sign_en: RASHI_NAMES[moon],
    sun_sign: sun + 1,
    sun_sign_ne: RASHI_NAMES_NE[sun],
    sun_sign_en: RASHI_NAMES[sun],
    lagna_sign: lagna + 1,
    lagna_sign_ne: RASHI_NAMES_NE[lagna],
    lagna_sign_en: RASHI_NAMES[lagna],
    sarvashtakavarga: f.sav,
  };
};
export function methodBlock(period: Period, sampleStep: number, days: number): Json {
  const p = pIndex(period);
  return {
    frame: "surya_siddhanta",
    ayanamsa: "Surya Siddhanta",
    anchor: "sunrise",
    engine: "rashifal_v2",
    layers: [...T.LAYER_KEYS],
    layer_weights: Object.fromEntries(T.LAYER_KEYS.map((k, i) => [k, T.LAYER_WEIGHTS[p][i]])),
    graha_weights: Object.fromEntries(GRAHAS.map((g, i) => [g, T.GRAHA_PERIOD_WEIGHT[p][i]])),
    cycle_graha: T.CYCLE_GRAHA[p],
    gochar: "brihat_samhita_benefic_houses_with_vedha",
    ashtakavarga: "transit_chart_bav_sav (no natal chart in a rashi column)",
    sudarshana: "udaya_lagna + chandra + surya chakras (day-wide)",
    chandrabala: "navatara_9_cycle",
    moorti: "transit_moon_house_from_janma_rashi",
    lucky_fields: "rashi_lord (colour, number, direction, hora)",
    natonnata: "day_fraction from observer latitude x solar declination",
    naisargika: "natural-bala nudge of +/-12% on the graha weights",
    grade_scale: "vimshopaka four-grade (full/medium/small/nil)",
    aggregate: period === "daily" ? "daily" : "mean blended 35% toward the window's peak day",
    sample_step_days: sampleStep,
    days_computed: days,
  };
}

// ---------------------------------------------------------------- windows

const INGRESS_GRAHAS: Record<Period, Graha[]> = { daily: [], weekly: ["moon", "mercury", "venus", "sun"], monthly: ["sun", "mercury", "venus", "mars"], yearly: ["jupiter", "saturn", "rahu", "ketu", "mars"] };
const YEARLY_SAMPLE_STEP = 3;
/** Monday = 0, as `date.weekday()`. */
const weekday = (jdn: number) => jdn % 7;
const weekStart = (jdn: number) => jdn - ((weekday(jdn) + 1) % 7);
function bsLabel(jdn: number): Json | null {
  const bs = bsDateOf(jdn);
  if (!bs) return null;
  return { bs_year: bs.year, bs_month: bs.month, bs_day: bs.day, bs_month_name_ne: BS_MONTH_NAMES_NE[bs.month - 1], bs_month_name_en: BS_MONTH_NAMES[bs.month - 1] };
}
function framesForRange(sky: Sky, start: number, end: number, place: Place, step: number): DayFrame[] | null {
  const frames: DayFrame[] = [];
  for (let d = start; d <= end; d += step) {
    const f = buildDayFrame(sky, d, place, false);
    if (!f) return null;
    frames.push(f);
  }
  if (frames[frames.length - 1].jdn !== end) {
    const f = buildDayFrame(sky, end, place, false);
    if (!f) return null;
    frames.push(f);
  }
  return frames;
}
function aggregate(period: Period, frames: DayFrame[], sampleStep: number): Json {
  const mid = frames[Math.floor(frames.length / 2)];
  const moon = moonSign(mid);
  return {
    period,
    anchor: "sunrise",
    range_start_ad: isoOf(frames[0].jdn),
    range_end_ad: isoOf(frames[frames.length - 1].jdn),
    days_computed: frames.length,
    moon_index: moon,
    moon_label: RASHI_NAMES_NE[moon],
    moon_label_en: RASHI_NAMES[moon],
    signs: Array.from({ length: 12 }, (_, r) => aggregateSign(r, frames, period)),
    frame: frameSummary(mid),
    ingress: ingresses(frames, INGRESS_GRAHAS[period], null),
    method: methodBlock(period, sampleStep, frames.length),
  };
}

/** The frames a window reads (the personal rashifal reads the same ones against a birth chart). */
export function windowFrames(sky: Sky, jdn: number, place: Place, period: Period): { frames: DayFrame[]; extra: Json; step: number } | null {
  if (period === "daily") {
    const f = buildDayFrame(sky, jdn, place, true);
    return f ? { frames: [f], extra: {}, step: 1 } : null;
  }
  if (period === "weekly") {
    const start = weekStart(jdn);
    const frames = framesForRange(sky, start, start + 6, place, 1);
    const label = bsLabel(start);
    return frames && label ? { frames, extra: label, step: 1 } : null;
  }
  const bs = bsDateOf(jdn);
  if (!bs) return null;
  if (period === "monthly") {
    const range = bsMonth(bs.year, bs.month);
    if (!range) return null;
    const frames: DayFrame[] = [];
    for (let i = 0; i < range.length; i += 1) {
      const f = buildDayFrame(sky, range.first + i, place, false);
      if (!f) return null;
      frames.push(f);
    }
    return { frames, extra: { bs_year: bs.year, bs_month: bs.month, bs_month_name_ne: BS_MONTH_NAMES_NE[bs.month - 1], bs_month_name_en: BS_MONTH_NAMES[bs.month - 1] }, step: 1 };
  }
  const first = bsMonth(bs.year, 1);
  const next = bsMonth(bs.year + 1, 1);
  if (!first || !next) return null;
  const frames = framesForRange(sky, first.first, next.first - 1, place, YEARLY_SAMPLE_STEP);
  return frames ? { frames, extra: { bs_year: bs.year }, step: YEARLY_SAMPLE_STEP } : null;
}

/** `rashifal_for_gregorian(greg, location, period=…)`: the scored rashifal for the window `period` places around the civil day `jdn`. */
export function rashifalForDay(sky: Sky, jdn: number, place: Place, period: Period): Json | null {
  const w = windowFrames(sky, jdn, place, period);
  if (!w) return null;
  if (period === "daily") {
    const frame = w.frames[0];
    const moon = moonSign(frame);
    const label = bsLabel(jdn);
    if (!label) return null;
    return {
      period: "daily",
      anchor: "sunrise",
      date_ad: isoOf(jdn),
      ...label,
      vaara_num: frame.vaaraNum,
      moon_index: moon,
      moon_label: RASHI_NAMES_NE[moon],
      moon_label_en: RASHI_NAMES[moon],
      signs: Array.from({ length: 12 }, (_, r) => signPayload(frame, r, "daily")),
      frame: frameSummary(frame),
      method: methodBlock("daily", 1, 1),
    };
  }
  return { ...aggregate(period, w.frames, w.step), ...w.extra };
}

// ---------------------------------------------------------------- the personal rashifal (`rashifal_personal.py`)
// Every layer counted from the birth Lagna, transit bindus read from the natal Ashtakavarga, and the running
// Vimshottari Mahadasha and Antardasha as a layer of its own. Dasha times are wall-clock Julian Days (the birth
// zone's clock read as if it were UTC), as the server keeps them.

import { localInstant } from "../../panchanga/engine/midnight";
import { utcOffsetMinutes } from "../../astronomy/lunar-month";
import { wallAt } from "../../panchanga/engine/instant";

const YEAR_DAYS = 365.2425;
const DASHA_ORDER: Graha[] = ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"];
const DASHA_YEARS: Record<Graha, number> = { ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17 };
const DASHA_LORD_NE: Record<Graha, string> = { ketu: "केतु", venus: "शुक्र", sun: "सूर्य", moon: "चन्द्र", mars: "मङ्गल", rahu: "राहु", jupiter: "गुरु", saturn: "शनि", mercury: "बुध" };

export interface NatalChart {
  /** The birth moment on its zone's wall clock, as a naive Julian Day. */
  wall: number;
  zone: string;
  lagnaSign: number;
  sign: number[];
  degree: number[];
  sav: number[];
  bav: number[][];
  moonNak: number;
}
const natalMoonSign = (n: NatalChart) => n.sign[1];
const natalSunSign = (n: NatalChart) => n.sign[0];
const signLon = (n: NatalChart, g: Graha) => n.sign[idx(g)] * 30 + n.degree[idx(g)];

/**
 * The nine grahas' sidereal longitudes at the birth instant, from the reader's sky. The server's Moon differs from the
 * stored file's by up to about three arcseconds at some instants, which moves a dasha boundary by an hour or two
 * (never a day, outside the day a boundary falls near midnight).
 */
function natalLongitudes(sky: Sky, utc: number): number[] {
  const table = planetTable(sky, utc) as Record<string, Json>;
  return GRAHAS.map((g) => table[g].longitude as number);
}

/** `build_natal_chart`: `utc` is the birth moment, `wall` its wall clock in `zone`. */
export function castNatal(sky: Sky, utc: number, wall: number, zone: string, lat: number, lon: number): NatalChart | null {
  const longitudes = natalLongitudes(sky, utc);
  const sign = longitudes.map((l) => signOf(l));
  const degree = longitudes.map((l) => pyRound(pyMod(pyMod(l, 360), 30), 6));
  const moonNak = Math.trunc(longitudes[1] / (360 / 27)) % 27;
  const asc = lagnaAt(sky.source, utc, lat, lon);
  if (asc === null) return null;
  const lagnaSign = signOf(pyRound(asc, 6));
  const av = castAshtakavarga(SEVEN.map((g) => sign[idx(g)]), lagnaSign);
  return { wall, zone, lagnaSign, sign, degree, sav: av.sarva, bav: av.bav, moonNak };
}

interface DashaPeriod {
  lord: Graha;
  start: number;
  end: number;
}
function vimshottariTimeline(moonLongitude: number, birth: number, cycles: number): DashaPeriod[] {
  const span = 360 / 27;
  const lon = pyMod(moonLongitude, 360);
  const nak = pyInt(Math.floor(lon / span));
  const lord = DASHA_ORDER[nak % 9];
  const balanceYears = (1 - pyMod(lon, span) / span) * DASHA_YEARS[lord];
  const start = DASHA_ORDER.indexOf(lord);
  const firstEnd = birth + balanceYears * YEAR_DAYS;
  const periods: DashaPeriod[] = [{ lord, start: birth, end: firstEnd }];
  let cursor = firstEnd;
  for (let step = 1; step < DASHA_ORDER.length * cycles; step += 1) {
    const next = DASHA_ORDER[(start + step) % 9];
    const end = cursor + DASHA_YEARS[next] * YEAR_DAYS;
    periods.push({ lord: next, start: cursor, end });
    cursor = end;
  }
  return periods;
}
function subPeriods(lord: Graha, start: number, end: number, parentFullYears: number): DashaPeriod[] {
  const visibleYears = (end - start) / YEAR_DAYS;
  let full = parentFullYears;
  if (full <= 0) full = visibleYears;
  let cursor = end - full * YEAR_DAYS;
  const first = DASHA_ORDER.indexOf(lord);
  const children: DashaPeriod[] = [];
  for (let step = 0; step < 9; step += 1) {
    const sub = DASHA_ORDER[(first + step) % 9];
    const length = (DASHA_YEARS[sub] * full) / 120 * YEAR_DAYS;
    const childEnd = step === 8 ? end : cursor + length;
    if (childEnd <= start) {
      cursor = childEnd;
      continue;
    }
    children.push({ lord: sub, start: Math.max(cursor, start), end: childEnd });
    cursor = childEnd;
  }
  if (children.length) children[children.length - 1].end = end;
  return children;
}
const running = (periods: DashaPeriod[], at: number) => periods.find((p) => p.start <= at && at < p.end);

/** `datetime.isoformat()` of a wall-clock instant in `zone`. */
function wallIso(wall: number, zone: string): string {
  let utc = wall - utcOffsetMinutes(zone, wall) / 1440;
  utc = wall - utcOffsetMinutes(zone, utc) / 1440;
  return wallAt(utc, utcOffsetMinutes(zone, utc)).iso;
}

interface DashaBlock {
  score: number;
  maha: DashaPeriod;
  antar: DashaPeriod;
}
function dashaScoreForLord(n: NatalChart, lord: Graha): number {
  const house = houseFrom(n.sign[idx(lord)], n.lagnaSign);
  const placement = T.HOUSE_STANDING[house];
  if (lord === "rahu" || lord === "ketu") return placement;
  const [, digScore] = dignity(lord, n.sign[idx(lord)], n.degree[idx(lord)]);
  return clamp(0.6 * digScore + 0.4 * placement);
}
function dashaBlock(n: NatalChart, asOfWall: number): DashaBlock {
  const elapsedYears = Math.max((asOfWall - n.wall) / YEAR_DAYS, 0);
  const cycles = Math.max(Math.ceil((elapsedYears + 5) / 120), 1);
  const periods = vimshottariTimeline(signLon(n, "moon"), n.wall, cycles);
  const maha = running(periods, asOfWall) ?? periods[periods.length - 1];
  const antardashas = subPeriods(maha.lord, maha.start, maha.end, DASHA_YEARS[maha.lord]);
  const antar = running(antardashas, asOfWall) ?? antardashas[antardashas.length - 1] ?? maha;
  const score = clamp(0.6 * dashaScoreForLord(n, maha.lord) + 0.4 * dashaScoreForLord(n, antar.lord));
  return { score: pyRound(score, 4), maha, antar };
}
const periodJson = (p: DashaPeriod, zone: string): Json => ({ lord: p.lord, lord_ne: DASHA_LORD_NE[p.lord], lord_en: GRAHA_EN[p.lord], start: wallIso(p.start, zone), end: wallIso(p.end, zone) });
const dashaJson = (d: DashaBlock, zone: string): Json => ({ score: d.score, mahadasha: periodJson(d.maha, zone), antardasha: periodJson(d.antar, zone) });

interface PersonalScored {
  score: number;
  raw: number;
  gochar: number;
  chakra: number[];
  rows: GocharRow[];
  chandrabala: Chandrabala;
  moorti: Moorti;
  ashtakavarga: AvBlock;
  rashiLord: RashiLord;
  cycle: Cycle;
  vaara: VaaraHora;
  dasha: DashaBlock;
  domains: Domain[];
}
const personalLayerScores = (s: PersonalScored): number[] => [s.gochar, s.chandrabala.score, s.moorti.score, s.ashtakavarga.score, s.rashiLord.score, s.dasha.score, s.cycle.score, s.vaara.score];
const withAshtakavarga = (f: DayFrame, sav: number[], bav: number[][]): DayFrame => ({ ...f, sav, bav, hora: null });

function scorePersonal(n: NatalChart, frame: DayFrame, period: Period, dasha: DashaBlock): PersonalScored {
  const pf = withAshtakavarga(frame, n.sav, n.bav);
  const refs = [n.lagnaSign, natalMoonSign(n), natalSunSign(n)];
  const byChakra = refs.map((r) => gocharRows(pf, r, period));
  const chakra = byChakra.map((rows) => gocharScore(rows));
  const gochar = clamp(chakra.reduce((a, s, i) => a + s * T.NATAL_CHAKRA_WEIGHTS[i], 0));
  const rows = byChakra[0];
  const s: PersonalScored = {
    score: 0,
    raw: 0,
    gochar,
    chakra,
    chandrabala: chandrabalaBlock(frame, natalMoonSign(n)),
    moorti: moortiBlock(frame, natalMoonSign(n)),
    ashtakavarga: ashtakavargaBlock(pf, n.lagnaSign),
    rashiLord: rashiLordBlock(frame, n.lagnaSign),
    cycle: cycleBlock(frame, n.lagnaSign, period),
    vaara: vaaraHoraBlock(frame, n.lagnaSign),
    dasha,
    domains: domainScores(pf, n.lagnaSign, rows),
    rows,
  };
  const weights = T.PERSONAL_LAYER_WEIGHTS[pIndex(period)];
  s.raw = clamp(personalLayerScores(s).reduce((a, v, i) => a + v * weights[i], 0));
  s.score = pyRound(s.raw, 4);
  return s;
}

function personalSavNote(sav: number, lang: Lang): string {
  const ne = lang === "ne";
  const count = ne ? nepaliDigits(sav) : String(sav);
  if (sav >= 30) return ne ? `जन्म अष्टकवर्गमा तपाईंको लग्न राशिमा ${count} बिन्दु छन् — यो औसतभन्दा बलियो हो, त्यसैले प्रतिकूल गोचरले पनि दीर्घकालीन असर पार्दैन।` : `Your natal Ashtakavarga gives the Lagna sign ${count} bindus — above average, so even an adverse transit does not leave a lasting mark.`;
  if (sav <= 25) return ne ? `जन्म अष्टकवर्गमा लग्न राशिमा ${count} बिन्दु मात्र छन् — आधार अलि पातलो भएकाले अनुकूल गोचरको फल पनि पूरै नआउन सक्छ; काम गर्दा बलियो तयारी चाहिन्छ।` : `The Lagna sign holds only ${count} bindus in your natal Ashtakavarga — a thin base, so even a favourable transit may not deliver in full; prepare more thoroughly than the transit suggests.`;
  return ne ? `जन्म अष्टकवर्गमा लग्न राशिमा ${count} बिन्दु छन् — औसत स्तरको आधार, जसले गोचरको फल जस्ताको तस्तै देखाउँछ।` : `The Lagna sign holds ${count} bindus in your natal Ashtakavarga — an average base, which lets the transits read much as they stand.`;
}
const minHouse = (domain: number) => Math.min(...(T.DOMAIN_HOUSES[domain] as readonly (readonly [number, number])[]).map(([h]) => h));

const PERSONAL_WORDS: Record<Lang, ToneWords> = { ne: { opener: T.PERSONAL_TONE_OPENER_NE, closer: T.PERSONAL_TONE_CLOSER_NE }, en: { opener: T.PERSONAL_TONE_OPENER_EN, closer: T.PERSONAL_TONE_CLOSER_EN } };

function composePersonal(n: NatalChart, tone: number, period: Period, s: PersonalScored, domains: [number, number][], lang: Lang): string {
  const ne = lang === "ne";
  const pi = pIndex(period);
  const words = PERSONAL_WORDS[lang];
  const periodWord = ne ? T.PERIOD_NE[pi] : T.PERIOD_EN[pi];
  const theme = (h: number) => (ne ? T.HOUSE_THEME_NE[h] : T.HOUSE_THEME_EN[h]);
  const parts: string[] = [words.opener[tone].replace("{period}", periodWord)];
  const [maha, antar] = [s.dasha.maha.lord, s.dasha.antar.lord];
  const lordName = (g: Graha) => (ne ? DASHA_LORD_NE[g] : GRAHA_EN[g]);
  const [mahaLord, antarLord] = [lordName(maha), lordName(antar)];
  const mahaHouse = houseFrom(n.sign[idx(maha)], n.lagnaSign);
  const antarHouse = houseFrom(n.sign[idx(antar)], n.lagnaSign);
  parts.push(ne ? `हाल तपाईंको ${mahaLord} महादशाभित्र ${antarLord} अन्तर्दशा चलिरहेको छ।` : `You are currently running ${mahaLord} Mahadasha with ${antarLord} Antardasha.`);
  parts.push(
    ne
      ? `महादशेश ${mahaLord} जन्मकुण्डलीको ${num(mahaHouse, lang)} भावमा रहेकाले यस अवधिको मूल विषय ${theme(mahaHouse)}सँग जोडिएको छ, भने अन्तर्दशेश ${antarLord} ${num(antarHouse, lang)} भावमा भएकाले ${theme(antarHouse)}सँग जोडिएका प्रसङ्ग अहिले अगाडि आउँछन्।`
      : `The Mahadasha lord ${mahaLord} sits in house ${mahaHouse} of your birth chart, so the period's underlying subject is ${theme(mahaHouse)}; the Antardasha lord ${antarLord} in house ${antarHouse} brings ${theme(antarHouse)} to the front right now.`,
  );
  const ordered = s.chakra.map((v, i): [number, number] => [i, v]).sort((a, b) => b[1] - a[1]);
  const [cBest, cWorst] = [ordered[0], ordered[ordered.length - 1]];
  if (cBest[1] - cWorst[1] > 0.12) {
    parts.push(
      ne
        ? `सुदर्शन चक्रमा ${T.CHAKRA_NE[cBest[0]]} चक्र बलियो देखिन्छ — ${T.CHAKRA_GLOSS_NE[cBest[0]]}ले साथ दिन्छ; ${T.CHAKRA_NE[cWorst[0]]} चक्र भने कमजोर भएकाले ${T.CHAKRA_GLOSS_NE[cWorst[0]]}मा चाप पर्न सक्छ।`
        : `Across the Sudarshana chakras the ${T.CHAKRA_EN[cBest[0]]} frame is the strong one — support comes through ${T.CHAKRA_GLOSS_EN[cBest[0]]}; the ${T.CHAKRA_EN[cWorst[0]]} frame is weaker, so ${T.CHAKRA_GLOSS_EN[cWorst[0]]} can come under pressure.`,
    );
  }
  const ranked = [...domains].sort((a, b) => b[1] - a[1]);
  const strong = ranked[0];
  const weak = ranked[ranked.length - 1];
  if (strong[1] > 0.08) {
    const house = minHouse(strong[0]);
    parts.push(ne ? `${T.DOMAIN_NE[strong[0]]} पक्ष सबैभन्दा बलियो छ — ${theme(house)}मा लगानी गरेको समय र मिहिनेतले प्रतिफल दिन्छ।` : `${T.DOMAIN_EN[strong[0]]} is the strongest side — time and effort put into ${theme(house)} return a real result.`);
  }
  if (weak[1] < -0.08) {
    const house = minHouse(weak[0]);
    parts.push(ne ? `${T.DOMAIN_NE[weak[0]]} पक्षमा भने सतर्कता चाहिन्छ; ${theme(house)}सँग सम्बन्धित काममा हतार नगर्नुहोस्।` : `${T.DOMAIN_EN[weak[0]]} calls for care, though — do not rush anything touching ${theme(house)}.`);
  }
  const rows = s.rows;
  const loud = loudest(rows);
  const grahaName = ne ? GRAHA_NE[loud.graha] : GRAHA_EN[loud.graha];
  const signName = ne ? RASHI_NAMES_NE[loud.sign] : RASHI_NAMES[loud.sign];
  const loudHouse = num(loud.house, lang);
  const house = loud.house;
  if (loud.vedhaBy) {
    const blocker = ne ? GRAHA_NE[loud.vedhaBy] : GRAHA_EN[loud.vedhaBy];
    parts.push(ne ? `गोचरमा ${grahaName} ${signName} राशि हुँदै ${loudHouse} भावमा छन् तर ${blocker}को वेध परेकाले त्यसको फल रोकिन्छ — आशा गरेको नतिजा ढिलो आउँछ।` : `In transit ${grahaName} moves through ${signName} into house ${house}, but ${blocker} obstructs it, so the promised result stalls and arrives late.`);
  } else if (loud.favourable) {
    const bindu = loud.bindu === null ? null : ne ? nepaliDigits(loud.bindu) : String(loud.bindu);
    if (ne) parts.push(bindu !== null ? `गोचरमा ${grahaName} ${signName} राशिबाट ${loudHouse} भावमा छन्, जहाँ तपाईंको जन्म अष्टकवर्गमा ${bindu} बिन्दु छन् — ${theme(house)}मा यसले प्रत्यक्ष साथ दिन्छ।` : `गोचरमा ${grahaName} ${signName} राशिबाट ${loudHouse} भावमा छन् — ${theme(house)}मा यसले प्रत्यक्ष साथ दिन्छ।`);
    else parts.push(bindu !== null ? `${grahaName} transits ${signName} into house ${house}, where your natal Ashtakavarga holds ${bindu} bindus — direct support for ${theme(house)}.` : `${grahaName} transits ${signName} into house ${house} — direct support for ${theme(house)}.`);
  } else {
    parts.push(ne ? `गोचरमा ${grahaName} ${signName} राशिबाट ${loudHouse} भावमा रहेकाले ${theme(house)}मा दबाब पर्न सक्छ; यसै क्षेत्रमा बढी सचेत रहनुहोस्।` : `${grahaName} transiting ${signName} into house ${house} can press on ${theme(house)} — that is the area to stay alert in.`);
  }
  const name = (r: GocharRow) => (ne ? GRAHA_NE[r.graha] : GRAHA_EN[r.graha]);
  const vakri = rows.filter((r) => r.retrograde).map(name);
  const asta = rows.filter((r) => r.combust).map(name);
  if (vakri.length) {
    const names = grahaList(vakri, lang);
    const verb = vakri.length === 1 ? "stands" : "stand";
    parts.push(ne ? `${names} वक्री अवस्थामा रहेकाले अघि सुरु गरेर अलपत्र परेका काम फेरि जागृत हुन्छन् — नयाँ सुरु गर्नुभन्दा अधुरो काम टुङ्ग्याउन यो समय राम्रो हो।` : `${names} ${verb} retrograde, so unfinished business started earlier resurfaces — a better window for closing what is open than for starting something new.`);
  }
  if (asta.length) {
    const names = grahaList(asta, lang);
    const [verb, pronoun] = asta.length === 1 ? ["is", "it"] : ["are", "they"];
    parts.push(ne ? `${names} अस्त भएकाले त्यससँग जोडिएको विषयमा अहिले निर्णय गर्न हतार नगर्नुहोस्।` : `${names} ${verb} combust, so hold off on decisions tied to what ${pronoun} signifies.`);
  }
  parts.push(personalSavNote(s.ashtakavarga.sav, lang));
  if (period === "daily" || period === "weekly") {
    const [tara, quality, taraEn, qualityEn] = taraLabels(s.chandrabala);
    const m = s.moorti;
    parts.push(ne ? `चन्द्रबल ${tara} (${quality}) र गोचर चन्द्र जन्म राशिबाट ${num(m.houseFromMoon, lang)} भावमा — मूर्ति ${T.MOORTI_NE[m.kind]}।` : `Chandrabala is ${taraEn} (${lc(qualityEn)}), with the transit Moon ${m.houseFromMoon} houses from your natal Moon — a ${T.MOORTI_EN[m.kind]} moorti.`);
  } else {
    const c = s.cycle;
    parts.push(ne ? `${periodWord}को कालचक्रमा ${GRAHA_NE[c.graha]} ${RASHI_NAMES_NE[c.sign]} राशि हुँदै ${num(c.house, lang)} भावमा छन्, जसले सिङ्गो अवधिको गति निर्धारण गर्छ।` : `For ${lc(periodWord)} the time-lord ${GRAHA_EN[c.graha]} runs through ${RASHI_NAMES[c.sign]} in house ${c.house}, which sets the pace of the whole window.`);
  }
  const ll = s.rashiLord;
  parts.push(ne ? `लग्नेश ${GRAHA_NE[ll.lord]} ${num(ll.house, lang)} भावमा ${T.DIGNITY_NE[ll.dignity]} अवस्थामा छन्, त्यसैले ${theme(ll.house)}सँग जोडिएको प्रयासले नै समग्र फल निर्धारण गर्छ।` : `Your Lagna lord ${GRAHA_EN[ll.lord]} stands in house ${ll.house}, ${lc(T.DIGNITY_EN[ll.dignity])}, so it is effort tied to ${theme(ll.house)} that decides the overall result.`);
  if (tone === 0 || tone === 1) parts.push((ne ? T.REMEDY_NE : T.REMEDY_EN)[culprit(rows)]);
  parts.push(words.closer[tone]);
  return parts.join(" ");
}

const PERSONAL_LAYERS: LayerSet = { keys: T.PERSONAL_LAYER_KEYS, labelNe: T.PERSONAL_LAYER_LABEL_NE, labelEn: T.PERSONAL_LAYER_LABEL_EN, weights: T.PERSONAL_LAYER_WEIGHTS };
const dashaNote = (d: DashaBlock): [string, string] => [`${DASHA_LORD_NE[d.maha.lord]} / ${DASHA_LORD_NE[d.antar.lord]}`, `${GRAHA_EN[d.maha.lord]} / ${GRAHA_EN[d.antar.lord]}`];
function dayNote(i: number, s: PersonalScored): [string, string] {
  switch (T.PERSONAL_LAYER_KEYS[i]) {
    case "dasha": return dashaNote(s.dasha);
    case "rashi_lord": return [`लग्नेश ${GRAHA_NE[s.rashiLord.lord]} ${s.rashiLord.house} भावमा`, `Lagna lord ${GRAHA_EN[s.rashiLord.lord]} in house ${s.rashiLord.house}`];
    case "ashtakavarga": return [`जन्म सर्वाष्टकवर्ग ${nepaliDigits(s.ashtakavarga.sav)} बिन्दु`, `Natal Sarvashtakavarga ${s.ashtakavarga.sav} bindus`];
    case "chandrabala": return [`नवतारा ${taraLabels(s.chandrabala)[0]}`, `Navatara ${s.chandrabala.taraNum}`];
    default: return ["", ""];
  }
}
function personalHeader(n: NatalChart): Json {
  const [l, m, s] = [n.lagnaSign, natalMoonSign(n), natalSunSign(n)];
  const lord = SIGN_LORD[l];
  const i = idx(lord);
  const number = T.LORD_NUMBER[i];
  return {
    lagna_sign: l + 1, lagna_sign_ne: RASHI_NAMES_NE[l], lagna_sign_en: RASHI_NAMES[l],
    moon_sign: m + 1, moon_sign_ne: RASHI_NAMES_NE[m], moon_sign_en: RASHI_NAMES[m],
    sun_sign: s + 1, sun_sign_ne: RASHI_NAMES_NE[s], sun_sign_en: RASHI_NAMES[s],
    lucky_lord: lord, lucky_lord_ne: GRAHA_NE[lord], lucky_lord_en: GRAHA_EN[lord],
    lucky_color_ne: T.LORD_COLOR_NE[i], lucky_color_en: T.LORD_COLOR_EN[i],
    lucky_number: number, lucky_number_ne: nepaliDigits(number), lucky_number_en: String(number),
    lucky_direction_ne: T.LORD_DISHA_NE[i], lucky_direction_en: T.LORD_DISHA_EN[i],
  };
}

function personalDay(n: NatalChart, frame: DayFrame, period: Period, asOf: number): Json {
  const dasha = dashaBlock(n, asOf + utcOffsetMinutes(n.zone, asOf) / 1440);
  const s = scorePersonal(n, frame, period, dasha);
  const tone = toneFor(s.raw);
  const domains = s.domains.map((d): [number, number] => [d.key, d.score]);
  return {
    ...personalHeader(n),
    score: s.score,
    percent: percentOf(s.raw),
    stars: tone + 1,
    tone: toneKey(tone),
    dasha: dashaJson(s.dasha, n.zone),
    rashi_lord: lordJson(s.rashiLord),
    components: components(PERSONAL_LAYERS, personalLayerScores(s), period, (i, lang) => dayNote(i, s)[lang === "ne" ? 0 : 1]),
    domains: s.domains.map((d) => domainJson(d.key, d.score, d.raw, d.tenants)),
    gochar: rowsJson(s.rows),
    prediction_ne: composePersonal(n, tone, period, s, domains, "ne"),
    prediction_en: composePersonal(n, tone, period, s, domains, "en"),
  };
}
function personalWindow(n: NatalChart, frames: DayFrame[], period: Period, asOf: number): Json {
  const dasha = dashaBlock(n, asOf + utcOffsetMinutes(n.zone, asOf) / 1440);
  const scored = frames.map((f) => scorePersonal(n, f, period, dasha));
  const count = scored.length;
  const avg = mean(scored.map((s) => s.score));
  let bestI = 0;
  let worstI = 0;
  scored.forEach((s, i) => {
    if (s.score > scored[bestI].score) bestI = i;
    if (s.score < scored[worstI].score) worstI = i;
  });
  const best = scored[bestI].score;
  const worst = scored[worstI].score;
  const peak = Math.abs(worst) > Math.abs(best) ? worst : best;
  const score = clamp(avg * (1 - AGGREGATE_PEAK_WEIGHT) + peak * AGGREGATE_PEAK_WEIGHT);
  const tone = toneFor(score);
  const mid = scored[Math.floor(count / 2)];
  const layerMeans = Array.from({ length: 8 }, (_, k) => mean(scored.map((s) => personalLayerScores(s)[k])));
  const domainValues = T.DOMAIN_KEYS.map((_, i) => clamp(mean(scored.map((s) => s.domains[i].score))));
  const domainRounded = domainValues.map((v, i): [number, number] => [i, pyRound(v, 4)]);
  return {
    ...personalHeader(n),
    score: pyRound(score, 4),
    percent: percentOf(score),
    stars: tone + 1,
    tone: toneKey(tone),
    dasha: dashaJson(mid.dasha, n.zone),
    rashi_lord: lordJson(mid.rashiLord),
    components: components(PERSONAL_LAYERS, layerMeans, period, (i, lang) => (T.PERSONAL_LAYER_KEYS[i] === "dasha" ? dashaNote(mid.dasha)[lang === "ne" ? 0 : 1] : "")),
    domains: domainRounded.map(([i, r]) => domainJson(i, r, domainValues[i], mid.domains[i].tenants)),
    gochar: rowsJson(mid.rows),
    days_in_period: frames.length,
    prediction_ne: composePersonal(n, tone, period, mid, domainRounded, "ne"),
    prediction_en: composePersonal(n, tone, period, mid, domainRounded, "en"),
  };
}

/** `personal_rashifal_for_gregorian`: the same windows as {@link rashifalForDay}, read against one birth chart. `asOf` (UTC) is when the dasha is read. */
export function personalRashifalForDay(sky: Sky, natal: NatalChart, jdn: number, place: Place, period: Period, asOf: number): Json | null {
  const w = windowFrames(sky, jdn, place, period);
  if (!w) return null;
  const { frames } = w;
  const tail = (): Json => ({ period, anchor: "sunrise", range_start_ad: isoOf(frames[0].jdn), range_end_ad: isoOf(frames[frames.length - 1].jdn) });
  if (period === "daily") {
    const label = bsLabel(jdn);
    if (!label) return null;
    return { ...personalDay(natal, frames[0], "daily", asOf), period: "daily", anchor: "sunrise", date_ad: isoOf(jdn), ...label, method: methodBlock("daily", 1, 1) };
  }
  const body = personalWindow(natal, frames, period, asOf);
  return { ...body, ...w.extra, ...tail(), method: methodBlock(period, w.step, frames.length) };
}

/** The birth moment a request names (`birth_instant`): era parts read in the birth zone (12:00 when no clock). Null when this device cannot say. */
export function birthMoment(birth: { era: string; year: number; month: number; day: number; clock?: string; tz: string }, coords?: { lat: number; lon: number }): { utc: number; wall: number; zone: string } | null {
  let jdn: number | null;
  if (birth.era === "ad") jdn = civilJdnOf(birth.year, birth.month, birth.day);
  else if (birth.era === "bs") jdn = bsToJdnOf(birth.year, birth.month, birth.day);
  else return null;
  if (jdn === null || jdn < FIRST_DEVICE_JDN) return null;
  const inNepal = coords !== undefined && coords.lat >= 26.35 && coords.lat <= 30.45 && coords.lon >= 80.05 && coords.lon <= 88.2;
  const zone = inNepal ? "Asia/Kathmandu" : birth.tz || "Asia/Kathmandu";
  const clock = (birth.clock && birth.clock !== "" ? birth.clock : "12:00").trim().split(":");
  if (clock.length < 2) return null;
  const [h, m, s] = [Number(clock[0]), Number(clock[1]), clock[2] === undefined ? 0 : Number(clock[2])];
  if (![h, m, s].every(Number.isInteger) || h > 23 || m > 59 || s > 59) return null;
  const seconds = h * 3600 + m * 60 + s;
  return { utc: localInstant(jdn, seconds, zone), wall: jdn - 0.5 + seconds / 86400, zone };
}
import { civilJdn as civilJdnOf, bsToJdn as bsToJdnOf, FIRST_DEVICE_JDN } from "../../astronomy/lunar-month";

/** `compute_janma_from_instant`: the birth Moon's nakshatra (1 to 27) and rashi (1 to 12). */
export function janma(sky: Sky, utc: number): { janma_nakshatra: number; janma_rashi: number } | null {
  const p = sky.positionsAt(utc, 2, false);
  if (!p) return null;
  const moon = p.longitude[1];
  return { janma_nakshatra: pyInt(Math.floor(pyMod(moon, 360) / (360 / 27))) + 1, janma_rashi: (pyInt(moon / 30) % 12) + 1 };
}
