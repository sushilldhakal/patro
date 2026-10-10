import type { GocharGraha } from "@/lib/api";
import type { BhavaHouse, BhavaPlanetEntry } from "@vedic-patro/domain/bhava";
import { formatRashiByNumber } from "@vedic-patro/domain/rashi-i18n";
import { adToBS } from "@vedic-patro/domain/bs-calendar";
import { GOCHAR_RASHI_TO_HOUSE } from "@/lib/kundali/north-indian-layout";
import { formatBsIsoDateNepali, toNepaliDigits } from "@vedic-patro/domain/panchanga-format";

export const RASHI_NE = [
  "मेष", "वृष", "मिथुन", "कर्क", "सिंह", "कन्या",
  "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
] as const;

/** English rāśi names from the gochar API, aligned to RASHI_NE order. */
export const RASHI_EN = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
] as const;

export const GRAHA_CHART_LABEL: Record<string, string> = {
  sun: "सू.",
  moon: "च.",
  mars: "मं.",
  mercury: "बु.",
  jupiter: "बृ.",
  venus: "शु.",
  saturn: "श.",
  rahu: "रा.",
  ketu: "के.",
};

export function rashiEnToNe(en?: string | null): string | undefined {
  if (!en) return undefined;
  const key = en.trim().toLowerCase();
  const i = RASHI_EN.findIndex((r) => r.toLowerCase() === key);
  if (i >= 0) return RASHI_NE[i];
  const partial = RASHI_EN.findIndex((r) => key.startsWith(r.toLowerCase().slice(0, 4)));
  return partial >= 0 ? RASHI_NE[partial] : en;
}

export function rashiNoFromGraha(g: GocharGraha): number | undefined {
  const raw = g.rashi_no;
  if (typeof raw === "number" && raw >= 1 && raw <= 12) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 1 && n <= 12) return n;
  }
  const fromName = rashiEnToNe(g.rashi);
  if (!fromName) return undefined;
  const idx = RASHI_NE.indexOf(fromName as (typeof RASHI_NE)[number]);
  return idx >= 0 ? idx + 1 : undefined;
}

export function grahaChartLabel(key: string, g: GocharGraha): string {
  return GRAHA_CHART_LABEL[key] ?? g.name_ne?.slice(0, 2) ?? key.slice(0, 2);
}

export function grahaRashiNe(g: GocharGraha): string | undefined {
  return g.rashi_ne ?? rashiEnToNe(g.rashi);
}

export function buildPlanetsByRashi(
  grahas: Array<GocharGraha & { key: string }>,
): Record<number, string[]> {
  const out: Record<number, string[]> = {};
  for (const g of grahas) {
    const num = rashiNoFromGraha(g);
    if (num == null) continue;
    (out[num] ??= []).push(grahaChartLabel(g.key, g));
  }
  return out;
}

/** Inverse of GOCHAR_RASHI_TO_HOUSE — which rashi sits in a given gochar slot. */
const HOUSE_TO_GOCHAR_RASHI: Record<number, number> = Object.fromEntries(
  Object.entries(GOCHAR_RASHI_TO_HOUSE).map(([rashi, house]) => [house, Number(rashi)]),
);

/**
 * Synthesizes a `BhavaHouse[]` from today's gochar (fixed rashi→slot)
 * positions so the shared `D1Chart` — and its tap-a-house detail dialog and
 * graha aspect arrows — can render the transit chart too. Mirrors web's
 * `buildGocharBhavaHouses`. There is no natal lagna here: "house 1" is just
 * the rashi the fixed Surya-patro convention slots there.
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

/** पापाशाः — पाप ग्रहको गोचर कुण्डली घर (जस्तै म.८, रा.५, के.११) */
const PAPA_GRAHA_ORDER = ["mars", "saturn", "rahu", "ketu"] as const;

const PAPA_GRAHA_ABBREV: Record<(typeof PAPA_GRAHA_ORDER)[number], string> = {
  mars: "म",
  saturn: "श",
  rahu: "रा",
  ketu: "के",
};

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

export function formatGocharBsLabel(dateBs?: string | null, dateAd?: string | null): string | undefined {
  const fromBs = formatBsIsoDateNepali(dateBs);
  if (fromBs) return fromBs;
  if (!dateAd) return undefined;
  const [y, m, d] = dateAd.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const bs = adToBS(new Date(y, m - 1, d));
  return formatBsIsoDateNepali(`${bs.year}-${bs.month}-${bs.day}`);
}
