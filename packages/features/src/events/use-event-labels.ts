/**
 * How the event form words its values, the same on the website and in the app: the day as Apple
 * Calendar says it ("Today", "Tomorrow", else "Fri, Kartik 21, 2083"), the clock ("1:00 pm" in
 * English, "१३:००" in Nepali as the rest of the app writes times), and the alert choices.
 */
import { useMemo } from "react";
import { BS_MONTH_NAMES, BS_MONTHS_NE, WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE, bsFromCivilIso } from "@vedic-patro/domain/calendar/bs-calendar";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { useLocale } from "@vedic-patro/i18n/react";

const pad = (n: number) => String(n).padStart(2, "0");

function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

export function useEventLabels(today: string) {
  const { t, lang, digits } = useLocale();
  return useMemo(() => {
    /** "Kartik 20, 2083" — the BS date of a Gregorian "YYYY-MM-DD". */
    const bsDate = (iso: string) => {
      const bs = bsFromCivilIso(iso);
      const month = (lang === "en" ? BS_MONTH_NAMES : BS_MONTHS_NE)[bs.month - 1] ?? "";
      return `${month} ${digits(bs.day)}, ${digits(bs.year)}`;
    };
    /** "Today" / "Tomorrow" / "Yesterday", else "Fri, Kartik 21, 2083". */
    const day = (iso: string) => {
      if (iso === today) return t("events.today");
      if (iso === shiftDate(today, 1)) return t("events.tomorrow");
      if (iso === shiftDate(today, -1)) return t("events.yesterday");
      const wd = (lang === "en" ? WEEKDAYS_SHORT : WEEKDAYS_SHORT_NE)[weekdayOf(iso)];
      return `${wd}, ${bsDate(iso)}`;
    };
    /** "13:05" → "1:05 pm" (English) or "१३:०५" (Nepali). */
    const clock = (time: string) => {
      const [h = 0, m = 0] = time.split(":").map(Number);
      if (lang !== "en") return digits(`${pad(h)}:${pad(m)}`);
      return `${((h + 11) % 12) + 1}:${pad(m)} ${h >= 12 ? "pm" : "am"}`;
    };
    /** Minutes before the start; null = none. */
    const alert = (minutes: number | null) => {
      if (minutes == null) return t("events.alert_none");
      if (minutes === 0) return t("events.alert_at_time");
      if (minutes < 60) return t("events.alert_minutes", { count: digits(minutes) });
      if (minutes === 60) return t("events.alert_hour");
      if (minutes < 1440) return t("events.alert_hours", { count: digits(minutes / 60) });
      if (minutes === 1440) return t("events.alert_day");
      if (minutes === 10080) return t("events.alert_week");
      return t("events.alert_days", { count: digits(minutes / 1440) });
    };
    /** "Australia/Melbourne" → "Melbourne". */
    const zone = (name: string) => (name.split("/").pop() ?? name).replace(/_/g, " ");
    return { bsDate, day, clock, alert, zone };
  }, [t, lang, digits, today]);
}
