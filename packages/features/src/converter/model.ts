/**
 * Date converter — the parts that need no React: today's dates as inputs and
 * the result cards each direction shows.
 */
import type { ConvertAdToBs, ConvertBsToAd } from "@vedic-patro/api-client";
import { adToBS, todayAdString, WEEKDAYS_EN, WEEKDAYS_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { bilingualText, formatLocaleDigits, type Lang } from "@vedic-patro/domain/locale";

export type ConvertMode = "ad-to-bs" | "bs-to-ad";

export type ConvertCard = { labelKey: string; value: string; highlight?: boolean };

/** Today as `YYYY-MM-DD` in AD and in BS (the inputs start here). */
export function todayInputs(now = new Date()): { ad: string; bs: string } {
  const bs = adToBS(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { ad: todayAdString(), bs: `${bs.year}-${pad(bs.month)}-${pad(bs.day)}` };
}

/** The API's English weekday ("Sunday") in the reader's language. */
export function weekdayLabel(weekday: string, lang: Lang): string {
  const i = WEEKDAYS_EN.indexOf(weekday as (typeof WEEKDAYS_EN)[number]);
  return bilingualText(lang, i >= 0 ? WEEKDAYS_NE[i] : weekday, weekday);
}

type Result = ConvertAdToBs | ConvertBsToAd;

/** The six cards under a result; the date converted *to* comes first, highlighted. */
export function resultCards(mode: ConvertMode, r: Result, lang: Lang): ConvertCard[] {
  const month = bilingualText(lang, r.bs_month_name_ne, r.bs_month_name);
  const year = formatLocaleDigits(r.bs_year, lang);
  const day = formatLocaleDigits(r.bs_day, lang);
  const weekday = { labelKey: "converter.weekday", value: weekdayLabel(r.weekday, lang) };
  return mode === "ad-to-bs"
    ? [
        { labelKey: "converter.bs_date", value: formatLocaleDigits(r.bs_date, lang), highlight: true },
        { labelKey: "converter.bs_year", value: year },
        { labelKey: "converter.bs_month", value: month },
        { labelKey: "converter.bs_day", value: day },
        { labelKey: "converter.ad_date", value: formatLocaleDigits(r.ad_date, lang) },
        weekday,
      ]
    : [
        { labelKey: "converter.ad_date", value: formatLocaleDigits(r.ad_date, lang), highlight: true },
        { labelKey: "converter.bs_date", value: formatLocaleDigits(r.bs_date, lang) },
        { labelKey: "converter.bs_month", value: month },
        { labelKey: "converter.bs_day", value: day },
        { labelKey: "converter.bs_year", value: year },
        weekday,
      ];
}
