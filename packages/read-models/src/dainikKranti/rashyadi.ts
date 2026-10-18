import type { GocharGraha, PlanetInfo } from "@vedic-patro/api-client";
import { rashiNoFromGraha } from "./gochar-display";
import { RASHYADI_PLANET_KEYS, type RashyadiPlanetKey, type RashyadiPlanetRow, rashyadiFromDegInSign } from "@vedic-patro/domain/dainikKranti/rashyadi";

export * from "@vedic-patro/domain/dainikKranti/rashyadi";

function degInSignFromInfo(info: PlanetInfo): number | undefined {
  if (info.deg_in_rashi != null) return info.deg_in_rashi;
  if (info.longitude != null) return info.longitude % 30;
  if (info.dms_in_rashi) {
    const m = info.dms_in_rashi.match(/(\d+)°(\d+)'(\d+)"/);
    if (!m) return undefined;
    return Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
  }
  return undefined;
}

function rashiNoFromInfo(info: PlanetInfo): number | undefined {
  if (info.rashi_no != null && info.rashi_no >= 1 && info.rashi_no <= 12) {
    return info.rashi_no;
  }
  const raw = info.rashi;
  if (typeof raw === "number" && raw >= 1 && raw <= 12) return raw;
  return undefined;
}

export function rashyadiFromPlanetInfo(info: PlanetInfo): RashyadiPlanetRow | undefined {
  const rashi = rashiNoFromInfo(info);
  const deg = degInSignFromInfo(info);
  if (rashi == null || deg == null) return undefined;
  const parts = rashyadiFromDegInSign(deg);
  const vakri =
    info.is_retrograde === true ||
    info.retrograde === true ||
    /vakr|retro/i.test(info.motion ?? "");
  return { rashi, ...parts, vakri };
}

export function rashyadiFromGochar(g: GocharGraha): RashyadiPlanetRow | undefined {
  const rashi = rashiNoFromGraha(g);
  const deg = g.deg_in_rashi;
  if (rashi == null || deg == null) return undefined;
  const parts = rashyadiFromDegInSign(deg);
  const vakri = g.is_retrograde === true || /vakr|retro/i.test(g.motion ?? "");
  return { rashi, ...parts, vakri };
}

/** Apply गोचर कुण्डली राशि अङ्क (मेल खाने) जब एङ्कर मिति मिल्छ */
export function mergeKundaliRashi(
  planets: Partial<Record<RashyadiPlanetKey, RashyadiPlanetRow>>,
  grahas: Array<GocharGraha & { key: string }>,
): Partial<Record<RashyadiPlanetKey, RashyadiPlanetRow>> {
  const out = { ...planets };
  for (const g of grahas) {
    const key = g.key as RashyadiPlanetKey;
    if (!RASHYADI_PLANET_KEYS.includes(key)) continue;
    const rashi = rashiNoFromGraha(g);
    const existing = out[key];
    if (rashi == null || !existing) continue;
    out[key] = { ...existing, rashi };
  }
  return out;
}
