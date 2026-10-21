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
};

export function abhijitDays(days: readonly CalendarDay[], todayAd: string, lang: Lang): AbhijitDayView[] {
  const digits = (v: string | number) => formatLocaleDigits(v, lang);
  return days.flatMap((day) => {
    const abhijit = abhijitFromCalendarDay(day);
    if (!abhijit) return [];
    return [
      {
        key: day.date_ad,
        dateAd: day.date_ad,
        isToday: day.date_ad === todayAd,
        weekday: bilingualText(lang, day.weekday_ne ?? day.weekday, day.weekday_en ?? day.weekday),
        day: digits(day.day),
        adDay: digits(civilIsoDayOfMonth(day.date_ad)),
        range: digits(abhijit.rangeDisplay),
        noon: abhijit.noonDisplay ? digits(abhijit.noonDisplay) : "—",
        sunrise: formatClockNepali(day.sunrise) ?? day.sunrise ?? "—",
        sunset: formatClockNepali(day.sunset) ?? day.sunset ?? "—",
      },
    ];
  });
}
