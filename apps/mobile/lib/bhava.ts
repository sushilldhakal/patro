/** Whole-sign house (bhava) mapping, derived from the Lagna's rashi. */

export interface BhavaPlanetEntry {
  key: string;
  labelNe: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
}

export interface BhavaHouse {
  house: number;
  rashi: number;
  rashiNe: string;
  isLagna: boolean;
  planets: BhavaPlanetEntry[];
}

export function houseRashi(lagnaRashi: number, house: number): number {
  return ((lagnaRashi - 1 + (house - 1)) % 12) + 1;
}

export function rashiToHouse(planetRashi: number, lagnaRashi: number): number {
  return ((planetRashi - lagnaRashi + 12) % 12) + 1;
}

export function buildBhavaChart(
  lagnaRashi: number,
  planetRashis: {
    key: string;
    labelNe: string;
    rashi: number;
    isRetrograde?: boolean;
    isCombust?: boolean;
  }[],
  rashiNeFromNumber: (rashi?: number) => string | undefined,
): BhavaHouse[] {
  const houses: BhavaHouse[] = Array.from({ length: 12 }, (_, i) => {
    const house = i + 1;
    const rashi = houseRashi(lagnaRashi, house);
    return {
      house,
      rashi,
      rashiNe: rashiNeFromNumber(rashi) ?? "—",
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

/** Rashi gender + modality, indexed 0–11. Mirrors the web RASHI_QUALITIES. */
export const RASHI_QUALITIES: { ne: string; en: string }[] = [
  { ne: "पुं, चर", en: "Mas, Movable" },
  { ne: "स्त्री, स्थिर", en: "Fem, Fixed" },
  { ne: "पुं, द्विस्वभाव", en: "Mas, Common" },
  { ne: "स्त्री, चर", en: "Fem, Movable" },
  { ne: "पुं, स्थिर", en: "Mas, Fixed" },
  { ne: "स्त्री, द्विस्वभाव", en: "Fem, Common" },
  { ne: "पुं, चर", en: "Mas, Movable" },
  { ne: "स्त्री, स्थिर", en: "Fem, Fixed" },
  { ne: "पुं, द्विस्वभाव", en: "Mas, Common" },
  { ne: "स्त्री, चर", en: "Fem, Movable" },
  { ne: "पुं, स्थिर", en: "Mas, Fixed" },
  { ne: "स्त्री, द्विस्वभाव", en: "Fem, Common" },
];

/**
 * Graha-drishti offsets (house-distance from the aspecting planet) beyond the
 * universal 7th aspect every planet casts. Mirrors the server's SPECIAL_ASPECTS
 * table (engine/vedic/interpretation.py).
 */
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

export type HouseBadgeKind = "Q" | "T";

/** Kendra (Q) / trikona (T) marker for a house number. */
export function houseBadge(house: number): HouseBadgeKind | undefined {
  if (KENDRA_HOUSES.has(house)) return "Q";
  if (TRIKONA_HOUSES.has(house)) return "T";
  return undefined;
}

export function formatHouseBadge(badge: HouseBadgeKind, lang: "en" | "ne"): string {
  if (lang === "ne") return badge === "Q" ? "केन्द्र" : "कोण";
  return badge;
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
 * planets cast a graha-drishti onto that house — everything already derivable
 * from data the API returns for the chart.
 */
export function buildBhavaTable(
  lagnaRashi: number,
  planetRashis: { key: string; labelNe: string; rashi: number }[],
  ownedRashis: Record<string, number[]>,
  rashiNeFromNumber: (rashi?: number) => string | undefined,
): BhavaTableRow[] {
  const houses = buildBhavaChart(lagnaRashi, planetRashis, rashiNeFromNumber);

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
