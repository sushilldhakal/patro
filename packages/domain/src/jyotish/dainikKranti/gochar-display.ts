import { adToBS } from "../../calendar/bs-calendar";
import { GOCHAR_RASHI_TO_HOUSE } from "../kundali/north-indian-layout";
import { formatRashiByNumber, rashiNeFromApiEn } from "../../panchanga/rashi-i18n";
import { formatBsIsoDateNepali } from "../../panchanga/panchanga-format";

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
  return rashiNeFromApiEn(en);
}

export type GocharChartPlanet = {
  key: string;
  label: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
};

/** Inverse of GOCHAR_RASHI_TO_HOUSE — which rashi sits in a given gochar slot. */
export const HOUSE_TO_GOCHAR_RASHI: Record<number, number> = Object.fromEntries(
  Object.entries(GOCHAR_RASHI_TO_HOUSE).map(([rashi, house]) => [house, Number(rashi)]),
);

/** पापाशाः — पाप ग्रहको गोचर कुण्डली घर (जस्तै म.८, रा.५, के.११) */
export const PAPA_GRAHA_ORDER = ["mars", "saturn", "rahu", "ketu"] as const;

export const PAPA_GRAHA_ABBREV: Record<(typeof PAPA_GRAHA_ORDER)[number], string> = {
  mars: "म",
  saturn: "श",
  rahu: "रा",
  ketu: "के",
};

export function formatGocharBsLabel(dateBs?: string | null, dateAd?: string | null, lang?: string): string | undefined {
  const fromBs = formatBsIsoDateNepali(dateBs, { lang });
  if (fromBs) return fromBs;
  if (!dateAd) return undefined;
  const [y, m, d] = dateAd.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const bs = adToBS(new Date(y, m - 1, d));
  return formatBsIsoDateNepali(`${bs.year}-${bs.month}-${bs.day}`, { lang });
}

export function rashiEnFromNumber(rashi: number): string {
  return formatRashiByNumber(rashi, "en");
}
