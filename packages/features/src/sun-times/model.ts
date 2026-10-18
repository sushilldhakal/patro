/**
 * Sun times (suryakranti) — the parts that need no React: one cell per day
 * (sunrise, sunset, ayana badge), laid out as a year matrix (wide screens) and
 * as per-month tables (narrow screens). Both apps draw exactly these.
 */
import type { SunYearDay, SunYearMonth, SunYearResponse } from "@vedic-patro/api-client";
import { AD_MONTHS_SHORT, AD_MONTHS_SHORT_NE, BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import {
  formatAyanaMarkShort,
  formatClockNepali,
  formatTimeShort,
  isAyanaNorthMark,
} from "@vedic-patro/domain/panchanga/panchanga-format";
import { formatLocaleDigits } from "@vedic-patro/domain/locale";
import { todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { tFor, type Lang } from "@vedic-patro/i18n/runtime";

export type SunAyana = {
  /** उ/द in Nepali, N/S in English. */
  short: string;
  north: boolean;
  /** Full name of the course (Uttarayana / Dakshinayana) — tooltip / accessibility. */
  label?: string;
};

export type SunCell = {
  day: number;
  /** Day number in the reader's digits. */
  dayLabel: string;
  sunrise?: string;
  sunset?: string;
  ayana?: SunAyana;
  /** Hover text for the matrix cell (website). */
  title?: string;
};

export type SunMonth = {
  month: number;
  /** Accordion value: `month-<n>`. */
  key: string;
  label: string;
  length: number;
  /** "30 days". */
  daysLabel: string;
  rows: SunCell[];
};

/** One matrix row: the day, then one cell per month (null past the month's end). */
export type SunMatrixRow = { day: number; dayLabel: string; cells: (SunCell | null)[] };

export type SunLayout = {
  monthLabels: readonly string[];
  lengths: number[];
  maxDay: number;
  /** Accordion value of the month holding today (else the first). */
  defaultMonth: string;
};

const digitsFor = (lang: Lang, n: number) => formatLocaleDigits(n, lang);

function ayanaOf(d: SunYearDay, lang: Lang): SunAyana | undefined {
  if (!d.ayana_mark) return undefined;
  const north = isAyanaNorthMark(d.ayana_mark);
  const fallback = tFor(lang, north ? "learn.study.declination.uttarayana" : "learn.study.declination.dakshinayana");
  const label = lang === "en" ? (d.aayan ?? d.aayan_ne ?? fallback) : (d.aayan_ne ?? d.aayan);
  return { short: formatAyanaMarkShort(d.ayana_mark, lang) ?? "", north, label };
}

function clock(time: string | undefined, lang: Lang): string | undefined {
  const short = formatTimeShort(time);
  if (!short) return undefined;
  return lang === "en" ? short : formatClockNepali(short, lang);
}

export function sunCell(d: SunYearDay, lang: Lang, day = d.day): SunCell {
  return { day, dayLabel: digitsFor(lang, day), sunrise: clock(d.sunrise, lang), sunset: clock(d.sunset, lang), ayana: ayanaOf(d, lang) };
}

function parseDateAd(dateAd: string): Date {
  const [y, m, day] = dateAd.split("-").map(Number);
  return new Date(y!, m! - 1, day!);
}

/** Cells keyed `<month>-<day>`: BS months for the Vikram eras, AD months for the Gregorian ones. */
export function buildSunGrid(data: SunYearResponse | undefined, year: number, gregorian: boolean, lang: Lang): Map<string, SunCell> {
  const grid = new Map<string, SunCell>();
  for (const block of data?.months ?? []) {
    for (const d of block.calendar) {
      if (!gregorian) {
        grid.set(`${block.month_bs}-${d.day}`, sunCell(d, lang));
        continue;
      }
      if (!d.date_ad) continue;
      const ad = parseDateAd(d.date_ad);
      if (ad.getFullYear() !== year) continue;
      grid.set(`${ad.getMonth() + 1}-${ad.getDate()}`, sunCell(d, lang, ad.getDate()));
    }
  }
  return grid;
}

function defaultBsMonth(months: SunYearMonth[] | undefined, todayAd: string): string {
  for (const m of months ?? []) if (m.calendar.some((d) => d.date_ad === todayAd)) return `month-${m.month_bs}`;
  return "month-1";
}

export function buildSunLayout(data: SunYearResponse | undefined, year: number, gregorian: boolean, lang: Lang, timeZone: string): SunLayout {
  const en = lang === "en";
  if (gregorian) {
    const lengths = Array.from({ length: 12 }, () => 0);
    for (const month of data?.months ?? []) {
      for (const d of month.calendar) {
        if (!d.date_ad) continue;
        const ad = parseDateAd(d.date_ad);
        if (ad.getFullYear() !== year) continue;
        lengths[ad.getMonth()] = Math.max(lengths[ad.getMonth()]!, ad.getDate());
      }
    }
    const filled = lengths.map((len) => (len > 0 ? len : 31));
    const today = new Date();
    return {
      monthLabels: en ? AD_MONTHS_SHORT : AD_MONTHS_SHORT_NE,
      lengths: filled,
      maxDay: Math.max(...filled),
      defaultMonth: `month-${today.getFullYear() === year ? today.getMonth() + 1 : 1}`,
    };
  }
  const byMonth = new Map<number, SunYearMonth>();
  for (const m of data?.months ?? []) byMonth.set(m.month_bs, m);
  const monthLabels = Array.from({ length: 12 }, (_, idx) => {
    const m = byMonth.get(idx + 1);
    if (m) return en ? m.month_name : m.month_name_ne;
    return en ? BS_MONTH_NAMES[idx]! : BS_MONTHS_NE[idx]!;
  });
  const lengths = monthLabels.map((_, idx) => byMonth.get(idx + 1)?.month_length ?? 30);
  return {
    monthLabels,
    lengths,
    maxDay: Math.max(30, ...(data?.months ?? []).map((m) => m.month_length)),
    defaultMonth: defaultBsMonth(data?.months, todayAdStringInTimezone(new Date(), timeZone)),
  };
}

/** Matrix hover text: "Baisakh 3: N · ↑ 05:40 ↓ 18:30". */
function cellTitle(monthLabel: string, cell: SunCell): string | undefined {
  if (!cell.sunrise || !cell.sunset) return undefined;
  const ayana = cell.ayana ? `${cell.ayana.label ?? cell.ayana.short} · ` : "";
  return `${monthLabel} ${cell.day}: ${ayana}↑ ${cell.sunrise} ↓ ${cell.sunset}`;
}

export function buildSunMatrix(layout: SunLayout, grid: Map<string, SunCell>, lang: Lang): SunMatrixRow[] {
  return Array.from({ length: layout.maxDay }, (_, rowIdx) => {
    const day = rowIdx + 1;
    return {
      day,
      dayLabel: digitsFor(lang, day),
      cells: layout.lengths.map((len, colIdx) => {
        if (day > len) return null;
        const cell = grid.get(`${colIdx + 1}-${day}`) ?? { day, dayLabel: digitsFor(lang, day) };
        return { ...cell, title: cellTitle(layout.monthLabels[colIdx]!, cell) };
      }),
    };
  });
}

export function buildSunMonths(layout: SunLayout, grid: Map<string, SunCell>, lang: Lang, daysLabel: (n: number) => string): SunMonth[] {
  return layout.monthLabels.map((label, idx) => {
    const month = idx + 1;
    const length = layout.lengths[idx]!;
    return {
      month,
      key: `month-${month}`,
      label,
      length,
      daysLabel: daysLabel(length),
      rows: Array.from({ length }, (_, i) => grid.get(`${month}-${i + 1}`) ?? { day: i + 1, dayLabel: digitsFor(lang, i + 1) }),
    };
  });
}
