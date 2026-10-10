/** Whole-sign house (bhava) mapping, derived from the Lagna's rashi. */

import { formatRashiByNumber } from "@/lib/rashi-i18n";

export interface BhavaPlanetEntry {
  key: string;
  labelNe: string;
  /** वक्री — planet in retrograde motion. */
  isRetrograde?: boolean;
  /** अस्त — planet combust (lost in the Sun's glare). */
  isCombust?: boolean;
}

export interface BhavaHouse {
  house: number;
  rashi: number;
  rashiNe: string;
  isLagna: boolean;
  planets: BhavaPlanetEntry[];
}

/** Rashi (1-12) occupying a given house, under whole-sign houses. */
export function houseRashi(lagnaRashi: number, house: number): number {
  return ((lagnaRashi - 1 + (house - 1)) % 12) + 1;
}

/** House (1-12) a planet falls into given its rashi and the Lagna's rashi. */
export function rashiToHouse(planetRashi: number, lagnaRashi: number): number {
  return ((planetRashi - lagnaRashi + 12) % 12) + 1;
}

/** D1 whole-sign bhavas from lagna anchor — same source as D1 chart / Bhava table. */
export function d1LagnaRashi(vargaCharts: {
  entries: Record<string, { key: string; vargaRashi: number }[]>;
}): number | undefined {
  const lagna = vargaCharts.entries["1"]?.find((e) => e.key === "lagna");
  return lagna?.vargaRashi;
}

export function d1PlanetBhavas(
  vargaCharts: { entries: Record<string, { key: string; vargaRashi: number }[]> },
  planetKeys: string[],
): Partial<Record<string, number>> {
  const entries = vargaCharts.entries["1"] ?? [];
  const lagnaRashi = entries.find((e) => e.key === "lagna")?.vargaRashi;
  if (lagnaRashi == null) return {};
  const out: Partial<Record<string, number>> = {};
  for (const key of planetKeys) {
    const row = entries.find((e) => e.key === key);
    if (row?.vargaRashi != null) {
      out[key] = rashiToHouse(row.vargaRashi, lagnaRashi);
    }
  }
  return out;
}

/** Nine grahas in standard D1 janma-phala order (excludes lagna). */
export const D1_JANMA_PHALA_GRAHA_KEYS = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
  "rahu",
  "ketu",
] as const;

export function siderealRashiFromLongitude(longitude: number): number {
  const lon = ((longitude % 360) + 360) % 360;
  return Math.floor(lon / 30) + 1;
}

/** All D1 lagna-anchored bhavas for janma-phala (optionally Gulika from upagraha longitude). */
export function d1AllJanmaPhalaBhavas(
  vargaCharts: { entries: Record<string, { key: string; vargaRashi: number }[]> },
  options?: { gulikaLongitude?: number },
): Partial<Record<string, number>> {
  const out = d1PlanetBhavas(vargaCharts, [...D1_JANMA_PHALA_GRAHA_KEYS]);
  const lagnaRashi = d1LagnaRashi(vargaCharts);
  if (lagnaRashi != null && options?.gulikaLongitude != null) {
    out.gulika = rashiToHouse(
      siderealRashiFromLongitude(options.gulikaLongitude),
      lagnaRashi,
    );
  }
  return out;
}

export function buildBhavaChart(
  lagnaRashi: number,
  planetRashis: {
    key: string;
    labelNe: string;
    rashi: number;
    isRetrograde?: boolean;
    isCombust?: boolean;
  }[]
): BhavaHouse[] {
  const houses: BhavaHouse[] = Array.from({ length: 12 }, (_, i) => {
    const house = i + 1;
    const rashi = houseRashi(lagnaRashi, house);
    return {
      house,
      rashi,
      rashiNe: formatRashiByNumber(rashi, "ne"),
      isLagna: house === 1,
      planets: [],
    };
  });

  for (const planet of planetRashis) {
    const house = rashiToHouse(planet.rashi, lagnaRashi);
    houses[house - 1]!.planets.push({
      key: planet.key,
      labelNe: planet.labelNe,
      isRetrograde: planet.isRetrograde,
      isCombust: planet.isCombust,
    });
  }

  return houses;
}

// ── Bhava (house) table: residents, owner, qualities, aspects ──────────────

const KENDRA_HOUSES = new Set([1, 4, 7, 10]);
const TRIKONA_HOUSES = new Set([1, 5, 9]);
const DUSTHANA_HOUSES = new Set([6, 8, 12]);
const UPACHAYA_HOUSES = new Set([3, 6, 10, 11]);

/** Classical house-type tags that can stack (house 1 is kendra + trikona). */
export type HouseClass = "kendra" | "trikona" | "dusthana" | "upachaya";

export function houseClasses(house: number): HouseClass[] {
  const out: HouseClass[] = [];
  if (KENDRA_HOUSES.has(house)) out.push("kendra");
  if (TRIKONA_HOUSES.has(house)) out.push("trikona");
  if (DUSTHANA_HOUSES.has(house)) out.push("dusthana");
  if (UPACHAYA_HOUSES.has(house)) out.push("upachaya");
  return out;
}

/** "Q" for kendra (angle), "T" for trikona (trine), else undefined. Houses
 * that are both (only house 1) show as kendra — the stronger classical label. */
export type HouseBadgeKind = "Q" | "T";

export function houseBadge(house: number): HouseBadgeKind | undefined {
  if (KENDRA_HOUSES.has(house)) return "Q";
  if (TRIKONA_HOUSES.has(house)) return "T";
  return undefined;
}

/** UI label for kendra (Q) / trikona (T) house markers. */
export function formatHouseBadge(badge: HouseBadgeKind, lang: "en" | "ne"): string {
  if (lang === "ne") return badge === "Q" ? "केन्द्र" : "कोण";
  return badge;
}

/** Gender + modality per rashi (1-12) — fixed classical attributes, not chart-dependent. */
export const RASHI_QUALITIES: { ne: string; en: string }[] = [
  { ne: "पुं, चर", en: "Mas, Movable" },   // 1 Mesha
  { ne: "स्त्री, स्थिर", en: "Fem, Fixed" },  // 2 Vrishabha
  { ne: "पुं, द्विस्वभाव", en: "Mas, Common" }, // 3 Mithuna
  { ne: "स्त्री, चर", en: "Fem, Movable" },  // 4 Karka
  { ne: "पुं, स्थिर", en: "Mas, Fixed" },    // 5 Simha
  { ne: "स्त्री, द्विस्वभाव", en: "Fem, Common" }, // 6 Kanya
  { ne: "पुं, चर", en: "Mas, Movable" },   // 7 Tula
  { ne: "स्त्री, स्थिर", en: "Fem, Fixed" },  // 8 Vrishchika
  { ne: "पुं, द्विस्वभाव", en: "Mas, Common" }, // 9 Dhanu
  { ne: "स्त्री, चर", en: "Fem, Movable" },  // 10 Makara
  { ne: "पुं, स्थिर", en: "Mas, Fixed" },    // 11 Kumbha
  { ne: "स्त्री, द्विस्वभाव", en: "Fem, Common" }, // 12 Meena
];

/** Graha-drishti offsets (house-distance from the aspecting planet) beyond
 * the universal 7th aspect every planet casts. Mirrors the server's
 * SPECIAL_ASPECTS table (engine/vedic/interpretation.py). */
const SPECIAL_ASPECT_HOUSES: Record<string, number[]> = {
  mars: [4, 7, 8],
  jupiter: [5, 7, 9],
  saturn: [3, 7, 10],
  rahu: [5, 7, 9],
  ketu: [5, 7, 9],
};

export function aspectHousesFor(key: string): number[] {
  return SPECIAL_ASPECT_HOUSES[key] ?? [7];
}

/** Houses a planet in `fromHouse` casts its graha-drishti onto. */
export function drishtiTargetHouses(key: string, fromHouse: number): number[] {
  return aspectHousesFor(key)
    .map((distance) => ((fromHouse - 1 + distance - 1) % 12) + 1)
    .sort((a, b) => a - b);
}

export interface BhavaTableRow {
  house: number;
  badge?: HouseBadgeKind;
  residents: BhavaPlanetEntry[];
  owner?: string;
  rashi: number;
  rashiNe: string;
  aspectedBy: string[];
}

/**
 * Per-house table: residents, rashi owner (lord), rashi qualities and which
 * planets cast a graha-drishti onto that house — everything already
 * derivable client-side from data the API returns for the chart.
 */
export function buildBhavaTable(
  lagnaRashi: number,
  planetRashis: { key: string; labelNe: string; rashi: number }[],
  ownedRashis: Record<string, number[]>
): BhavaTableRow[] {
  const houses = buildBhavaChart(lagnaRashi, planetRashis);

  const rashiOwner = new Map<number, string>();
  for (const [ownerKey, rashis] of Object.entries(ownedRashis)) {
    for (const rashi of rashis) rashiOwner.set(rashi, ownerKey);
  }

  const planetHouse = new Map<string, number>();
  for (const planet of planetRashis) {
    planetHouse.set(planet.key, rashiToHouse(planet.rashi, lagnaRashi));
  }

  return houses.map((h) => {
    const aspectedBy: string[] = [];
    for (const [key, fromHouse] of planetHouse) {
      const distance = ((h.house - fromHouse + 12) % 12) + 1;
      if (aspectHousesFor(key).includes(distance)) aspectedBy.push(key);
    }
    return {
      house: h.house,
      badge: houseBadge(h.house),
      residents: h.planets,
      owner: rashiOwner.get(h.rashi),
      rashi: h.rashi,
      rashiNe: h.rashiNe,
      aspectedBy,
    };
  });
}
