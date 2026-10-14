/**
 * The month + year nav, shared by the website's and the app's
 * `components/patro-date/PatroMonthYearNav.tsx`: the cross-era subtitle under
 * the headline and the nav's button labels.
 */
import type { Era, Language } from "@vedic-patro/domain/era";
import type { PanchangaLocation } from "@vedic-patro/domain/panchanga-location";
import { useLocale } from "@vedic-patro/i18n/react";
import { usePatroMonthHeadlineSubtitle } from "./use-patro-month-headline-subtitle";

export function usePatroMonthYearNav({
  era,
  year,
  month,
  location,
  crossEraSubtitle,
  displayLanguage,
}: {
  era: Era;
  year: number;
  month: number;
  location?: PanchangaLocation;
  crossEraSubtitle?: string | null;
  displayLanguage?: Language;
}) {
  const { t } = useLocale();
  const subtitle = usePatroMonthHeadlineSubtitle(era, year, month, location, crossEraSubtitle, displayLanguage);
  return {
    crossEraSubtitle: subtitle,
    labels: {
      today: t("calendar.today_btn"),
      month: t("calendar.month_aria"),
      year: t("calendar.year_aria"),
      prev: t("calendar.prev_month"),
      next: t("calendar.next_month"),
    },
  };
}
