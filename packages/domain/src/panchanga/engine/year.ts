// The BS year views (`patro::year`): the sunrise/sunset/ayana grid of every day (`build_year_sun_times`).
import { bsMonth, civilFromJdn, isoFromJdn } from "../../astronomy/lunar-month";
import type { Sky } from "../../astronomy/sky";
import { aayan, sunTimes, timeBlock, type Json } from "./blocks";
import { locationBlock, type DayInput } from "./day";
import { dayState } from "./day-response";
import { eraLanguage, renderForEra } from "./era-render";
import { BS_MONTH_NAMES, BS_MONTH_NAMES_NE } from "./tables.generated";

/** `ayana_mark`: the Uttarayana / Dakshinayana letter of an ayana block. */
export function ayanaMark(block: Json): string {
  const mark = block.kranti_mark;
  if (mark === "उ" || mark === "द") return mark;
  if (block.name === "Uttarayana") return "उ";
  return typeof block.name_ne === "string" && block.name_ne.includes("उत्तर") ? "उ" : "द";
}

/** `build_year_sun_times`: sunrise, sunset and ayana for every day of a BS year; null when this device cannot answer. */
export function yearSunTimes(sky: Sky, bsYear: number, place: Omit<DayInput, "year" | "month" | "day">, era?: { era: string; language?: string }): Json | null {
  // Before 1970 the zone clocks run on local mean time to the second: the server answers those days.
  const first = bsMonth(bsYear, 1);
  if (!first || civilFromJdn(first.first).year < 1970) return null;
  const months: Json[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const span = bsMonth(bsYear, m);
    if (!span) return null;
    const days: Json[] = [];
    for (let offset = 0; offset < span.length; offset += 1) {
      const jdn = span.first + offset;
      const times = sunTimes(sky, jdn, place);
      if (!times) return null;
      const ayana = aayan(sky, times.sunrise);
      days.push({
        day: offset + 1,
        date_ad: isoFromJdn(jdn),
        sunrise: timeBlock(times.sunrise, place.timeZone, "nearest").local_time_short,
        sunset: timeBlock(times.sunset, place.timeZone, "nearest").local_time_short,
        aayan: ayana.name ?? null,
        aayan_ne: ayana.name_ne ?? null,
        ayana_mark: ayanaMark(ayana),
      });
    }
    months.push({ month_bs: m, month_name: BS_MONTH_NAMES[m - 1], month_name_ne: BS_MONTH_NAMES_NE[m - 1], month_start_ad: isoFromJdn(span.first), month_length: span.length, calendar: days });
  }
  const out: Json = { year_bs: bsYear, location: locationBlock({ year: 0, month: 0, day: 0, ...place }), months };
  return era ? renderForEra(out, era.era, era.language ?? eraLanguage(era.era)) : out;
}

// ---------------------------------------------------------------- the year wheel

/** `browse_limits`. */
const LIMITS = {
  signed_year_min: -3_891_138, signed_year_max: 17053, ephemeris_signed_min: -3_891_137, ephemeris_signed_max: 17052,
  ad_year_min: 1, ad_year_max: 16995, bc_year_min: 1, bc_year_max: 3_891_194, bbs_url_year_max: 3_891_137, festival_stack_min_year: 60,
};

/** `_WHEEL_DAY_DROP_KEYS` and the rashifal: what the year wheel does not read of a day. */
const WHEEL_DROP = new Set(["lagna_spans", "muhurta", "hora", "hora_day", "nivas_shool", "udaya_lagna", "tarabala_table", "chandrabala_table", "choghadiya", "solar_corrections", "lunar_calendar", "planets_anchor", "rashifal"]);

/**
 * `build_year_calendar(..., shape=wheel)`: every day of a BS year once in `calendar`, each trimmed to what the year
 * wheel reads, and the twelve month headers in `months`. Null when this device cannot answer (a day before 1970).
 */
export function yearWheel(sky: Sky, bsYear: number, place: Omit<DayInput, "year" | "month" | "day">, era?: { era: string; language?: string }): Json | null {
  const months: Json[] = [];
  const days: Json[] = [];
  let yearLength = 0;
  const location = locationBlock({ year: 0, month: 0, day: 0, ...place });
  for (let m = 1; m <= 12; m += 1) {
    const span = bsMonth(bsYear, m);
    if (!span) return null;
    const mid = Math.min(span.length, 15);
    let lunar: Json = {};
    for (let offset = 0; offset < span.length; offset += 1) {
      const jdn = span.first + offset;
      const c = civilFromJdn(jdn);
      const state = dayState(sky, { ...place, year: c.year, month: c.month, day: c.day }, { era: "ad", detail: false, plainFestivals: true, surya: sky });
      if (!state) return null;
      const sun = state.sun as Json;
      const panchanga: Json = {};
      for (const [k, v] of Object.entries(state)) if (!WHEEL_DROP.has(k)) panchanga[k] = v;
      // The embed keeps the day's lunar block even though the wheel drops the calendar one.
      if (offset + 1 === mid) lunar = (state.lunar_month ?? {}) as Json;
      days.push({ day: offset + 1, date_ad: isoFromJdn(jdn), sunrise: sun.sunrise ?? null, sunset: sun.sunset ?? null, panchanga });
    }
    yearLength += span.length;
    months.push({
      year_bs: bsYear,
      month_bs: m,
      month_name: BS_MONTH_NAMES[m - 1],
      month_name_ne: BS_MONTH_NAMES_NE[m - 1],
      month_start_ad: isoFromJdn(span.first),
      month_length: span.length,
      lunar_month: lunar.name ?? null,
      lunar_month_full: lunar.full_name ?? null,
      lunar_month_is_adhik: lunar.is_adhik ?? false,
      lunar_month_type: lunar.type ?? null,
      location,
      grid_mode: "full_panchanga",
      first_weekday: span.first % 7,
      limits: LIMITS,
    });
  }
  const out: Json = { year_bs: bsYear, year_length: yearLength, location, months, calendar: days };
  return era ? renderForEra(out, era.era, era.language ?? eraLanguage(era.era)) : out;
}
