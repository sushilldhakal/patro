/**
 * The 3D sky's time stamp, shared by both apps'
 * `components/sky3d/AakashGocharSky.tsx`: the HUD's date and time · place
 * line (Bikram Samvat by default, marked approximate past the compiled table;
 * proleptic Gregorian when the AD calendar is on — the language only names the
 * parts) and the corner pill's short day and
 * twelve-hour clock. Also the graha list the camera can follow.
 */
import { useMemo } from "react";
import { bsMonthLabel, WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { bikramFromSun } from "@vedic-patro/domain/astronomy/sky3d/bikram-solar";
import { useCalendarSystem, useLocale } from "@vedic-patro/i18n/react";

/**
 * The place's civil midnight, from an instant already shifted to the place's
 * wall clock — so the table is asked about the place's day, not the device's.
 * Built through the UTC setters because `new Date(y, ...)` folds years 0–99.
 */
function zoneMidnight(shifted: Date): Date {
  const midnight = new Date(0);
  midnight.setUTCFullYear(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  midnight.setUTCHours(0, 0, 0, 0);
  return midnight;
}

export function useSkyStamp({
  simDate,
  zoneOffsetMs,
  timeZone,
  sunLongitude,
  sunSpeed,
}: {
  simDate: Date;
  zoneOffsetMs: number;
  timeZone: string;
  sunLongitude?: number | null;
  sunSpeed?: number;
}) {
  const { t, lang, digits } = useLocale();
  const { calendar } = useCalendarSystem();
  return useMemo(() => {
    const local = new Date(simDate.getTime() + zoneOffsetMs);
    const y = local.getUTCFullYear();
    const mo = String(local.getUTCMonth() + 1).padStart(2, "0");
    const d = String(local.getUTCDate()).padStart(2, "0");
    const wall = `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
    // 1 Jan 1970 was a Thursday, and 0 is Sunday.
    const dayIndex = Math.floor((simDate.getTime() + zoneOffsetMs) / 86400000);
    const weekday = (((dayIndex + 4) % 7) + 7) % 7;
    const place = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
    // Year 0 is 1 BC, so anything at or below it reads with the era spelled out.
    const adYear = y > 0 ? `${y}` : `${1 - y} BC`;

    // Past the compiled table the Sun is the calendar; marked approximate.
    const bs = bikramFromSun(simDate, sunLongitude ?? 0, sunSpeed, zoneMidnight(local));

    // The corner readout: the day, and a twelve-hour clock with a half-of-day word.
    const h24 = local.getUTCHours();
    const minute = String(local.getUTCMinutes()).padStart(2, "0");
    const h12 = h24 % 12 || 12;
    const half = lang === "en" ? (h24 < 12 ? "AM" : "PM") : h24 < 12 ? t("ui.sky3d.x_97797b0d") : t("ui.sky3d.x_1842d5be");
    const short = {
      day: `${bsMonthLabel(bs.month, lang)} ${digits(bs.day)}`,
      clock: `${digits(h12)}:${digits(minute)} ${half}`,
    };

    if (calendar === "ad") {
      const adDate =
        lang === "en"
          ? `${adYear}-${mo}-${d}`
          : `${y > 0 ? digits(y) : t("ui.sky3d.x_775bec8c", { v0: digits(1 - y) })}-${digits(mo)}-${digits(d)}`;
      return { date: adDate, time: `${digits(wall)} · ${place}`, short };
    }

    const adYearLabel = y > 0 ? t("ui.sky3d.x_87454780", { v0: digits(y) }) : t("ui.sky3d.x_775bec8c", { v0: digits(1 - y) });
    const mark = bs.approximate ? "≈" : "";
    return {
      short,
      date: t("ui.sky3d.x_5616de2b", {
        v0: mark,
        v1: digits(bs.year),
        v2: bsMonthLabel(bs.month, lang),
        v3: digits(bs.day),
        v4: lang === "en" ? WEEKDAYS_SHORT[weekday] : WEEKDAYS_SHORT_NE[weekday],
      }),
      // Out past the table the AD year rides along, to check against a known calendar.
      time: `${digits(wall)} · ${place}${bs.approximate ? ` · ${adYearLabel}` : ""}`,
    };
  }, [simDate, zoneOffsetMs, timeZone, lang, calendar, digits, sunLongitude, sunSpeed, t]);
}

/** Bodies the camera can focus on / follow, with their catalogue keys. */
const FOCUS_KEYS = [
  ["sun", "kundali.report.meta_sun"],
  ["earth", "vastu.element.earth"],
  ["moon", "kundali.graha_name_moon"],
  ["mercury", "kundali.graha_name_mercury"],
  ["venus", "kundali.graha_name_venus"],
  ["jupiter", "kundali.graha_name_jupiter"],
  ["saturn", "kundali.graha_name_saturn"],
  ["mars", "kundali.graha_name_mars"],
  ["rahu", "grahas.rahu"],
  ["ketu", "grahas.ketu"],
] as const;

export type SkyFocusKey = (typeof FOCUS_KEYS)[number][0];

/** The focus targets, labelled in the reader's language. */
export function useSkyFocusTargets() {
  const { t } = useLocale();
  return useMemo(() => FOCUS_KEYS.map(([key, labelKey]) => ({ key, label: t(labelKey) })), [t]);
}
