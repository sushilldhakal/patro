// The sait listings made on the device (`patro::sait`): the days of a BS year a ceremony can be held, and the
// month overview of every category. A day counts when the ceremony's muhurta rules leave a window in it
// (`has_muhurta`); rudri jurne and agni jurne are judged from the day's tithi and weekday alone.
import { bsDateOf, bsMonth, civilFromJdn } from "../astronomy/lunar-month";
import type { Sky } from "../astronomy/sky";
import { dayTimes, karanaAt, karanaName, tithiInfo, varaAt, yogaAt, type Place } from "../panchanga/engine/blocks";
import type { Json } from "../panchanga/engine/blocks";
import { CEREMONY_RULES } from "./ceremony-rules.generated";
import { windowsFor, type Rule } from "./ceremony-windows";
import { SAIT_CATEGORIES } from "./sait-categories.generated";

const BS_MONTHS_NE = ["वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"];
const ANNAPRASAN_NOTE = "अन्नप्रासन requires the child's birth date to pick the 5–8 month window; year-wide listings show nakshatra-suitable days only.";
const SAIT_GENERATE_MIN_YEAR = 60;
const SAIT_GENERATE_MAX_YEAR = 3000;
/** The years the apps list (`SAIT_LIST_MIN_YEAR` to `SAIT_LIST_MAX_YEAR`). */
export const saitYears = (): Json => ({ years: Array.from({ length: 2200 - 1700 + 1 }, (_, i) => 1700 + i) });

const agniOnEarth = (tithiAbsolute: number, vaara: number) => [0, 3].includes((tithiAbsolute + vaara + 1) % 4);
const rudraOnEarth = (tithiAbsolute: number) => tithiAbsolute !== 30 && [1, 2, 3].includes((2 * tithiAbsolute + 5) % 7);

/** `check_rudri_jurne` and `check_agni_jurne` for the civil day `jdn`. */
function jurne(sky: Sky, jdn: number, place: Place, category: "rudri-jurne" | "agni-jurne"): boolean {
  const times = dayTimes(sky, jdn, place);
  if (!times) return false;
  const t = tithiInfo(sky, times.sunrise);
  const vaara = varaAt(times.sunrise, place.timeZone) + 1;
  if (category === "agni-jurne") return agniOnEarth(t.number, vaara);
  const yoga = yogaAt(sky, times.sunrise).number;
  return rudraOnEarth(t.number) && agniOnEarth(t.number, vaara) && yoga !== 17 && yoga !== 27 && karanaName(karanaAt(sky, times.sunrise).number).name !== "Vishti";
}

/** Whether `category` can be held on the civil day: its muhurta rule leaves a window, or the jurne rules say so. */
function matches(sky: Sky, category: string, jdn: number, place: Place, rule?: Rule): boolean {
  const base = rule ?? (CEREMONY_RULES as unknown as Record<string, unknown>)[category];
  if (base) {
    try {
      return windowsFor(sky, base as Rule, jdn, place).length > 0;
    } catch {
      return false;
    }
  }
  if (category === "rudri-jurne" || category === "agni-jurne") return jurne(sky, jdn, place, category);
  return false;
}

/** `scan_year`: the days (BS day numbers) of each BS month that match. */
function scanYear(sky: Sky, bsYear: number, category: string, place: Place, rule?: Rule): Record<string, number[]> | null {
  const byMonth: Record<string, number[]> = {};
  for (let month = 1; month <= 12; month += 1) {
    const range = bsMonth(bsYear, month);
    if (!range) return null;
    const days: number[] = [];
    for (let d = 1; d <= range.length; d += 1) if (matches(sky, category, range.first + d - 1, place, rule)) days.push(d);
    if (days.length) byMonth[String(month)] = days;
  }
  return byMonth;
}

const categoryMeta = (id: string) => SAIT_CATEGORIES.find((c) => c.id === id);

/** `GET /nepal/sait/{bs_year}/{category}`: null when this device cannot answer (the server does). */
export function saitMonthEntries(sky: Sky, bsYear: number, category: string, place: Place): Json | null {
  const meta = categoryMeta(category);
  if (!meta || bsYear < SAIT_GENERATE_MIN_YEAR || bsYear > SAIT_GENERATE_MAX_YEAR) return null;
  const rule = (CEREMONY_RULES as unknown as Record<string, Rule | undefined>)[category];
  let months = scanYear(sky, bsYear, category, place, rule);
  if (!months) return null;
  // A ceremony with a fallback nakshatra list widens to it when the year is thin.
  const fallback = rule as unknown as { fallbackNakshatras?: number[]; fallbackMinDays?: number } | undefined;
  if (rule && fallback?.fallbackNakshatras?.length && Object.values(months).reduce((a, d) => a + d.length, 0) < (fallback.fallbackMinDays ?? 0)) {
    months = scanYear(sky, bsYear, category, place, { ...rule, nakshatras: fallback.fallbackNakshatras } as Rule);
    if (!months) return null;
  }
  const out: Json = {
    bs_year: bsYear,
    category,
    category_label_ne: meta.label_ne,
    months: Object.entries(months)
      .map(([key, days]) => ({ month: Number(key), month_name_ne: BS_MONTHS_NE[Number(key) - 1], days: [...days].sort((a, b) => a - b) }))
      .sort((a, b) => a.month - b.month),
    source: "computed",
  };
  if (category === "annaprasan") out.note = ANNAPRASAN_NOTE;
  return out;
}

/** `GET /nepal/sait/{bs_year}/month/{bs_month}`: every category's days in one month. */
export function saitMonthAll(sky: Sky, bsYear: number, bsMonthNumber: number, place: Place): Json | null {
  if (bsMonthNumber < 1 || bsMonthNumber > 12) return null;
  const range = bsMonth(bsYear, bsMonthNumber);
  if (!range) return null;
  const categories: Json = {};
  if (civilFromJdn(range.first).year < 1582 || bsDateOf(range.first) === null) {
    for (const c of SAIT_CATEGORIES) categories[c.id] = [];
    return { bs_year: bsYear, bs_month: bsMonthNumber, month_name_ne: BS_MONTHS_NE[bsMonthNumber - 1], categories, unavailable_reason: "pre_ce" };
  }
  for (const c of SAIT_CATEGORIES) {
    const days: number[] = [];
    for (let d = 1; d <= range.length; d += 1) if (matches(sky, c.id, range.first + d - 1, place, (CEREMONY_RULES as unknown as Record<string, Rule | undefined>)[c.id])) days.push(d);
    categories[c.id] = days;
  }
  return { bs_year: bsYear, bs_month: bsMonthNumber, month_name_ne: BS_MONTHS_NE[bsMonthNumber - 1], categories };
}
