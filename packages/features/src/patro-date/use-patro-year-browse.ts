/**
 * Year browse state, shared by the website's `hooks/use-patro-year-browse.ts`
 * and the app's `lib/use-patro-year-browse.ts`: a positive year in the active
 * era (no BS<->AD conversion), reset to the language's default era and that
 * era's "today" when the UI language changes.
 *
 * Each app passes its own starting era as `options.era`.
 */
import { useState } from "react";
import { defaultEraForLanguage, patroBrowseTodayEra, type Era } from "@vedic-patro/domain/calendar/era";
import {
  coerceYearBrowseFromUrl,
  defaultBrowseYear,
  patroBrowseTodayYear,
  positiveInt,
} from "@vedic-patro/domain/calendar/patro-browse-params";
import { useLocale } from "@vedic-patro/i18n/react";

export function usePatroYearBrowse(initial?: { year?: number }, options?: { era?: Era | null }) {
  const { lang } = useLocale();
  const initialEra = options?.era ?? defaultEraForLanguage(lang === "en" ? "en" : "ne");
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
    const nextEra = defaultEraForLanguage(lang === "en" ? "en" : "ne");
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

  return { era, year, setYear, setEra, goToday } as const;
}

export type PatroYearBrowse = ReturnType<typeof usePatroYearBrowse>;
