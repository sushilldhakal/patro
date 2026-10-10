import { useState } from "react";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { useLocale } from "@/i18n/locale";
import { adToBS, getCurrentBs } from "@/lib/bs-calendar";
import {
  defaultEraForLanguage,
  type Era,
  type Language,
} from "@/lib/era";
import { patroBrowseTodayEra } from "@/hooks/use-patro-year-browse";
import { shiftPatroBrowseMonth } from "@/lib/patro-year-browse-step";
import {
  isValidBrowseYear,
  maxBrowseYearForEra,
} from "@/lib/patro-year-axis";

function positiveInt(y: number): number {
  const t = Math.trunc(y);
  return t >= 1 ? t : 1;
}

function positiveMonth(m: number): number {
  const t = Math.trunc(m);
  if (t < 1) return 1;
  if (t > 12) return 12;
  return t;
}

function calendarEraAsEra(raw: ReturnType<typeof useCalendarEra>): Era {
  return raw === "bbs" || raw === "bs" || raw === "ad" ? raw : "bs";
}

function defaultMonthBrowseParts(era: Era): { year: number; month: number } {
  if (era === "bs" || era === "bbs") {
    return getCurrentBs();
  }
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

/**
 * Vikram browse URLs carry BS year/month. Older builds mirrored Gregorian
 * `getFullYear()` / `getMonth()+1` into `era=bs` links — rewrite that pair.
 */
export function coerceMonthBrowseFromUrl(
  era: Era,
  year: number | undefined,
  month: number | undefined,
): { year?: number; month?: number } {
  if (era !== "bs" && era !== "bbs") {
    return { year, month };
  }
  const now = new Date();
  const adYear = now.getFullYear();
  const adMonth = now.getMonth() + 1;
  if (year !== adYear) {
    return { year, month };
  }
  const bs = getCurrentBs();
  return {
    year: bs.year,
    month: month === adMonth ? bs.month : month,
  };
}

function resolveInitialMonthBrowse(
  era: Era,
  initial?: { year?: number; month?: number },
): { era: Era; year: number; month: number } {
  const defaults = defaultMonthBrowseParts(era);
  if (!initial) {
    return { era, year: defaults.year, month: defaults.month };
  }
  const coerced = coerceMonthBrowseFromUrl(era, initial.year, initial.month);
  const year = positiveInt(coerced.year ?? initial.year ?? defaults.year);
  const month = positiveMonth(coerced.month ?? initial.month ?? defaults.month);
  return { era, year, month };
}

/** Month+year browse — positive parts in the active era; no BS↔AD conversion. */
export function usePatroMonthBrowse(
  initial?: { year?: number; month?: number },
  options?: { era?: Era },
) {
  const langEra = useCalendarEra();
  const { lang } = useLocale();
  const fallbackLang: Language = lang === "en" ? "en" : "ne";

  const baseEra = options?.era ?? calendarEraAsEra(langEra);
  const initialParts = resolveInitialMonthBrowse(baseEra, initial);

  const [era, setEraState] = useState<Era>(() => initialParts.era);
  const [year, setYearState] = useState(() => initialParts.year);
  const [month, setMonthState] = useState(() => initialParts.month);
  const [syncedLang, setSyncedLang] = useState(lang);

  if (lang !== syncedLang) {
    setSyncedLang(lang);
    const nextEra = defaultEraForLanguage(fallbackLang);
    setEraState(nextEra);
    const next = defaultMonthBrowseParts(nextEra);
    setYearState(next.year);
    setMonthState(next.month);
  }

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
      const bs = todayAd
        ? adToBS(new Date(`${todayAd}T12:00:00`))
        : getCurrentBs();
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
