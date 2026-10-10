import type { CalendarDay } from "@/lib/api";
import { nakshatraShortLabel } from "@/lib/nakshatra-short";

type Lang = "ne" | "en";

export function getMonthDayChandraRashi(day: CalendarDay, lang: Lang): string | undefined {
  const moon = day.panchanga?.planets?.moon;
  const ne =
    day.chandra_rashi_ne ??
    day.panchanga?.chandra_rashi_ne ??
    moon?.rashi_ne ??
    day.chandra_rashi ??
    day.panchanga?.chandra_rashi ??
    moon?.rashi;
  const en =
    day.chandra_rashi ??
    day.panchanga?.chandra_rashi ??
    moon?.rashi ??
    day.chandra_rashi_ne ??
    day.panchanga?.chandra_rashi_ne ??
    moon?.rashi_ne;
  return (lang === "en" ? en : ne) ?? en ?? ne;
}

export function getMonthDayNakshatra(day: CalendarDay, lang: Lang): string | undefined {
  const ne =
    day.nakshatra_ne ??
    day.panchanga?.nakshatra?.name_ne ??
    day.nakshatra ??
    day.panchanga?.nakshatra?.name;
  const en =
    day.nakshatra ??
    day.panchanga?.nakshatra?.name ??
    day.nakshatra_ne ??
    day.panchanga?.nakshatra?.name_ne;
  return (lang === "en" ? en : ne) ?? en ?? ne;
}

function nakshatraLookupName(day: CalendarDay): string | undefined {
  return (
    day.nakshatra ??
    day.nakshatra_ne ??
    day.panchanga?.nakshatra?.name ??
    day.panchanga?.nakshatra?.name_ne ??
    undefined
  );
}

/** Abbreviated nakshatra for narrow month cells; falls back to full name. */
export function getMonthDayNakshatraShort(day: CalendarDay, lang: Lang): string | undefined {
  const full = getMonthDayNakshatra(day, lang);
  const short = nakshatraShortLabel(nakshatraLookupName(day), lang);
  return short ?? full;
}

export function getMonthDayYoga(day: CalendarDay, lang: Lang): string {
  const ne = day.yoga_ne ?? day.yoga ?? "—";
  const en = day.yoga ?? day.yoga_ne ?? "—";
  return (lang === "en" ? en : ne) ?? en ?? ne;
}

export function getMonthDayKarana(day: CalendarDay, lang: Lang): string {
  const ne = day.karana_ne ?? day.karana ?? "—";
  const en = day.karana ?? day.karana_ne ?? "—";
  return (lang === "en" ? en : ne) ?? en ?? ne;
}
