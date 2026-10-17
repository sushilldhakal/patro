/**
 * The data behind both apps' `components/panchanga/WheelChart.tsx` — the
 * panchanga wheel's rings: their radii (each ring shares a boundary with its
 * neighbour), the glyph box sizes, how a long ring label stacks radially, and
 * the labels in the reader's language. Each app draws the SVG.
 */
import { useMemo } from "react";
import { bilingualText } from "@vedic-patro/domain/locale";
import { GREG_EN, GREG_NE } from "@vedic-patro/domain/wheel-data";
import { useLocale } from "@vedic-patro/i18n/react";

/** Ring radii in the wheel's viewBox, outside to in. */
export const WHEEL_CHART_R = {
  rimOuter: 497,
  tickIn: 481,
  gregOut: 481,
  gregMid: 467,
  gregIn: 453,
  bsOut: 453,
  bsMid: 438,
  bsIn: 424,
  nakOut: 423,
  nakIcon: 403,
  nakName: 372,
  nakIn: 345,
  padaOut: 345,
  padaNum: 336,
  padaIn: 327,
  rashiOut: 263,
  rashiGlyph: 246,
  rashiName: 222,
  rashiIn: 202,
  core: 202,
} as const;

/**
 * Yoga, karana and tithi rings. Yoga's inner edge is pinned just clear of the
 * outermost planet orbit; karana meets the pada ring and tithi the rashi ring.
 * The planet orbits are 20% larger than before, so yoga and the rashi inner
 * edge move out with them. Yoga keeps its 38-unit width.
 */
export const WHEEL_CHART_INNER_R = {
  yogaIn: 164,
  yogaOut: 202,
  karanaIn: 303,
  karanaOut: 327,
  tithiIn: 263,
  tithiOut: 303,
} as const;

/** Glyph boxes (longer side of the artwork, "contain" fits). */
export const WHEEL_RASHI_GLYPH_SIZE = 30;
export const WHEEL_NAK_GLYPH_SIZE = 26;

export type WheelHover = { type: "nak"; i: number } | { type: "rashi"; i: number };

/** Split a ring label on whitespace so each word gets its own radial row. */
export function wheelLabelRows(label: string): string[] {
  return label.trim().split(/\s+/).filter(Boolean);
}

export function useWheelChartLabels() {
  const { lang } = useLocale();
  // Memoised on the language: the wheel's layers are memoised on these.
  return useMemo(
    () => ({
      lang,
      pick: (ne: string, en: string) => bilingualText(lang, ne, en),
      /** The Gregorian month ring, January first. */
      gregMonths: GREG_NE.map((ne, i) => bilingualText(lang, ne, GREG_EN[i]!)),
    }),
    [lang],
  );
}
