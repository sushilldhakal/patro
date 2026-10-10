import { useState } from "react";
import { getCurrentBs } from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { getCachedCalendarEraPreference } from "@/lib/patro-era-preference";
import { defaultEraForLanguage, type Era } from "@vedic-patro/domain/era";

/** Year the browse opens on for an era — BS/BBS count in BS, AD/BC in Gregorian. */
function defaultBrowseYear(era: Era): number {
  if (era === "bs" || era === "bbs") return getCurrentBs().year;
  return new Date().getFullYear();
}

/**
 * Shared year-browse state for yearly pages (suryakranti, holidays, sait, …).
 *
 * Era follows the UI language: switching to English moves the browse to AD and
 * back to BS for Nepali, resetting the year to that era's "today" — otherwise a
 * BS year would be read as a Gregorian one (and vice versa) the moment the
 * language flips. Mirrors the web `usePatroYearBrowse` language→era sync.
 */
export function usePatroYearBrowse(initialYear?: number) {
  const { lang } = useLocale();
  const [era, setEra] = useState<Era>(
    () => getCachedCalendarEraPreference() ?? defaultEraForLanguage(lang),
  );
  const [year, setYear] = useState(initialYear ?? getCurrentBs().year);
  const [syncedLang, setSyncedLang] = useState(lang);

  if (lang !== syncedLang) {
    setSyncedLang(lang);
    const nextEra = defaultEraForLanguage(lang);
    setEra(nextEra);
    setYear(defaultBrowseYear(nextEra));
  }

  return { era, setEra, year, setYear };
}
