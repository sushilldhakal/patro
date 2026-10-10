import type { BsNativeSelectOption } from "@/components/BsNativeSelect";
import type { Era } from "@/lib/era";
import { formatBrowsePatroYearPicker } from "@/lib/patro-year-axis";
import {
  parsePatroYearSearchQuery,
  signedTargetsForYearSearch,
} from "@/lib/patro-year-search-query";

type YearItem = BsNativeSelectOption;

/** Year dropdown window: 50 years back and 50 forward around the browsed year. */
export const PICKER_YEAR_RADIUS = 50;

/** Native `<select>` keeps the wider window — scrolling a long list is cheap there. */
const NATIVE_SELECT_YEAR_RADIUS = 100;

function labelYear(
  y: number,
  digits: (n: number | string) => string,
): YearItem {
  return { value: y, label: formatBrowsePatroYearPicker(y, digits) };
}

/** Index of `year` in a sorted ascending list, or the nearest one when absent. */
function nearestYearIndex(years: readonly number[], year: number): number {
  let lo = 0;
  let hi = years.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = years[mid]!;
    if (v === year) return mid;
    if (v < year) lo = mid + 1;
    else hi = mid - 1;
  }
  // `lo` is the first entry greater than `year`; clamp into range.
  return Math.min(Math.max(lo, 0), years.length - 1);
}

/**
 * Window around `currentYear` in a sorted ascending browse-year list.
 *
 * The window always straddles the browsed year (clamped to the ends of the
 * list) so the dropdown shows years either side of what is selected rather
 * than an unrelated stretch of the axis.
 */
export function sliceBrowseYearRange(
  years: readonly number[],
  currentYear: number,
  radius = PICKER_YEAR_RADIUS,
): number[] {
  if (years.length === 0) return [];
  const idx = nearestYearIndex(years, currentYear);
  const start = Math.max(0, idx - radius);
  const end = Math.min(years.length, start + radius * 2 + 1);
  return years.slice(Math.max(0, end - (radius * 2 + 1)), end);
}

/** Native `<select>` options — ~201 years around the browsed year (not the full ephemeris list). */
export function windowedBrowseYearSelectOptions(
  years: readonly number[],
  currentYear: number,
  era: Era,
  digits: (n: number | string) => string,
): YearItem[] {
  return lazyBrowseYearListItems(
    years,
    "",
    currentYear,
    era,
    digits,
    NATIVE_SELECT_YEAR_RADIUS,
  );
}

/** Combobox rows — format labels only for the visible slice, not the full ephemeris list. */
export function lazyBrowseYearListItems(
  years: readonly number[],
  query: string,
  currentYear: number,
  era: Era,
  digits: (n: number | string) => string,
  radius = PICKER_YEAR_RADIUS,
): YearItem[] {
  const q = query.trim();
  if (!q) {
    return sliceBrowseYearRange(years, currentYear, radius).map((y) =>
      labelYear(y, digits),
    );
  }

  const { n, era: parsedEra } = parsePatroYearSearchQuery(q);
  if (n != null) {
    const set = new Set(years);
    const out: YearItem[] = [];
    for (const target of signedTargetsForYearSearch(n, parsedEra ?? era)) {
      if (target === 0) continue;
      if (set.has(target)) out.push(labelYear(target, digits));
    }
    if (out.length === 0 && set.has(n)) out.push(labelYear(n, digits));
    return out;
  }

  const needle = q.toLowerCase();
  const windowYears = sliceBrowseYearRange(years, currentYear, 500);
  return windowYears
    .filter((y) => {
      const row = labelYear(y, digits);
      return row.label.toLowerCase().includes(needle) || String(y).includes(q);
    })
    .map((y) => labelYear(y, digits))
    .slice(0, 20);
}

/** Bounds for a sorted ascending browse-year list (avoid spreading huge arrays). */
export function browseYearRangeBounds(years: readonly number[]): {
  min: number;
  max: number;
} {
  if (years.length === 0) return { min: 1, max: 1 };
  return { min: years[0]!, max: years[years.length - 1]! };
}
