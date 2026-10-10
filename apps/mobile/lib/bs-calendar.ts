import calendarData from "./bs-calendar-data.json";

export const BS_MONTH_NAMES = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
] as const;

export const BS_MONTHS_NE = [
  "वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
  "कात्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत",
];

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_SHORT_NE = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"] as const;

export type BikramSambatDate = {
  year: number;
  month: number;
  day: number;
  monthName: string;
};

type BsMonthLengths = readonly [number, number, number, number, number, number, number, number, number, number, number, number];

export const BS_SUPPORTED_START_YEAR = calendarData.start_year;
export const BS_SUPPORTED_END_YEAR = calendarData.end_year;

function asMonthLengths(lengths: number[]): BsMonthLengths {
  if (lengths.length !== 12) throw new Error(`BS month length row must have 12 entries, got ${lengths.length}`);
  return lengths as unknown as BsMonthLengths;
}

const BS_YEAR_MONTH_LENGTHS: Record<number, BsMonthLengths> = Object.fromEntries(
  Object.entries(calendarData.month_lengths).map(([year, lengths]) => [Number(year), asMonthLengths(lengths)]),
);

const BAISAKH_1_AD: Record<number, string> = Object.fromEntries(
  Object.entries(calendarData.baisakh_1_ad).map(([year, iso]) => [Number(year), iso]),
);

type BsMonthStart = { year: number; month: number; adMs: number };

function parseAdDateOnly(isoDate: string): number {
  const parts = isoDate.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return Date.UTC(y, m - 1, d);
}

function localDateFromUtcMs(ms: number): Date {
  const date = new Date(ms);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function buildMonthStarts(): BsMonthStart[] {
  const starts: BsMonthStart[] = [];
  for (let year = BS_SUPPORTED_START_YEAR; year <= BS_SUPPORTED_END_YEAR; year += 1) {
    const baisakh1 = BAISAKH_1_AD[year];
    if (!baisakh1) continue;
    let cursor = parseAdDateOnly(baisakh1);
    for (let month = 1; month <= 12; month += 1) {
      starts.push({ year, month, adMs: cursor });
      const days = BS_YEAR_MONTH_LENGTHS[year]?.[month - 1] ?? 30;
      cursor += days * 86_400_000;
    }
  }
  return starts;
}

const BS_MONTH_STARTS = buildMonthStarts();

function normalizeToUtcDate(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function monthStartFor(year: number, month: number): BsMonthStart | undefined {
  return BS_MONTH_STARTS.find((s) => s.year === year && s.month === month);
}

export function getBSMonthLength(year: number, month: number): number {
  const monthLength = BS_YEAR_MONTH_LENGTHS[year]?.[month - 1];
  if (monthLength) return monthLength;
  const current = monthStartFor(year, month);
  if (!current) return 30;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const next =
    monthStartFor(nextYear, nextMonth) ??
    (nextMonth === 1 && BAISAKH_1_AD[nextYear]
      ? { year: nextYear, month: nextMonth, adMs: parseAdDateOnly(BAISAKH_1_AD[nextYear]) }
      : undefined);
  if (!next) return 30;
  return Math.round((next.adMs - current.adMs) / 86_400_000);
}

export function bsToAD(year: number, month: number, day: number): Date {
  const monthStart = monthStartFor(year, month) ?? BS_MONTH_STARTS[0];
  if (!monthStart) return new Date(year, month - 1, day);
  const monthLength = getBSMonthLength(year, month);
  const safeDay = Math.min(Math.max(1, day), monthLength);
  return localDateFromUtcMs(monthStart.adMs + (safeDay - 1) * 86_400_000);
}

export function adToBS(date: Date): BikramSambatDate {
  const adMs = normalizeToUtcDate(date);
  const fallback = BS_MONTH_STARTS[0];
  if (!fallback) return { year: BS_SUPPORTED_START_YEAR, month: 1, day: 1, monthName: BS_MONTH_NAMES[0] };
  let match = fallback;
  for (const start of BS_MONTH_STARTS) {
    if (start.adMs <= adMs) match = start;
    else break;
  }
  const day = Math.max(1, Math.floor((adMs - match.adMs) / 86_400_000) + 1);
  const monthName = BS_MONTH_NAMES[match.month - 1] ?? BS_MONTH_NAMES[0];
  return { year: match.year, month: match.month, day, monthName };
}

export function getCurrentBs(): { year: number; month: number } {
  const bs = adToBS(new Date());
  return { year: bs.year, month: bs.month };
}

export function bsMonthLabel(month: number, lang: "ne" | "en" = "ne"): string {
  return lang === "en" ? BS_MONTH_NAMES[month - 1] : BS_MONTHS_NE[month - 1];
}

export function shiftBsMonth(year: number, month: number, delta: number): { year: number; month: number } {
  let m = month + delta;
  let y = year;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { year: y, month: m };
}

export function todayAdString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Devanagari digits for Nepali UI. */
export function toNepaliDigits(value: string | number): string {
  const map: Record<string, string> = {
    "0": "०", "1": "१", "2": "२", "3": "३", "4": "४",
    "5": "५", "6": "६", "7": "७", "8": "८", "9": "९",
  };
  return String(value).replace(/[0-9]/g, (d) => map[d] ?? d);
}

export function formatDigits(value: string | number, lang: "ne" | "en"): string {
  return lang === "ne" ? toNepaliDigits(value) : String(value);
}

export function formatBsDateLong(
  date: Date,
  lang?: string,
  digits?: (v: string | number) => string,
): string {
  const bs = adToBS(date);
  const d = digits ?? String;
  const isEn = (lang ?? "ne").slice(0, 2) === "en";
  if (isEn) {
    return `${BS_MONTH_NAMES[bs.month - 1]} ${bs.day}, ${bs.year}`;
  }
  return `${BS_MONTHS_NE[bs.month - 1]} ${d(bs.day)}, ${d(bs.year)}`;
}

const AD_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export const AD_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const WEEKDAY_FULL_NE = [
  "आइतबार", "सोमबार", "मङ्गलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार",
] as const;

const WEEKDAY_FULL_EN = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: string;
  minute: string;
};

/** Civil date + clock in an IANA timezone (for BS / dasha display). */
export function getZonedParts(date: Date, timeZone?: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdayIdx >= 0 ? weekdayIdx : 0,
    hour: get("hour"),
    minute: get("minute"),
  };
}

/**
 * Dasha period boundary — Bikram Sambat (Nepali) when lang is ne, Gregorian AD when en.
 * Uses the chart place timezone so begin/end match the web kundali dasha view.
 */
export function formatDashaInstant(
  date: Date,
  lang: "ne" | "en",
  timeZone?: string,
): string {
  if (Number.isNaN(date.getTime())) return "";
  const z = getZonedParts(date, timeZone);
  const civil = new Date(z.year, z.month - 1, z.day);
  if (lang === "en") {
    return `${AD_MONTHS_SHORT[z.month - 1]} ${z.day}, ${z.year}`;
  }
  const bs = adToBS(civil);
  return `${BS_MONTHS_NE[bs.month - 1]} ${toNepaliDigits(bs.day)}, ${toNepaliDigits(bs.year)}`;
}

/**
 * Zoned instant as BS calendar date + weekday + clock (Nepali UI).
 * e.g. असार ४, २०७६, सोमबार ०६:३७
 */
export function formatZonedBsMoment(
  date: Date,
  options?: {
    lang?: "ne" | "en";
    timeZone?: string;
    digits?: (v: string | number) => string;
  },
): string {
  const { lang = "ne", timeZone, digits = String } = options ?? {};
  const z = getZonedParts(date, timeZone);
  const civil = new Date(z.year, z.month - 1, z.day);
  const bs = adToBS(civil);
  const time = `${z.hour}:${z.minute}`;

  if (lang === "en") {
    const monthEn = BS_MONTH_NAMES[bs.month - 1];
    const weekdayEn = WEEKDAY_FULL_EN[z.weekday] ?? "";
    return `${monthEn} ${bs.day}, ${bs.year}, ${weekdayEn} at ${time}`;
  }
  const monthNe = BS_MONTHS_NE[bs.month - 1];
  const weekdayNe = WEEKDAY_FULL_NE[z.weekday] ?? "";
  return `${monthNe} ${digits(bs.day)}, ${digits(bs.year)}, ${weekdayNe} ${digits(time)}`;
}

/** Gregorian AD + weekday + clock (English UI). */
export function formatZonedAdMoment(
  date: Date,
  options?: {
    timeZone?: string;
    digits?: (v: string | number) => string;
  },
): string {
  const { timeZone, digits = String } = options ?? {};
  const z = getZonedParts(date, timeZone);
  const time = `${digits(z.hour)}:${digits(z.minute)}`;
  const weekdayEn = WEEKDAY_FULL_EN[z.weekday] ?? "";
  return `${AD_MONTH_NAMES[z.month - 1]} ${z.day}, ${z.year}, ${weekdayEn} at ${time}`;
}

/** Dasha begin/end line — BS in Nepali, AD in English. */
export function formatDashaMoment(
  date: Date,
  lang: "ne" | "en",
  timeZone?: string,
  digits?: (v: string | number) => string,
): string {
  if (lang === "en") {
    return formatZonedAdMoment(date, { timeZone, digits });
  }
  return formatZonedBsMoment(date, { lang: "ne", timeZone, digits });
}
