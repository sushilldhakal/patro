import type { NavataraTone, RashifalPeriod } from "@vedic-patro/api-client";
import { formatBsCivilIsoRange } from "./bs-calendar";
import { toDevanagariDigits } from "./locale";
import { addCivilDays, parseCivilIsoToDate } from "./patro-day";

/**
 * Score bar fill per tone. Kept as a separate scale from the tone *background*
 * chips so a 0–100 meter reads as a meter rather than as another badge.
 */
const TONE_BAR: Record<NavataraTone, string> = {
  best: "bg-emerald-500",
  good: "bg-emerald-400/80",
  neutral: "bg-amber-400/80",
  bad: "bg-orange-500/80",
  worst: "bg-rose-500",
};

export function rashifalToneBar(tone: NavataraTone | undefined): string {
  return TONE_BAR[tone ?? "neutral"];
}

const TONE_TEXT: Record<NavataraTone, string> = {
  best: "text-emerald-600 dark:text-emerald-400",
  good: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-amber-600 dark:text-amber-400",
  bad: "text-orange-600 dark:text-orange-400",
  worst: "text-rose-600 dark:text-rose-400",
};

export function rashifalToneText(tone: NavataraTone | undefined): string {
  return TONE_TEXT[tone ?? "neutral"];
}

/** Nepali numerals for a plain integer, matching the server's own formatting. */
export function toNepaliDigits(value: number | string, lang?: string): string {
  const text = String(value);
  if (lang !== "ne") return text;
  return toDevanagariDigits(text);
}

/**
 * The window-identifying fields both {@link RashifalBlock} and
 * {@link RashifalPersonal} carry — the range strip and its prev/next read
 * whichever of the two payloads is actually on screen (the general grid, or
 * one profile's personal reading), so these helpers take just this common
 * shape rather than the full union.
 */
export interface RashifalWindowSource {
  range_start_ad?: string;
  range_end_ad?: string;
  bs_year?: number;
  bs_month_name_ne?: string;
  bs_month_name_en?: string;
}

/**
 * The window a period tab is actually showing, read straight off the already-
 * fetched payload rather than recomputed client-side — daily has nothing to
 * add (the main date nav already names the day), weekly/monthly/yearly each
 * use whichever fields the server already resolved for that window.
 */
export function rashifalRangeLabel(
  source: RashifalWindowSource | undefined,
  period: RashifalPeriod,
  lang: string,
): string | undefined {
  if (!source) return undefined;
  const digitFn = (n: number | string) => toNepaliDigits(n, lang);
  // Weekly gets the Vikram span, not the Gregorian one in Nepali digits: the
  // monthly and yearly tabs beside it are already BS, and this page is browsed
  // in BS (`era=bs`), so an AD week here was the odd label out.
  if (period === "weekly" && source.range_start_ad && source.range_end_ad) {
    return formatBsCivilIsoRange(source.range_start_ad, source.range_end_ad, lang, digitFn);
  }
  if (period === "monthly" && source.bs_year != null) {
    const monthName = lang === "ne" ? source.bs_month_name_ne : source.bs_month_name_en;
    return `${monthName ?? ""} ${digitFn(source.bs_year)}`.trim();
  }
  if (period === "yearly" && source.bs_year != null) {
    return lang === "ne" ? `वि.सं. ${digitFn(source.bs_year)}` : `BS ${digitFn(source.bs_year)}`;
  }
  return undefined;
}

/**
 * Anchor date to browse to for "prev"/"next" on a period tab.
 *
 * Daily just steps one civil day either way. For weekly/monthly/yearly, moving
 * by a day (the shared date-nav's own step unit) usually lands inside the
 * *same* server-resolved window — a BS month runs 29–32 days, so a single
 * ±1-day nudge only crosses into the next one on a lucky click, which is
 * exactly the "needs 2–3 clicks" complaint. Stepping to one day past the
 * window's own boundary — already known from the payload that produced the
 * button — guarantees a new window on every click, with no BS calendar
 * arithmetic duplicated on the client.
 */
export function rashifalStepDate(
  source: RashifalWindowSource | undefined,
  period: RashifalPeriod,
  currentDate: Date,
  direction: 1 | -1,
): Date {
  if (period === "daily" || !source?.range_start_ad || !source.range_end_ad) {
    return addCivilDays(currentDate, direction);
  }
  const boundaryIso = direction > 0 ? source.range_end_ad : source.range_start_ad;
  return addCivilDays(parseCivilIsoToDate(boundaryIso), direction);
}
