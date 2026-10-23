/**
 * Client-side formatting of Bikram Sambat dates that arrive as already-computed
 * parts. No conversion arithmetic — the backend owns that.
 */

import { formatLocaleDigits } from "../locale";
import { monthLabel } from "./patro-month-labels";
import { patroEraShortLabel } from "./patro-era-label";

export type BsDateParts = { year: number; month: number; day: number };

type DigitFn = (value: string | number) => string;

function resolve(lang: string, digitFn?: DigitFn): { l: "en" | "ne"; d: DigitFn } {
  const l = lang.slice(0, 2) === "en" ? "en" : "ne";
  return { l, d: digitFn ?? ((v) => formatLocaleDigits(v, l)) };
}

/** "Baisakh 12, 2083 BS" (en) / "वैशाख १२, २०८३ वि.सं." (ne). */
export function formatBsDate({ year, month, day }: BsDateParts, lang: string, digitFn?: DigitFn): string {
  const { l, d } = resolve(lang, digitFn);
  return `${monthLabel("bs", month, l)} ${d(day)}, ${d(year)} ${patroEraShortLabel("bs", l)}`;
}

/** "Baisakh 2083 BS" (en) / "वैशाख २०८३ वि.सं." (ne). */
export function formatBsMonthYear(year: number, month: number, lang: string, digitFn?: DigitFn): string {
  const { l, d } = resolve(lang, digitFn);
  return `${monthLabel("bs", month, l)} ${d(year)} ${patroEraShortLabel("bs", l)}`;
}
