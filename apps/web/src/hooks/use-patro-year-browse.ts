import { useState } from "react";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { useLocale } from "@/i18n/locale";
import { adToBS, getCurrentBs } from "@/lib/bs-calendar";
import {
  defaultEraForLanguage,
  type Era,
  type Language,
} from "@/lib/era";

function positiveInt(y: number): number {
  const t = Math.trunc(y);
  return t >= 1 ? t : 1;
}

function calendarEraAsEra(raw: ReturnType<typeof useCalendarEra>): Era {
  return raw === "bbs" || raw === "bs" || raw === "ad" ? raw : "bs";
}

function defaultBrowseYear(era: Era): number {
  if (era === "bs" || era === "bbs") return getCurrentBs().year;
  return new Date().getFullYear();
}

/** Same AD-year leak as {@link coerceMonthBrowseFromUrl} — year-only browse URLs. */
export function coerceYearBrowseFromUrl(
  era: Era,
  year: number | undefined,
): number | undefined {
  if (year == null || era === "ad" || era === "bc") return year;
  if (year === new Date().getFullYear()) return getCurrentBs().year;
  return year;
}

/** Civil “today” is always BS or AD — not BBS (before-era) coordinates. */
export function patroBrowseTodayEra(era: Era): Era {
  if (era === "bbs") return "bs";
  return era;
}

/** Browsed year for “today” in {@link patroBrowseTodayEra}. */
export function patroBrowseTodayYear(era: Era, todayAd?: string): number {
  const targetEra = patroBrowseTodayEra(era);
  if (targetEra === "bs") {
    const bs = todayAd
      ? adToBS(new Date(`${todayAd}T12:00:00`))
      : getCurrentBs();
    return bs.year;
  }
  const d = todayAd ? new Date(`${todayAd}T12:00:00`) : new Date();
  if (targetEra === "ad" || targetEra === "bc") return d.getFullYear();
  return getCurrentBs().year;
}

/** Year browse — positive `year` in the active {@link Era}; no BS↔AD conversion. */
export function usePatroYearBrowse(
  initial?: { year?: number },
  options?: { era?: Era },
) {
  const langEra = useCalendarEra();
  const { lang } = useLocale();
  const fallbackLang: Language = lang === "en" ? "en" : "ne";

  const initialEra = options?.era ?? calendarEraAsEra(langEra);
  const [era, setEraState] = useState<Era>(() => initialEra);
  const [year, setYearState] = useState(() => {
    if (initial?.year != null) {
      return positiveInt(coerceYearBrowseFromUrl(initialEra, initial.year) ?? initial.year);
    }
    return defaultBrowseYear(initialEra);
  });
  const [syncedLang, setSyncedLang] = useState(lang);

  if (lang !== syncedLang) {
    setSyncedLang(lang);
    const nextEra = defaultEraForLanguage(fallbackLang);
    setEraState(nextEra);
    setYearState(defaultBrowseYear(nextEra));
  }

  const setYear = (y: number) => setYearState(positiveInt(y));
  const setEra = (next: Era) => setEraState(next);

  const goToday = (todayAd?: string) => {
    const targetEra = patroBrowseTodayEra(era);
    if (targetEra !== era) setEraState(targetEra);
    setYearState(positiveInt(patroBrowseTodayYear(era, todayAd)));
  };

  return {
    era,
    year,
    setYear,
    setEra,
    goToday,
  } as const;
}

export type PatroYearBrowse = ReturnType<typeof usePatroYearBrowse>;
