/**
 * Holidays page — the parts that need no React: the columns, turning API
 * records into table rows, search and sort. Both apps draw exactly these rows.
 */
import type { Festival, Holiday } from "@vedic-patro/api-client";
import { bilingualText, formatLocaleDigits, type Lang } from "@vedic-patro/domain/locale";
import { formatHolidayBsDisplay } from "@vedic-patro/domain/panchanga/panchanga-format";

export type HolidaysTab = "holidays" | "festivals";

export type HolidayColumnKey = "name" | "bsDate" | "adDate" | "days" | "type" | "isPublic";

/** How a cell is drawn; each app maps this to its own markup and the shared class map. */
export type HolidayCellKind = "name" | "date" | "text" | "badge" | "flag";

export type HolidayColumn = {
  key: HolidayColumnKey;
  /** Catalogue key of the header. */
  labelKey: string;
  kind: HolidayCellKind;
  /** Column width on narrow screens (the app's table scrolls sideways past it). */
  width: number;
};

export type HolidayRow = {
  key: string;
  name: string;
  bsDate: string;
  adDate: string;
  days: string;
  type: string;
  isPublic: boolean;
  /** Raw values the sort compares (dates as ISO, days as numbers). */
  sortValues: Record<HolidayColumnKey, string | number>;
};

export type HolidaySort = { key: HolidayColumnKey; dir: "asc" | "desc" } | null;

const NAME: HolidayColumn = { key: "name", labelKey: "holidays.col_name", kind: "name", width: 200 };
const BS_DATE: HolidayColumn = { key: "bsDate", labelKey: "holidays.col_bs_date", kind: "date", width: 160 };
const AD_DATE: HolidayColumn = { key: "adDate", labelKey: "holidays.col_ad_date", kind: "date", width: 124 };
const DAYS: HolidayColumn = { key: "days", labelKey: "holidays.col_days", kind: "text", width: 80 };
const TYPE: HolidayColumn = { key: "type", labelKey: "holidays.col_type", kind: "badge", width: 124 };
const GOVT: HolidayColumn = { key: "isPublic", labelKey: "holidays.col_govt", kind: "flag", width: 124 };

export const HOLIDAY_COLUMNS: Record<HolidaysTab, readonly HolidayColumn[]> = {
  holidays: [NAME, BS_DATE, AD_DATE, DAYS, TYPE],
  festivals: [NAME, BS_DATE, AD_DATE, TYPE, GOVT],
};

export function toHolidayRow(item: Holiday | Festival, lang: Lang, index: number): HolidayRow {
  const start = item.start_date ?? "";
  const name = bilingualText(lang, item.name_ne ?? item.name_en, item.name_en ?? item.name_ne);
  const bsDate = start ? formatHolidayBsDisplay({ bs_start_date: item.bs_start_date, start_date: start }, lang) || "—" : "—";
  const days = item.duration_days ?? 1;
  const type = item.type ?? "—";
  const isPublic = Boolean(item.is_public_holiday);
  return {
    key: `${item.id ?? name}-${start}-${index}`,
    name,
    bsDate,
    adDate: start || "—",
    days: formatLocaleDigits(days, lang),
    type,
    isPublic,
    sortValues: { name, bsDate: start, adDate: start, days, type, isPublic: isPublic ? 1 : 0 },
  };
}

/** Rows whose visible text contains the search (case-insensitive); empty search keeps all. */
export function filterHolidayRows(rows: readonly HolidayRow[], query: string): HolidayRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((r) => [r.name, r.bsDate, r.adDate, r.days, r.type].join(" ").toLowerCase().includes(q));
}

/** API order until a column is chosen, as on the website. */
export function sortHolidayRows(rows: readonly HolidayRow[], sort: HolidaySort): HolidayRow[] {
  if (!sort) return [...rows];
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a.sortValues[sort.key];
    const y = b.sortValues[sort.key];
    const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return order * dir;
  });
}

/** Header click: ascending, then descending, then back to API order. */
export function nextHolidaySort(current: HolidaySort, key: HolidayColumnKey): HolidaySort {
  if (!current || current.key !== key) return { key, dir: "asc" };
  return current.dir === "asc" ? { key, dir: "desc" } : null;
}
