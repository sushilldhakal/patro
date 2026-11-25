// The printable patro month (`/nepal/patro/{y}/{m}`, `patro::presentation::patro_month`): the lite month grid laid out
// as a patro page, under the header `build_calendar_header` makes from the month's middle day.
import { bsMonth, civilFromJdn, isoFromJdn } from "../../astronomy/lunar-month";
import type { Sky } from "../../astronomy/sky";
import type { Json } from "./blocks";
import { buildDay, locationBlock, type DayInput } from "./day";
import { BS_MONTH_NAMES, BS_MONTH_NAMES_NE } from "./tables.generated";

const AD_MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** `build_calendar_header(bs_year, bs_month, location)`; null when the middle day cannot be made here. */
export function calendarHeader(sky: Sky, bsYear: number, bsMonthNumber: number, place: Omit<DayInput, "year" | "month" | "day">): Json | null {
  const span = bsMonth(bsYear, bsMonthNumber);
  if (!span) return null;
  const mid = civilFromJdn(span.first + Math.min(span.length, 15) - 1);
  const raw = buildDay(sky, { ...place, year: mid.year, month: mid.month, day: mid.day });
  if (!raw) return null;
  const lunar = (raw.lunar_month ?? {}) as Json;
  const ns = (raw.ns_date ?? null) as Json | null;
  let nsLabel = typeof ns?.year === "number" ? String(ns.year) : "";
  if (typeof ns?.paksha_ne === "string" && ns.paksha_ne) nsLabel = `${nsLabel} (${ns.paksha_ne})`;
  const start = civilFromJdn(span.first);
  return {
    bikram_sambat: String(bsYear),
    bikram_sambat_month: BS_MONTH_NAMES[bsMonthNumber - 1],
    bikram_sambat_month_ne: BS_MONTH_NAMES_NE[bsMonthNumber - 1],
    gregorian: `${AD_MONTH_NAMES[start.month - 1]} ${start.year}`,
    gregorian_range: { start: isoFromJdn(span.first), end: isoFromJdn(span.first + span.length - 1) },
    lunar_month: lunar.name ?? null,
    lunar_month_full: lunar.full_name ?? null,
    lunar_month_is_adhik: lunar.is_adhik ?? false,
    lunar_month_type: lunar.type ?? null,
    shaka_sambat: String(start.month >= 4 ? start.year - 78 : start.year - 79),
    samvatsara: raw.samvatsara ?? null,
    nepal_sambat: nsLabel,
    nepal_sambat_detail: ns,
    location: locationBlock({ year: 0, month: 0, day: 0, ...place }),
  };
}

const empty = (v: unknown) => v === null || v === undefined || v === "";

/** `to_patro_month` over the lite month grid and the header. */
export function patroMonth(bsYear: number, bsMonthNumber: number, month: Json, header: Json): Json {
  const days = ((month.calendar ?? []) as Json[]).map((row): Json => {
    const names = (Array.isArray(row.festivals) ? row.festivals : []) as unknown[];
    return {
      bs_day: row.day,
      ad_date: row.date_ad,
      weekday: row.weekday_en,
      weekday_ne: row.weekday,
      tithi: row.tithi,
      tithi_ne: row.tithi_ne,
      nakshatra: row.nakshatra,
      sunrise: row.sunrise,
      sunset: row.sunset,
      festival: names.length > 0 && !empty(names[0]) ? names[0] : null,
      festivals: names,
    };
  });
  return {
    bs_year: bsYear,
    bs_month: month.month_name,
    bs_month_index: bsMonthNumber,
    month_info: {
      adhik_maas: month.lunar_month_is_adhik ?? false,
      lunar_month: month.lunar_month,
      lunar_month_full: month.lunar_month_full,
      days_in_month: month.month_length,
      month_start_ad: month.month_start_ad,
    },
    header: {
      shaka: empty(header.shaka_sambat) ? null : header.shaka_sambat,
      nepal_sambat: header.nepal_sambat,
      bikram_sambat: String(bsYear),
      ad_month: header.gregorian,
      lunar_month: month.lunar_month,
    },
    location: month.location,
    days,
    meta: { format: "patro_month", engine_version: "2.2.0", view: "printable_grid" },
  };
}
