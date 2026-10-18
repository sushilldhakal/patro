import { toNepaliDigits } from "../panchanga-format";

/** Gochar spashta table — चन्द्र बाहेक (दैनिक च.रा. कोलमबाट)। */
export const RASHYADI_PLANET_KEYS = [
  "sun",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
  "rahu",
  "ketu",
] as const;

export type RashyadiPlanetKey = (typeof RASHYADI_PLANET_KEYS)[number];

/** मुद्रित पत्रो सङ्केत — सू, म, बु, वृ, शु, श, रा, के */
export const RASHYADI_PLANET_ABBREV: Record<RashyadiPlanetKey, string> = {
  sun: "सू",
  mars: "म",
  mercury: "बु",
  jupiter: "वृ",
  venus: "शु",
  saturn: "श",
  rahu: "रा",
  ketu: "के",
};

export const GRAHA_KEY_TO_TRANSIT_ABBREV: Record<string, string> = {
  ...RASHYADI_PLANET_ABBREV,
};

export type RashyadiCells = {
  rashi: number;
  ansha: number;
  kala: number;
  vikala: number;
  prati: number;
  truti: number;
};

export type RashyadiPlanetRow = RashyadiCells & {
  vakri: boolean;
};

export type RashyadiSegment = {
  id: string;
  anchor: "start" | "end";
  /** पक्ष संस्करण — जस्तै अधिक ज्येष्ठ शुक्लपक्ष */
  versionNe: string;
  labelNe: string;
  anchorDateAd: string;
  bsDay?: number;
  /** पक्षमा दिनहरूको सङ्ख्या (सामान्यतया १५) */
  pakshaDayCount: number;
  /** मास आरम्भ सङ्केत — जस्तै श्रा. */
  monthInitialLabel: string;
  /** दैनिक पञ्चाङ्ग च.रा. */
  moonRashiNe?: string;
  /** गा.पाशाः — अवधिभित्रका राशि परिवर्तन सङ्केत */
  transitCodes: string[];
  planets: Partial<Record<RashyadiPlanetKey, RashyadiPlanetRow>>;
};

/** पङ्क्ति सङ्केत — मुद्रित पत्रो शैली */
export const RASHYADI_ROW_KEYS = [
  "rashi",
  "ansha",
  "kala",
  "vikala",
  "prati",
  "truti",
] as const;

export type RashyadiRowKey = (typeof RASHYADI_ROW_KEYS)[number];

/** तटपरा / प्रतितत्परा = प्रति-विकला / त्रुटि */
export const RASHYADI_ROW_LABEL: Record<RashyadiRowKey, string> = {
  rashi: "monthInitial",
  ansha: "अं",
  kala: "ग",
  vikala: "वि",
  prati: "प्र",
  truti: "त्र",
};

export function rashyadiCellValue(row: RashyadiPlanetRow, key: RashyadiRowKey): string {
  switch (key) {
    case "rashi":
      return formatRashyadiCell(row.rashi);
    case "ansha":
      return formatRashyadiCell(row.ansha);
    case "kala":
      return formatRashyadiCell(row.kala);
    case "vikala":
      return formatRashyadiCell(row.vikala);
    case "prati":
      return formatRashyadiCell(row.prati);
    case "truti":
      return formatRashyadiCell(row.truti);
  }
}

export function rashyadiFromDegInSign(degInSign: number): Omit<RashyadiCells, "rashi"> {
  const d = Math.floor(degInSign);
  const minFloat = (degInSign - d) * 60;
  const m = Math.floor(minFloat);
  const secFloat = (minFloat - m) * 60;
  const s = Math.floor(secFloat);
  const pratiFloat = (secFloat - s) * 60;
  let prati = Math.round(pratiFloat);
  if (prati >= 60) prati = 59;
  let truti = Math.round((pratiFloat - prati) * 60);
  if (truti >= 60) truti = 59;
  return { ansha: d, kala: m, vikala: s, prati, truti };
}

export function formatRashyadiCell(n: number): string {
  return toNepaliDigits(n);
}

/** पाँच अङ्कको लहर — अंश, कला, विकला, प्रति-विकला, त्रुटि */
export function formatRashyadiNumberLine(row: RashyadiCells): string {
  return [row.ansha, row.kala, row.vikala, row.prati, row.truti]
    .map(formatRashyadiCell)
    .join(" ");
}

export function formatPlanetRashiHeader(key: RashyadiPlanetKey, rashi: number): string {
  return `${RASHYADI_PLANET_ABBREV[key]}.${formatRashyadiCell(rashi)}`;
}
