import type { GocharGraha } from "@vedic-patro/api-client";
import type { BhavaHouse, BhavaPlanetEntry } from "@vedic-patro/domain/bhava";
import { GOCHAR_RASHI_TO_HOUSE } from "@vedic-patro/domain/kundali/north-indian-layout";
import { formatRashiByNumber, rashiNeFromApiEn, rashiNumberFromName, resolveRashiDisplay } from "@vedic-patro/domain/rashi-i18n";
import { toNepaliDigits } from "../panchanga-format";
import { GRAHA_CHART_LABEL, type GocharChartPlanet, HOUSE_TO_GOCHAR_RASHI, PAPA_GRAHA_ABBREV, PAPA_GRAHA_ORDER } from "@vedic-patro/domain/dainikKranti/gochar-display";

export * from "@vedic-patro/domain/dainikKranti/gochar-display";

export function rashiNoFromGraha(g: GocharGraha): number | undefined {
  const raw = g.rashi_no;
  if (typeof raw === "number" && raw >= 1 && raw <= 12) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 1 && n <= 12) return n;
  }
  const fromName = rashiNumberFromName(g.rashi_ne) ?? rashiNumberFromName(g.rashi);
  return fromName;
}

export function grahaChartLabel(key: string, g: GocharGraha): string {
  return GRAHA_CHART_LABEL[key] ?? g.name_ne?.slice(0, 2) ?? key.slice(0, 2);
}

export function grahaRashiNe(g: GocharGraha): string | undefined {
  return g.rashi_ne ?? rashiNeFromApiEn(g.rashi);
}

export function grahaRashiDisplay(g: GocharGraha, lang?: string): string | undefined {
  return resolveRashiDisplay(g.rashi_ne, g.rashi, lang);
}

export function buildPlanetsByRashi(
  grahas: Array<GocharGraha & { key: string }>,
): Record<number, GocharChartPlanet[]> {
  const out: Record<number, GocharChartPlanet[]> = {};
  for (const g of grahas) {
    const num = rashiNoFromGraha(g);
    if (num == null) continue;
    (out[num] ??= []).push({
      key: g.key,
      label: grahaChartLabel(g.key, g),
      isRetrograde: g.is_retrograde,
      isCombust: g.is_combust,
    });
  }
  return out;
}

/**
 * Synthesizes a `BhavaHouse[]` from today's gochar (fixed rashi→slot)
 * positions, so the shared D1Chart component — and with it, the click-to-
 * drishti and click-to-detail-dialog features already built for the natal
 * kundali chart — can render this transit chart too.
 *
 * There is no natal lagna on this page: "house 1" is just whichever rashi
 * the fixed Surya-patro convention slots there, not a birth-chart bhava. The
 * bhava-relative content the detail dialog shows (bhavesh phal, per-house
 * saravali, Lal Kitab-by-house) is written assuming a real lagna, so on this
 * chart it describes the fixed slot number as if it were that bhava — a
 * deliberate simplification (same visual/interaction design everywhere)
 * rather than an astrologically precise transit reading.
 */
export function buildGocharBhavaHouses(
  grahas: Array<GocharGraha & { key: string }>,
): BhavaHouse[] {
  const houses: BhavaHouse[] = Array.from({ length: 12 }, (_, i) => {
    const house = i + 1;
    const rashi = HOUSE_TO_GOCHAR_RASHI[house] ?? house;
    return {
      house,
      rashi,
      rashiNe: formatRashiByNumber(rashi, "ne"),
      isLagna: house === 1,
      planets: [],
    };
  });

  for (const g of grahas) {
    const rashi = rashiNoFromGraha(g);
    if (rashi == null) continue;
    const house = GOCHAR_RASHI_TO_HOUSE[rashi];
    if (house == null) continue;
    const entry: BhavaPlanetEntry = {
      key: g.key,
      labelNe: grahaChartLabel(g.key, g),
      isRetrograde: g.is_retrograde,
      isCombust: g.is_combust,
    };
    houses[house - 1]!.planets.push(entry);
  }

  return houses;
}

export function buildPapanshaCodes(
  grahas: Array<GocharGraha & { key: string }>,
): string[] {
  const codes: string[] = [];
  for (const key of PAPA_GRAHA_ORDER) {
    const g = grahas.find((row) => row.key === key);
    if (!g) continue;
    const rashi = rashiNoFromGraha(g);
    if (rashi == null) continue;
    const house = GOCHAR_RASHI_TO_HOUSE[rashi];
    if (house == null) continue;
    codes.push(`${PAPA_GRAHA_ABBREV[key]}.${toNepaliDigits(house)}`);
  }
  return codes;
}
