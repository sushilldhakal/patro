import type { CalendarDay, Festival } from "./api";
import {
  adToBS,
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  bsToAD,
  getBSMonthLength,
  shiftBsMonth,
} from "@vedic-patro/domain/bs-calendar";
import {
  AD_MONTHS_SHORT,
  AD_MONTHS_SHORT_NE,
  BS_MONTHS_SHORT,
} from "./patro-month-labels";
import { civilIsoDayOfMonth, parseCivilIso, parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";

const WEEKDAYS_NE = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"] as const;
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatAdIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildLocalMonthDays(year: number, month: number): CalendarDay[] {
  const monthLength = getBSMonthLength(year, month);
  const days: CalendarDay[] = [];
  for (let day = 1; day <= monthLength; day += 1) {
    const adDate = bsToAD(year, month, day);
    const weekdayIdx = adDate.getDay();
    days.push({
      day,
      date_ad: formatAdIso(adDate),
      weekday: WEEKDAYS_NE[weekdayIdx],
      weekday_en: WEEKDAYS_EN[weekdayIdx],
      weekday_ne: WEEKDAYS_NE[weekdayIdx],
      tithi: "",
      festivals: [],
    });
  }
  return days;
}

export function mergeEnrichedDays(local: CalendarDay[], enriched: CalendarDay[]): CalendarDay[] {
  const byAd = new Map(enriched.map((d) => [d.date_ad, d]));
  return local.map((localDay) => {
    const remote = byAd.get(localDay.date_ad);
    if (!remote) return localDay;
    return {
      ...localDay,
      ...remote,
      day: localDay.day,
      outsideMonth: localDay.outsideMonth,
    };
  });
}

export function buildLocalAdMonthDays(adYear: number, adMonth: number): CalendarDay[] {
  const daysInMonth = new Date(adYear, adMonth, 0).getDate();
  const days: CalendarDay[] = [];

  for (let adDay = 1; adDay <= daysInMonth; adDay += 1) {
    const adDate = new Date(adYear, adMonth - 1, adDay);
    const bs = adToBS(adDate);
    const weekdayIdx = adDate.getDay();
    days.push({
      day: bs.day,
      date_ad: formatAdIso(adDate),
      weekday: WEEKDAYS_NE[weekdayIdx],
      weekday_en: WEEKDAYS_EN[weekdayIdx],
      weekday_ne: WEEKDAYS_NE[weekdayIdx],
      tithi: "",
      festivals: [],
    });
  }

  return days;
}

export function shiftAdMonth(
  adYear: number,
  adMonth: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(adYear, adMonth - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function getBsMonthsOverlappingAdMonth(
  adYear: number,
  adMonth: number,
): Array<{ year: number; month: number }> {
  const start = new Date(adYear, adMonth - 1, 1);
  const end = new Date(adYear, adMonth, 0);
  const bsStart = adToBS(start);
  const bsEnd = adToBS(end);
  const result: Array<{ year: number; month: number }> = [];
  const seen = new Set<string>();

  let y = bsStart.year;
  let m = bsStart.month;
  while (true) {
    const key = `${y}-${m}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ year: y, month: m });
    }
    if (y === bsEnd.year && m === bsEnd.month) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  return result;
}

export function buildAdCalendarGridDays(
  adYear: number,
  adMonth: number,
  enriched?: {
    prev?: CalendarDay[];
    current?: CalendarDay[];
    next?: CalendarDay[];
  },
): CalendarDay[] {
  const currentLocal = buildLocalAdMonthDays(adYear, adMonth);
  const byAdCurrent = new Map(enriched?.current?.map((d) => [d.date_ad, d]) ?? []);
  const current: CalendarDay[] = currentLocal.map((d) => ({
    ...d,
    ...byAdCurrent.get(d.date_ad),
    outsideMonth: false,
  }));

  const first = current[0];
  if (!first) return current;

  const startOffset = parseCivilIsoToDate(first.date_ad).getDay();
  const prevAd = shiftAdMonth(adYear, adMonth, -1);
  const nextAd = shiftAdMonth(adYear, adMonth, 1);

  const prevLocal = buildLocalAdMonthDays(prevAd.year, prevAd.month);
  const leading: CalendarDay[] =
    startOffset > 0
      ? prevLocal.slice(-startOffset).map((d) => ({ ...d, outsideMonth: true as const }))
      : [];

  const totalCells = Math.ceil((startOffset + current.length) / 7) * 7;
  const trailingCount = totalCells - startOffset - current.length;
  const nextLocal = buildLocalAdMonthDays(nextAd.year, nextAd.month);
  const trailing: CalendarDay[] = nextLocal.slice(0, trailingCount).map((d) => ({
    ...d,
    outsideMonth: true as const,
  }));

  let grid: CalendarDay[] = [...leading, ...current, ...trailing];

  if (enriched?.prev?.length) grid = mergeEnrichedDays(grid, enriched.prev);
  if (enriched?.current?.length) grid = mergeEnrichedDays(grid, enriched.current);
  if (enriched?.next?.length) grid = mergeEnrichedDays(grid, enriched.next);

  return grid;
}

/** Full month grid with lead/trail days — merges prev/current/next API payloads like web. */
export function buildCalendarGridDays(
  year: number,
  month: number,
  enriched?: {
    prev?: CalendarDay[];
    current?: CalendarDay[];
    next?: CalendarDay[];
  },
): CalendarDay[] {
  const currentLocal = buildLocalMonthDays(year, month);
  const byAdCurrent = new Map(enriched?.current?.map((d) => [d.date_ad, d]) ?? []);
  const current: CalendarDay[] = currentLocal.map((d) => ({
    ...d,
    ...byAdCurrent.get(d.date_ad),
    outsideMonth: false,
  }));

  const first = current[0];
  if (!first) return current;

  const startOffset = bsToAD(year, month, 1).getDay();
  const prevBs = shiftBsMonth(year, month, -1);
  const nextBs = shiftBsMonth(year, month, 1);

  const prevLocal = buildLocalMonthDays(prevBs.year, prevBs.month);
  const leading: CalendarDay[] =
    startOffset > 0
      ? prevLocal.slice(-startOffset).map((d) => ({ ...d, outsideMonth: true as const }))
      : [];

  const totalCells = Math.ceil((startOffset + current.length) / 7) * 7;
  const trailingCount = totalCells - startOffset - current.length;
  const nextLocal = buildLocalMonthDays(nextBs.year, nextBs.month);
  const trailing: CalendarDay[] = nextLocal.slice(0, trailingCount).map((d) => ({
    ...d,
    outsideMonth: true as const,
  }));

  let grid: CalendarDay[] = [...leading, ...current, ...trailing];

  if (enriched?.prev?.length) grid = mergeEnrichedDays(grid, enriched.prev);
  if (enriched?.current?.length) grid = mergeEnrichedDays(grid, enriched.current);
  if (enriched?.next?.length) grid = mergeEnrichedDays(grid, enriched.next);

  return grid;
}

export type SecondaryCellDate = {
  day: number;
  monthLabel?: string;
  monthLabelShort?: string;
};

export function getSecondaryCellDate(
  day: CalendarDay,
  primaryDate: "bs" | "ad",
  lang = "ne",
  isFirstCell = false,
): SecondaryCellDate {
  const ad = parseCivilIsoToDate(day.date_ad);
  const isEn = lang.slice(0, 2) === "en";

  /* Day number only: the month is already in the grid header, so a month name
     on the first cell or on a 1st just repeats it. */
  if (primaryDate === "ad") return { day: adToBS(ad).day };
  return { day: civilIsoDayOfMonth(day.date_ad) };
}

const FESTIVAL_SUBSUMED_BY: Record<string, string> = {
  "dilla-punhi": "guru-purnima",
  "vasant-panchami-vrata": "saraswati-puja",
  "putrada-ekadashi-vaishnava": "putrada-ekadashi-smarta",
};

const FESTIVAL_ALIAS_IDS = new Set([
  "guru-purnima-vrata",
  "navaratri-arambha",
  "amako-mukh-herne-din",
  "sattila-ekadashi",
  "nari-diwas",
]);

function isGenericPurnimaVrataId(id: string): boolean {
  return id.startsWith("purnima-vrata-");
}

function isNamedPurnimaFestivalEntry(h: { id: string; name_en?: string; name_ne?: string }): boolean {
  if (isGenericPurnimaVrataId(h.id) || h.id.endsWith("-vrata")) return false;
  const nameEn = (h.name_en ?? "").toLowerCase();
  const nameNe = h.name_ne ?? "";
  return /purnima/.test(nameEn) || /पूर्णिमा|पुन्ही/.test(nameNe);
}

export function filterRedundantDayFestivals<T extends { id: string; name_en?: string; name_ne?: string }>(
  festivals: T[],
): T[] {
  const rows = festivals.filter((f) => !FESTIVAL_ALIAS_IDS.has(f.id));
  if (rows.length <= 1) return rows;

  const presentIds = new Set(rows.map((f) => f.id));
  const hasNamedPurnima = rows.some(isNamedPurnimaFestivalEntry);

  return rows.filter((festival) => {
    const subsumedBy = FESTIVAL_SUBSUMED_BY[festival.id];
    if (subsumedBy && presentIds.has(subsumedBy)) return false;

    if (festival.id.endsWith("-vrata")) {
      const baseId = festival.id.slice(0, -"-vrata".length);
      if (presentIds.has(baseId)) return false;
    }

    if (hasNamedPurnima && isGenericPurnimaVrataId(festival.id)) return false;
    return true;
  });
}

/** Attach festival names from the yearly festivals API onto calendar days. */
export function applyHolidaysToDays(
  days: CalendarDay[],
  holidays: Festival[],
  lang?: string,
): CalendarDay[] {
  const isEn = (lang ?? "ne").slice(0, 2) === "en";
  const namesByDate = new Map<string, string[]>();
  const aliasesByDate = new Map<string, Set<string>>();

  const byDate = new Map<string, Festival[]>();
  for (const h of holidays) {
    if (!h.start_date) continue;
    const list = byDate.get(h.start_date) ?? [];
    list.push(h);
    byDate.set(h.start_date, list);
  }

  for (const [startDate, list] of byDate) {
    const filtered = filterRedundantDayFestivals(list);
    for (const h of filtered) {
      const name = isEn
        ? (h.name_en ?? h.name_ne ?? h.name ?? h.id)
        : (h.name_ne ?? h.name_en ?? h.name ?? h.id);
      const existing = namesByDate.get(startDate) ?? [];
      const aliases = aliasesByDate.get(startDate) ?? new Set<string>();
      for (const alias of [h.name_ne, h.name_en, h.name, h.id, name]) {
        if (alias) aliases.add(alias.toLowerCase());
      }
      aliasesByDate.set(startDate, aliases);

      const duplicate = existing.some((entry) => aliases.has(entry.toLowerCase()) || entry === name);
      if (!duplicate) existing.push(name);
      namesByDate.set(startDate, existing);
    }
  }

  return days.map((day) => {
    const extra = namesByDate.get(day.date_ad);
    if (!extra?.length) return day;
    const aliases = aliasesByDate.get(day.date_ad) ?? new Set<string>();
    const fromDay = (day.festivals ?? []).filter((f) => !aliases.has(f.toLowerCase()));
    return { ...day, festivals: [...extra, ...fromDay] };
  });
}
