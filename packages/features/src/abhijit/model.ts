/** Abhijit muhurta — one card per day of the month, and today's hero. */
import type { CalendarDay } from "@vedic-patro/api-client";
import { bilingualText, formatLocaleDigits, type Lang } from "@vedic-patro/domain/locale";
import { abhijitFromCalendarDay, formatClockNepali } from "@vedic-patro/read-models/panchanga/panchanga-format";
import { civilIsoDayOfMonth } from "@vedic-patro/domain/calendar/patro-day";

export type AbhijitDayView = {
  key: string;
  dateAd: string;
  isToday: boolean;
  weekday: string;
  /** BS day of month and AD day of month. */
  day: string;
  adDay: string;
  range: string;
  noon: string;
  sunrise: string;
  sunset: string;
  /** Wednesday: अभिजित् is not used, so the card has no time. */
  omitted: boolean;
};

const isWednesday = (day: CalendarDay) => (day.weekday_en ?? day.weekday ?? "").toLowerCase() === "wednesday";

export function abhijitDays(
  days: readonly CalendarDay[],
  todayAd: string,
  lang: Lang,
  omittedLabel: string,
): AbhijitDayView[] {
  const digits = (v: string | number) => formatLocaleDigits(v, lang);
  const out: AbhijitDayView[] = [];
  for (const day of days) {
    const abhijit = abhijitFromCalendarDay(day);
    if (!abhijit && !isWednesday(day)) continue;
    out.push({
      key: day.date_ad,
      dateAd: day.date_ad,
      isToday: day.date_ad === todayAd,
      weekday: bilingualText(lang, day.weekday_ne ?? day.weekday, day.weekday_en ?? day.weekday),
      day: digits(day.day),
      adDay: digits(civilIsoDayOfMonth(day.date_ad)),
      sunrise: formatClockNepali(day.sunrise) ?? day.sunrise ?? "—",
      sunset: formatClockNepali(day.sunset) ?? day.sunset ?? "—",
      range: abhijit ? digits(abhijit.rangeDisplay) : omittedLabel,
      noon: abhijit?.noonDisplay ? digits(abhijit.noonDisplay) : abhijit ? "—" : "",
      omitted: !abhijit,
    });
  }
  return out;
}

/** The raw abhijit window of a day (its `HH:MM` start and end). */
export function abhijitClock(day: CalendarDay): { start?: string; end?: string } | null {
  const nested = day.panchanga as { muhurta?: { abhijit?: { start_time?: string; end_time?: string } } } | undefined;
  const w = (day.abhijit as { start_time?: string; end_time?: string } | undefined) ?? nested?.muhurta?.abhijit;
  return w ? { start: w.start_time, end: w.end_time } : null;
}
