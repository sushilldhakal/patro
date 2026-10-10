import type { CalendarDay, MonthCalendar, YearWheelCalendar, YearWheelCalendarDay } from "@/lib/api";
import { parseCivilIsoToDate } from "@/lib/patro-day";

const WEEKDAYS_NE = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"] as const;
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function addDays(iso: string, days: number): string {
  const d = parseCivilIsoToDate(iso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function rashiPair(value: unknown): { en?: string; ne?: string } {
  if (!value) return {};
  if (typeof value === "string") return { en: value };
  const v = value as { name?: string; name_ne?: string };
  return { en: v.name, ne: v.name_ne };
}

/** One year-wheel day → the plain `CalendarDay` shape month screens render. */
function yearWheelDayToCalendarDay(day: YearWheelCalendarDay): CalendarDay {
  const weekdayIdx = parseCivilIsoToDate(day.date_ad).getDay();
  const p = day.panchanga;
  const rashi = rashiPair(p?.chandra_rashi);
  const sunrise = typeof p?.sunrise === "string" ? p.sunrise : p?.sunrise?.local_time_short;
  const sunset = typeof p?.sunset === "string" ? p.sunset : p?.sunset?.local_time_short;

  return {
    // The wheel keeps the slimmed per-day state (planets, angas, lagna); month
    // screens that read `panchanga.*` (gochar, dainik kranti) need it too.
    // Same server object the month endpoint embeds; the two typings just name it differently.
    panchanga: p as unknown as CalendarDay["panchanga"],
    day: day.day,
    date_ad: day.date_ad,
    weekday: WEEKDAYS_NE[weekdayIdx]!,
    weekday_en: WEEKDAYS_EN[weekdayIdx],
    weekday_ne: WEEKDAYS_NE[weekdayIdx],
    tithi: p?.tithi?.name ?? "",
    tithi_ne: p?.tithi?.name_ne,
    nakshatra: p?.nakshatra?.name,
    nakshatra_ne: p?.nakshatra?.name_ne,
    paksha: p?.paksha?.label_en,
    paksha_ne: p?.paksha?.label_ne ?? p?.paksha_ne,
    yoga: p?.yoga?.name,
    yoga_ne: p?.yoga?.name_ne,
    karana: p?.karana?.name,
    karana_ne: p?.karana?.name_ne,
    chandra_rashi: rashi.en,
    chandra_rashi_ne: rashi.ne,
    sunrise: sunrise ?? day.sunrise,
    sunset: sunset ?? day.sunset,
    moonrise: p?.moonrise?.local_time_short ?? p?.moonrise?.local,
    moonset: p?.moonset?.local_time_short ?? p?.moonset?.local,
    festivals: (p?.festivals ?? []).map((f) => f.name_ne ?? f.name_en ?? f.name ?? f.id ?? "").filter(Boolean),
    is_public_holiday: p?.is_public_holiday || (p?.festivals ?? []).some((f) => f.is_public_holiday),
  };
}

/**
 * Slices one BS month out of a cached year-wheel payload, in the shape the
 * month screens already know how to render. Used as the offline fallback for
 * `fetchMonthCalendar` — the year-wheel endpoint is one request per BS year
 * instead of twelve, which is what makes bulk offline downloads affordable.
 */
export function yearWheelToMonthCalendar(yearWheel: YearWheelCalendar, month: number): MonthCalendar | null {
  const monthMeta = yearWheel.months.find((m) => m.month_bs === month);
  if (!monthMeta?.month_start_ad) return null;

  const rangeStart = monthMeta.month_start_ad;
  const rangeEndExclusive = addDays(rangeStart, monthMeta.month_length);

  const days = yearWheel.calendar
    .filter((d) => d.date_ad >= rangeStart && d.date_ad < rangeEndExclusive)
    .map(yearWheelDayToCalendarDay);

  return {
    year_bs: yearWheel.year_bs,
    month_bs: month,
    calendar: days,
    month_length: monthMeta.month_length,
    first_weekday: monthMeta.first_weekday,
    limits: monthMeta.limits,
  };
}
