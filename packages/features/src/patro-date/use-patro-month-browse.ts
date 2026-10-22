/**
 * Month + year browse state, shared by the website's
 * `hooks/use-patro-month-browse.ts` and the app's `lib/use-patro-month-browse.ts`:
 * positive year/month parts in the active era (no BS<->AD conversion), reset
 * to the language's default era when the UI language changes.
 *
 * Each app passes its own starting era (the website's calendar-era store, the
 * app's onboarding choice) as `options.era`.
 */
import { useEffect, useState } from "react";
import { adToBS, getCurrentBs } from "@vedic-patro/domain/calendar/bs-calendar";
import { defaultEraForLanguage, patroBrowseTodayEra, type Era } from "@vedic-patro/domain/calendar/era";
import {
  coerceMonthBrowseFromUrl,
  defaultMonthBrowseParts,
  positiveInt,
  positiveMonth,
} from "@vedic-patro/domain/calendar/patro-browse-params";
import { shiftPatroBrowseMonth } from "@vedic-patro/domain/calendar/patro-year-browse-step";
import { isValidBrowseYear, maxBrowseYearForEra } from "@vedic-patro/domain/calendar/patro-year-axis";
import { useLocale } from "@vedic-patro/i18n/react";
import { rememberBrowse, rememberedMonth, rememberedYear } from "@vedic-patro/domain/calendar/remembered-browse";

function resolveInitialMonthBrowse(
  era: Era,
  initial?: { year?: number; month?: number },
): { era: Era; year: number; month: number } {
  const defaults = defaultMonthBrowseParts(era);
  if (!initial) {
    // No year in the link: open on the month the reader last browsed to.
    const last = rememberedMonth(era);
    if (last) return { era, ...last };
    const lastYear = rememberedYear(era);
    return { era, year: lastYear ?? defaults.year, month: defaults.month };
  }
  const coerced = coerceMonthBrowseFromUrl(era, initial.year, initial.month);
  const year = positiveInt(coerced.year ?? initial.year ?? defaults.year);
  const month = positiveMonth(coerced.month ?? initial.month ?? defaults.month);
  return { era, year, month };
}

export function usePatroMonthBrowse(
  initial?: { year?: number; month?: number },
  options?: { era?: Era | null },
) {
  const { lang } = useLocale();
  const baseEra = options?.era ?? defaultEraForLanguage(lang === "en" ? "en" : "ne");
  const initialParts = resolveInitialMonthBrowse(baseEra, initial);

  const [era, setEraState] = useState<Era>(() => initialParts.era);
  const [year, setYearState] = useState(() => initialParts.year);
  const [month, setMonthState] = useState(() => initialParts.month);
  const [syncedLang, setSyncedLang] = useState(lang);

  if (lang !== syncedLang) {
    setSyncedLang(lang);
    const nextEra = defaultEraForLanguage(lang === "en" ? "en" : "ne");
    setEraState(nextEra);
    const next = defaultMonthBrowseParts(nextEra);
    setYearState(next.year);
    setMonthState(next.month);
  }

  useEffect(() => {
    rememberBrowse(era, year, month);
  }, [era, year, month]);

  const setYear = (y: number) => {
    const n = positiveInt(y);
    if (!isValidBrowseYear(era, n)) return;
    setYearState(n);
  };
  const setEra = (next: Era) => {
    if (next === "bs" && year > (maxBrowseYearForEra("bs") ?? 1)) return;
    setEraState(next);
  };

  /** Apply era + year together (e.g. year picker after a draft BBS/BS toggle). */
  const commitEraYear = (nextEra: Era, y: number) => {
    const n = positiveInt(y);
    if (nextEra === "bs" && n > (maxBrowseYearForEra("bs") ?? 1)) return;
    if (!isValidBrowseYear(nextEra, n)) return;
    setEraState(nextEra);
    setYearState(n);
  };
  const setMonth = (m: number) => setMonthState(positiveMonth(m));

  const setYearMonth = (y: number, m: number) => {
    if (!isValidBrowseYear(era, y)) return;
    setYearState(positiveInt(y));
    setMonthState(positiveMonth(m));
  };

  const stepMonth = (delta: number) => {
    const next = shiftPatroBrowseMonth(era, year, month, delta);
    setYearState(next.year);
    setMonthState(next.month);
  };

  const goToday = (todayAd?: string) => {
    const targetEra = patroBrowseTodayEra(era);
    if (targetEra !== era) setEraState(targetEra);

    if (targetEra === "bs") {
      const bs = todayAd ? adToBS(new Date(`${todayAd}T12:00:00`)) : getCurrentBs();
      setYearState(bs.year);
      setMonthState(bs.month);
      return;
    }
    const d = todayAd ? new Date(`${todayAd}T12:00:00`) : new Date();
    if (targetEra === "ad" || targetEra === "bc") {
      setYearState(d.getFullYear());
      setMonthState(d.getMonth() + 1);
    }
  };

  return {
    era,
    year,
    month,
    setYear,
    setEra,
    commitEraYear,
    setMonth,
    setYearMonth,
    stepMonth,
    goToday,
  } as const;
}

export type PatroMonthBrowse = ReturnType<typeof usePatroMonthBrowse>;
