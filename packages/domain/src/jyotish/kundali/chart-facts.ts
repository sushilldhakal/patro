/**
 * Chart facts made on the device: `jyotish::chart` and `jyotish::graha` in apps/rust (`PlanetFact`,
 * `Chart`, `build_chart` of the Python reference). Each graha's sign, whole-sign house, dignity,
 * navamsa, nakshatra, combustion and Shadbala standing, the house lords and occupants, and the
 * dasha running at a moment. The yoga checklist and graha shanti read these.
 */
import { pyFloorDiv, pyInt, pyMod } from "../../panchanga/engine/py";
import { subPeriods, VIMSHOTTARI, type Mahadasha } from "./vimshottari-engine";

export type GrahaKey = "sun" | "moon" | "mars" | "mercury" | "jupiter" | "venus" | "saturn" | "rahu" | "ketu";
export const ALL: readonly GrahaKey[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];
export const SEVEN: readonly GrahaKey[] = ALL.slice(0, 7);
export const gi = (g: GrahaKey) => ALL.indexOf(g);
export const EN: Record<GrahaKey, string> = { sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter", venus: "Venus", saturn: "Saturn", rahu: "Rahu", ketu: "Ketu" };
export const NE: Record<GrahaKey, string> = { sun: "सूर्य", moon: "चन्द्र", mars: "मंगल", mercury: "बुध", jupiter: "बृहस्पति", venus: "शुक्र", saturn: "शनि", rahu: "राहु", ketu: "केतु" };
export const SIGN_LORD: readonly GrahaKey[] = ["mars", "venus", "mercury", "moon", "sun", "mercury", "venus", "mars", "jupiter", "saturn", "saturn", "jupiter"];
export const EXALT_SIGN: Partial<Record<GrahaKey, number>> = { sun: 0, moon: 1, mars: 9, mercury: 5, jupiter: 3, venus: 11, saturn: 6 };
export const OWN_SIGNS: Record<GrahaKey, number[]> = { sun: [4], moon: [3], mars: [0, 7], mercury: [2, 5], jupiter: [8, 11], venus: [1, 6], saturn: [9, 10], rahu: [], ketu: [] };
export const MOOLA: Partial<Record<GrahaKey, [number, number, number]>> = { sun: [4, 0, 20], moon: [1, 4, 30], mars: [0, 0, 12], mercury: [5, 16, 20], jupiter: [8, 0, 10], venus: [6, 0, 15], saturn: [10, 0, 20] };
export const FRIENDS: Record<GrahaKey, GrahaKey[]> = { sun: ["moon", "mars", "jupiter"], moon: ["sun", "mercury"], mars: ["sun", "moon", "jupiter"], mercury: ["sun", "venus"], jupiter: ["sun", "moon", "mars"], venus: ["mercury", "saturn"], saturn: ["mercury", "venus"], rahu: [], ketu: [] };
export const ENEMIES: Record<GrahaKey, GrahaKey[]> = { sun: ["venus", "saturn"], mars: ["mercury"], mercury: ["moon"], jupiter: ["mercury", "venus"], venus: ["sun", "moon"], saturn: ["sun", "moon", "mars"], moon: [], rahu: [], ketu: [] };

export const KENDRA = [1, 4, 7, 10];
export const TRIKONA = [1, 5, 9];
export const KENDRA_TRIKONA = [1, 4, 5, 7, 9, 10];
export const DUSTHANA = [6, 8, 12];
export const KAMA_TRIKONA = [3, 7, 11];
export const PANAPARA = [2, 5, 8, 11];
export const APOKLIMA = [3, 6, 9, 12];
export const MOVABLE_SIGNS = [0, 3, 6, 9];
export const FIXED_SIGNS = [1, 4, 7, 10];
export const DUAL_SIGNS = [2, 5, 8, 11];
export const BENEFICS: readonly GrahaKey[] = ["jupiter", "venus", "mercury", "moon"];
export const MALEFICS: readonly GrahaKey[] = ["sun", "mars", "saturn", "rahu", "ketu"];
export const naturalBenefic = (g: GrahaKey) => BENEFICS.includes(g);
export const naturalMalefic = (g: GrahaKey) => MALEFICS.includes(g);
export const dignityPlanet = (g: GrahaKey) => g !== "rahu" && g !== "ketu";

export type Dignity = "exalted" | "debilitated" | "moolatrikona" | "own" | "friend" | "enemy" | "neutral";

export const norm = (d: number) => pyMod(d, 360);
export const signOf = (lon: number) => pyInt(pyFloorDiv(norm(lon), 30)) % 12;
export const navamsaSign = (lon: number) => pyInt(norm(lon) / (10 / 3)) % 12;
/** 0-based nakshatra and 1-based pada. */
export function nakshatraOf(lon: number): [number, number] {
  const span = 360 / 27;
  const l = norm(lon);
  return [pyInt(l / span) % 27, pyInt(pyMod(l, span) / (span / 4)) + 1];
}
/** 1-based whole-sign count from `reference` to `target`. */
export const houseFrom = (target: number, reference: number) => ((target + 12 - (reference % 12)) % 12) + 1;
export function angularSep(a: number, b: number): number {
  const d = pyMod(Math.abs(norm(a) - norm(b)), 360);
  return Math.min(d, 360 - d);
}
/** `combust_orb(planet, retrograde)`: the tighter orb for retrograde Mercury and Venus. */
export function combustOrb(g: GrahaKey, retrograde: boolean): number | null {
  if (g === "mercury") return retrograde ? 12 : 13;
  if (g === "venus") return retrograde ? 8 : 9;
  return ({ moon: 12, mars: 17, jupiter: 11, saturn: 15 } as Record<string, number>)[g] ?? null;
}

function signRelation(g: GrahaKey, sign: number): Dignity {
  if (OWN_SIGNS[g].includes(sign)) return "own";
  const dispositor = SIGN_LORD[sign];
  return dispositor === g ? "own" : FRIENDS[g].includes(dispositor) ? "friend" : ENEMIES[g].includes(dispositor) ? "enemy" : "neutral";
}
/** `_dignity(planet, longitude)`; null for the nodes. */
export function dignity(g: GrahaKey, lon: number): Dignity | null {
  const exalt = EXALT_SIGN[g];
  if (exalt === undefined) return null;
  const sign = signOf(lon);
  const deg = pyMod(norm(lon), 30);
  if (sign === exalt) return "exalted";
  if (sign === (exalt + 6) % 12) return "debilitated";
  const m = MOOLA[g];
  if (m && sign === m[0] && m[1] <= deg && deg < m[2]) return "moolatrikona";
  return signRelation(g, sign);
}

export interface PlanetFact {
  key: GrahaKey;
  longitude: number;
  sign: number;
  house: number;
  retrograde: boolean;
  dignity: Dignity | null;
  navamsa: number;
  vargottama: boolean;
  degInSign: number;
  nakshatra: number;
  pada: number;
  combust: boolean;
  shadbalaStatus: string | null;
  shadbalaRatio: number | null;
  digBala: number | null;
}
export function navamsaDignity(f: PlanetFact): Dignity | null {
  const exalt = EXALT_SIGN[f.key];
  if (exalt === undefined) return null;
  if (f.navamsa === exalt) return "exalted";
  if ((f.navamsa + 6) % 12 === exalt) return "debilitated";
  return signRelation(f.key, f.navamsa);
}

export interface DashaNow {
  mahaLord: GrahaKey;
  antarLord: GrahaKey;
  mahaStart: number;
  mahaEnd: number;
  antarStart: number;
  antarEnd: number;
  bhuktis: { lord: GrahaKey; start: number; end: number }[];
  upcoming: Mahadasha[];
  full: Mahadasha[];
}

export interface Chart {
  lagnaSign: number;
  lagnaLon: number;
  moonSign: number;
  sunSign: number;
  planets: PlanetFact[];
  houseOccupants: GrahaKey[][];
  houseLord: GrahaKey[];
  dasha: DashaNow | null;
  isDay: boolean | null;
  gulikaHouse: number | null;
  mandiHouse: number | null;
}
export const fact = (c: Chart, g: GrahaKey) => c.planets[gi(g)];
/** Whether `g` aspects `target` (whole-sign: Mars 4/7/8, Jupiter and the nodes 5/7/9, Saturn 3/7/10). */
export function aspects(c: Chart, g: GrahaKey, target: number): boolean {
  const house = fact(c, g).house;
  const offsets = g === "mars" ? [4, 7, 8] : g === "jupiter" || g === "rahu" || g === "ketu" ? [5, 7, 9] : g === "saturn" ? [3, 7, 10] : [7];
  return offsets.some((off) => ((house - 1 + (off - 1)) % 12) + 1 === target);
}
export const aspectsTo = (c: Chart, house: number) => ALL.filter((g) => aspects(c, g, house));

export interface ShadbalaFacts {
  status: string | null;
  ratio: number | null;
  dig: number | null;
}
export function shadbalaFacts(shadbala: Record<string, unknown>): ShadbalaFacts[] {
  const out: ShadbalaFacts[] = ALL.map(() => ({ status: null, ratio: null, dig: null }));
  for (const row of (shadbala.planets as Record<string, unknown>[] | undefined) ?? []) {
    const i = ALL.indexOf(row.key as GrahaKey);
    if (i < 0) continue;
    out[i] = { status: (row.status as string) ?? null, ratio: (row.ratio as number) ?? null, dig: ((row.breakdown as Record<string, number>)?.dig as number) ?? null };
  }
  return out;
}

export interface RawPlanet {
  longitude: number;
  retrograde: boolean;
}

/** `build_chart`. `timeline` is the Vimshottari from birth; `now` picks the running dasha. */
export function buildChart(
  planets: RawPlanet[],
  inputs: { lagnaLon: number; shadbala: ShadbalaFacts[]; timeline: { periods: Mahadasha[] } | null; now: number; isDay: boolean | null; gulikaLon: number | null; mandiLon: number | null },
): Chart {
  const lagnaSign = signOf(inputs.lagnaLon);
  const sunLon = planets[0].longitude;
  const houseOccupants: GrahaKey[][] = Array.from({ length: 13 }, () => []);
  const facts = ALL.map((g, i): PlanetFact => {
    const raw = planets[i];
    const lon = raw.longitude;
    const sign = signOf(lon);
    const house = houseFrom(sign, lagnaSign);
    const d9 = navamsaSign(lon);
    const [nakshatra, pada] = nakshatraOf(lon);
    const sb = inputs.shadbala[i];
    const orb = combustOrb(g, raw.retrograde);
    houseOccupants[house].push(g);
    return {
      key: g, longitude: lon, sign, house, retrograde: raw.retrograde, dignity: dignity(g, lon), navamsa: d9, vargottama: sign === d9,
      degInSign: pyMod(norm(lon), 30), nakshatra, pada, combust: orb !== null && angularSep(lon, sunLon) < orb,
      shadbalaStatus: sb.status, shadbalaRatio: sb.ratio, digBala: sb.dig,
    };
  });
  const houseLord: GrahaKey[] = Array.from({ length: 13 }, (_, h) => (h === 0 ? "sun" : SIGN_LORD[(lagnaSign + h - 1) % 12]));
  return {
    lagnaSign, lagnaLon: inputs.lagnaLon, moonSign: facts[1].sign, sunSign: facts[0].sign, planets: facts, houseOccupants, houseLord,
    dasha: inputs.timeline ? dashaNow(inputs.timeline.periods, inputs.now) : null,
    isDay: inputs.isDay,
    gulikaHouse: inputs.gulikaLon === null ? null : houseFrom(signOf(inputs.gulikaLon), lagnaSign),
    mandiHouse: inputs.mandiLon === null ? null : houseFrom(signOf(inputs.mandiLon), lagnaSign),
  };
}

/** The mahadasha containing `now`, and its bhukti containing `now` (its first otherwise). */
function dashaNow(periods: Mahadasha[], now: number): DashaNow | null {
  const index = periods.findIndex((p) => p.start <= now && now < p.end);
  if (index < 0) return null;
  const cur = periods[index];
  const first = VIMSHOTTARI.keys.indexOf(cur.lord);
  const bhuktis = subPeriods(VIMSHOTTARI, first, cur.start, cur.end, VIMSHOTTARI.years[first]).map(([i, start, end]) => ({ lord: VIMSHOTTARI.keys[i] as GrahaKey, start, end }));
  const antar = bhuktis.find((b) => b.start <= now && now < b.end) ?? bhuktis[0] ?? null;
  return {
    mahaLord: cur.lord as GrahaKey,
    antarLord: (antar?.lord ?? cur.lord) as GrahaKey,
    mahaStart: cur.start,
    mahaEnd: cur.end,
    antarStart: antar?.start ?? cur.start,
    antarEnd: antar?.end ?? cur.end,
    bhuktis,
    upcoming: periods.slice(index + 1, index + 4),
    full: periods,
  };
}
