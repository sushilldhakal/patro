/**
 * Market dates (NEPSE, NRB, gold and silver) in the reader's calendar: मंसिर १०, २०८३ when they read
 * Bikram Sambat, 26 November 2026 when they read AD.
 */
import { formatBsCivilIsoLong } from "@vedic-patro/domain/calendar/bs-calendar";
import { formatPatroCivilDayLabel } from "@vedic-patro/domain/calendar/patro-headline-subtitle";
import { useCalendarSystem, useLocale } from "@vedic-patro/i18n/react";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` → the day in the reader's calendar; anything else is shown as given. */
export function useMarketDate(): (iso: string) => string {
  const { lang, digits } = useLocale();
  const { calendar } = useCalendarSystem();
  return (iso) => {
    if (!ISO_DAY.test(iso)) return digits(iso);
    return calendar === "bs" ? formatBsCivilIsoLong(iso, lang, digits) : formatPatroCivilDayLabel(iso, lang, digits);
  };
}
