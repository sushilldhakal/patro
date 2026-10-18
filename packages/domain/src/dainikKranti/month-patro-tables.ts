import { formatTimeShort } from "../panchanga-format";

export const GRAHA_EN_BY_KEY: Record<string, string> = {
  sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter",
  venus: "Venus", saturn: "Saturn", rahu: "Rahu", ketu: "Ketu",
};

export const PATRO_PLANET_KEYS = [
  "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu",
] as const;

export const PATRO_PLANET_NE: Record<(typeof PATRO_PLANET_KEYS)[number], string> = {
  sun: "सूर्य",
  moon: "चन्द्र",
  mars: "मंगल",
  mercury: "बुध",
  jupiter: "गुरु",
  venus: "शुक्र",
  saturn: "शनि",
  rahu: "राहु",
};

export type LagnaMatrixRow = {
  day: number;
  dateAd: string;
  weekdayNe?: string;
  weekdayEn?: string;
  sunrise?: string;
  /** Rashi number 1–12 → formatted patro clock */
  times: Record<number, string | undefined>;
};

export type GrahaSpashtaRow = {
  day: number;
  dateAd: string;
  weekdayNe?: string;
  weekdayEn?: string;
  planets: Partial<
    Record<
      (typeof PATRO_PLANET_KEYS)[number],
      { rashiNe: string; rashiEn?: string; coords: string; isRetrograde?: boolean; isCombust?: boolean }
    >
  >;
  deshaantar?: string;
  akshamsha?: string;
  belaantar?: string;
};

export type CalcNoteKind = "ingress" | "late_night" | "paksha_boundary" | "udayast" | "motion";

export type CalcNote = {
  day: number;
  dateAd: string;
  text: string;
  textEn?: string;
  kind: CalcNoteKind;
};

export function isLateNightPatroTime(timeShort: string, sunriseShort?: string): boolean {
  const t = formatTimeShort(timeShort);
  const s = formatTimeShort(sunriseShort);
  if (!t || !s) return false;
  const th = Number(t.split(":")[0]);
  const sh = Number(s.split(":")[0]);
  return !Number.isNaN(th) && !Number.isNaN(sh) && th < sh;
}
