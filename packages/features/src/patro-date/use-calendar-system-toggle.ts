/**
 * The BS / AD choice, shared by the website and the app: the label, the two
 * options (always BS first, then AD, so they never swap places when pressed),
 * their hints and which one is on. Each app draws its own widget on top of
 * this; `select` only sets the calendar preference — the browse hooks follow it.
 */
import type { CalendarSystem } from "@vedic-patro/domain/calendar/calendar-system";
import { useCalendarSystem, useLocale } from "@vedic-patro/i18n/react";

export type CalendarSystemOption = {
  calendar: CalendarSystem;
  label: string;
  hint: string;
  active: boolean;
};

export function useCalendarSystemToggle(): {
  label: string;
  ariaLabel: string;
  options: CalendarSystemOption[];
  select: (c: CalendarSystem) => void;
} {
  const { t } = useLocale();
  const { calendar, setCalendar } = useCalendarSystem();
  return {
    label: t("calendar_system.label"),
    ariaLabel: t("calendar_system.switch_aria"),
    options: [
      { calendar: "bs", label: t("calendar_system.bs"), hint: t("calendar_system.bs_hint"), active: calendar === "bs" },
      { calendar: "ad", label: t("calendar_system.ad"), hint: t("calendar_system.ad_hint"), active: calendar === "ad" },
    ],
    select: (c) => setCalendar(c),
  };
}
