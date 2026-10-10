import type { CalendarDay } from "@/lib/api";
import { getMonthDayNakshatra } from "@vedic-patro/domain/panchanga-format";
import { nakshatraShortLabel } from "@vedic-patro/domain/nakshatra-short";

type Lang = "ne" | "en";

export { getMonthDayChandraRashi, getMonthDayNakshatra } from "@vedic-patro/domain/panchanga-format";

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
