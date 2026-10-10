import calendarData from "./bs-calendar-data.json"
import { civilGregorianToUtcMs, parseCivilIso, toAdStr } from "./patro-day"

export const BS_MONTH_NAMES = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
] as const

/**
 * Three-letter BS months for tight spots (the mobile header's cross-calendar
 * reference). Ashwin is "Asw", not "Ash", so it stays distinct from Ashadh.
 * Shrawan is "Sha" (not "Shr") to pair cleanly with "Bha" in cross-era spans.
 */
export const BS_MONTHS_SHORT = [
  "Bai", "Jes", "Ash", "Sha", "Bha", "Asw",
  "Kar", "Man", "Pou", "Mag", "Fal", "Cha",
] as const

export const BS_MONTHS_NE = [
  "वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
  "कात्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत",
]

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export const WEEKDAYS_SHORT_NE = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"] as const

const AD_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const

export const AD_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const

export const AD_MONTH_NAMES_NE = [
  "जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन",
  "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर",
] as const

/** मार्च, मे and जुन are already short, so they stay whole. */
const AD_MONTHS_SHORT_NE = [
  "जन", "फेब", "मार्च", "अप्र", "मे", "जुन",
  "जुल", "अग", "सेप", "अक्टो", "नोभे", "डिसे",
] as const

export { AD_MONTHS_SHORT, AD_MONTHS_SHORT_NE }

export type BikramSambatDate = {
  year: number
  month: number
  day: number
  monthName: string
}

type BsMonthLengths = readonly [number, number, number, number, number, number, number, number, number, number, number, number]

function asMonthLengths(lengths: number[]): BsMonthLengths {
  if (lengths.length !== 12) throw new Error(`BS month length row must have 12 entries, got ${lengths.length}`)
  return lengths as unknown as BsMonthLengths
}

const BS_YEAR_MONTH_LENGTHS: Record<number, BsMonthLengths> = Object.fromEntries(
  Object.entries(calendarData.month_lengths).map(([year, lengths]) => [Number(year), asMonthLengths(lengths)]),
)

const BAISAKH_1_AD: Record<number, string> = Object.fromEntries(
  Object.entries(calendarData.baisakh_1_ad).map(([year, iso]) => [Number(year), iso]),
)

/** First BS year with full server panchanga cache on typical deploy (browse floor may still be 60). */
export const BS_PANCHANGA_START_YEAR =
  typeof (calendarData as { panchanga_start_year?: number }).panchanga_start_year === "number"
    ? (calendarData as { panchanga_start_year: number }).panchanga_start_year
    : 60

/** Inclusive Vikram year range for month/year browse pickers (offline month grid from {@link BS_SUPPORTED_START_YEAR}). */
export const BS_SUPPORTED_START_YEAR =
  typeof (calendarData as { browse_start_year?: number }).browse_start_year === "number"
    ? (calendarData as { browse_start_year: number }).browse_start_year
    : typeof (calendarData as { panchanga_start_year?: number }).panchanga_start_year === "number"
      ? (calendarData as { panchanga_start_year: number }).panchanga_start_year
      : calendarData.start_year
export const BS_SUPPORTED_END_YEAR = calendarData.end_year

/** First BS year in embedded `baisakh_1_ad` / `month_lengths` (includes 1–59, not only browse floor). */
export const BS_OFFLINE_TABLE_START_YEAR = Math.min(
  ...Object.keys(BAISAKH_1_AD).map(Number).filter((y) => Number.isFinite(y) && y >= 1),
)

type BsMonthStart = { year: number; month: number; adMs: number }

function parseAdDateOnly(isoDate: string): number {
  const { year, month, day } = parseCivilIso(isoDate)
  return civilGregorianToUtcMs(year, month, day)
}

function normalizeToUtcDate(date: Date): number {
  if (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  ) {
    return civilGregorianToUtcMs(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    )
  }
  return civilGregorianToUtcMs(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  )
}

/** Civil day at UTC midnight — do not use local `Date(y,m,d)` (years 0–99 → 1900–1999). */
function localDateFromUtcMs(ms: number): Date {
  return new Date(ms)
}

function buildMonthStarts(): BsMonthStart[] {
  const starts: BsMonthStart[] = []
  for (let year = BS_OFFLINE_TABLE_START_YEAR; year <= BS_SUPPORTED_END_YEAR; year += 1) {
    const baisakh1 = BAISAKH_1_AD[year]
    if (!baisakh1) continue
    let cursor = parseAdDateOnly(baisakh1)
    for (let month = 1; month <= 12; month += 1) {
      starts.push({ year, month, adMs: cursor })
      const days = BS_YEAR_MONTH_LENGTHS[year]?.[month - 1] ?? 30
      cursor += days * 86_400_000
    }
  }
  starts.sort((a, b) => a.adMs - b.adMs)
  return starts
}

const BS_MONTH_STARTS = buildMonthStarts()

function monthStartFor(year: number, month: number): BsMonthStart | undefined {
  return BS_MONTH_STARTS.find((s) => s.year === year && s.month === month)
}

export function getBSMonthLength(year: number, month: number): number {
  const monthLength = BS_YEAR_MONTH_LENGTHS[year]?.[month - 1]
  if (monthLength) return monthLength
  const current = monthStartFor(year, month)
  if (!current) return 30
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const next =
    monthStartFor(nextYear, nextMonth) ??
    (nextMonth === 1 && BAISAKH_1_AD[nextYear]
      ? { year: nextYear, month: nextMonth, adMs: parseAdDateOnly(BAISAKH_1_AD[nextYear]) }
      : undefined)
  if (!next) return 30
  return Math.round((next.adMs - current.adMs) / 86_400_000)
}

/**
 * `bsToAD` that answers `null` instead of throwing when the year is outside the
 * embedded table (BBS / negative years, or past its end).
 *
 * `bsToAD` throwing is right — a wrong date is worse than none — but ~20 call
 * sites treated it as total. Reaching one with a BBS year killed the whole page
 * with "केही गडबड भयो", so anything on a browse path that a signed year can
 * reach uses this and falls back.
 */
export function bsToAdOrNull(year: number, month: number, day: number): Date | null {
  if (year < BS_OFFLINE_TABLE_START_YEAR || year > BS_SUPPORTED_END_YEAR) return null
  try {
    return bsToAD(year, month, day)
  } catch {
    return null
  }
}

export function bsToAD(year: number, month: number, day: number): Date {
  const monthStart = monthStartFor(year, month)
  if (!monthStart) {
    const baisakh1 = BAISAKH_1_AD[year]
    if (!baisakh1) {
      throw new Error(`No offline BS calendar table for Vikram year ${year}`)
    }
    let cursor = parseAdDateOnly(baisakh1)
    for (let m = 1; m < month; m += 1) {
      const days = BS_YEAR_MONTH_LENGTHS[year]?.[m - 1] ?? 30
      cursor += days * 86_400_000
    }
    const monthLength = getBSMonthLength(year, month)
    const safeDay = Math.min(Math.max(1, day), monthLength)
    return localDateFromUtcMs(cursor + (safeDay - 1) * 86_400_000)
  }
  const monthLength = getBSMonthLength(year, month)
  const safeDay = Math.min(Math.max(1, day), monthLength)
  return localDateFromUtcMs(monthStart.adMs + (safeDay - 1) * 86_400_000)
}

export function adToBS(date: Date): BikramSambatDate {
  const adMs = normalizeToUtcDate(date)
  const fallback = BS_MONTH_STARTS[0]
  if (!fallback) return { year: BS_SUPPORTED_START_YEAR, month: 1, day: 1, monthName: BS_MONTH_NAMES[0] }
  let match = fallback
  for (const start of BS_MONTH_STARTS) {
    if (start.adMs <= adMs) match = start
    else break
  }
  const day = Math.max(1, Math.floor((adMs - match.adMs) / 86_400_000) + 1)
  const monthName = BS_MONTH_NAMES[match.month - 1] ?? BS_MONTH_NAMES[0]
  return { year: match.year, month: match.month, day, monthName }
}

export function formatBSDate(date: Date): string {
  const bs = adToBS(date)
  return `${bs.monthName} ${bs.day}, ${bs.year}`
}

export function formatBSMonthYear(date: Date): string {
  const bs = adToBS(date)
  return `${bs.monthName} ${bs.year}`
}

export function getBSMonthADRange(date: Date): { start: Date; end: Date } {
  const bs = adToBS(date)
  return {
    start: bsToAD(bs.year, bs.month, 1),
    end: bsToAD(bs.year, bs.month, getBSMonthLength(bs.year, bs.month)),
  }
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

export function getCurrentBs(): { year: number; month: number; day: number } {
  const bs = adToBS(new Date())
  return { year: bs.year, month: bs.month, day: bs.day }
}

/** Supported Gregorian bounds aligned with BS calendar tables. */
export function getSupportedAdBounds(): {
  minYear: number
  minMonth: number
  maxYear: number
  maxMonth: number
} {
  const start = bsToAD(BS_OFFLINE_TABLE_START_YEAR, 1, 1)
  const end = bsToAD(
    BS_SUPPORTED_END_YEAR,
    12,
    getBSMonthLength(BS_SUPPORTED_END_YEAR, 12),
  )
  const startCivil = parseCivilIso(toAdStr(start))
  const endCivil = parseCivilIso(toAdStr(end))
  return {
    minYear: startCivil.year,
    minMonth: startCivil.month,
    maxYear: endCivil.year,
    maxMonth: endCivil.month,
  }
}

/**
 * सोमवार → सोम, for phone-width labels. Works off the suffix rather than a
 * lookup because the API and the local lists disagree on वार vs बार.
 */
export function shortWeekdayNe(name?: string | null): string | undefined {
  if (!name) return undefined;
  const trimmed = name.trim().replace(/(वार|बार)$/u, "");
  return trimmed || name;
}

export function bsMonthLabel(month: number, lang?: string): string {
  const isEn = (lang ?? "ne").slice(0, 2) === "en";
  return isEn ? BS_MONTH_NAMES[month - 1] : BS_MONTHS_NE[month - 1];
}

/** Gregorian month name, mirroring {@link bsMonthLabel}. */
export function adMonthLabel(month: number, lang?: string): string {
  const isEn = (lang ?? "ne").slice(0, 2) === "en";
  return isEn ? AD_MONTH_NAMES[month - 1] : AD_MONTH_NAMES_NE[month - 1];
}

const WEEKDAY_FULL_NE = [
  "आइतबार", "सोमबार", "मङ्गलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार",
] as const

const WEEKDAY_FULL_EN = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const

type ZonedParts = {
  year: number
  month: number
  day: number
  weekday: number
  hour: string
  minute: string
}

/** Civil date + clock in an IANA timezone (for BS conversion). */
export function getZonedParts(date: Date, timeZone?: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    era: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  const weekdayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"))
  /* Before 1 CE `Intl` prints a positive year with a `BC` era beside it, so the
     digits alone name a date ten thousand years the wrong side of the epoch.
     The astronomical year is `1 − n`. */
  const era = get("era")
  const year = Number(get("year"))
  return {
    year: era && /^b/i.test(era) ? 1 - year : year,
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdayIdx >= 0 ? weekdayIdx : 0,
    hour: get("hour"),
    minute: get("minute"),
  }
}

/** Long BS date label, e.g. असार १५, २०८३ or Ashadh 15, 2083. */
export function formatBsDateLong(
  date: Date,
  lang?: string,
  digits?: (v: string | number) => string,
): string {
  const bs = adToBS(date)
  const d = digits ?? String
  const isEn = (lang ?? "ne").slice(0, 2) === "en"
  if (isEn) {
    return `${BS_MONTH_NAMES[bs.month - 1]} ${bs.day}, ${bs.year}`
  }
  return `${BS_MONTHS_NE[bs.month - 1]} ${d(bs.day)}, ${d(bs.year)}`
}

/**
 * BS parts for a calendar-only AD date (`YYYY-MM-DD`), with no timezone in the
 * middle: the string is read as civil parts and converted straight through, so
 * the same day never lands on two different Vikram dates depending on where the
 * reader is sitting.
 */
export function bsFromCivilIso(iso: string): BikramSambatDate {
  return adToBS(new Date(parseAdDateOnly(iso)))
}

function bsMonthName(month: number, isEn: boolean): string {
  return (isEn ? BS_MONTH_NAMES[month - 1] : BS_MONTHS_NE[month - 1]) ?? ""
}

/** Long BS label for a calendar-only AD date — {@link formatBsDateLong}, timezone-free. */
export function formatBsCivilIsoLong(
  iso: string,
  lang?: string,
  digits?: (v: string | number) => string,
): string {
  const bs = bsFromCivilIso(iso)
  const d = digits ?? String
  const isEn = (lang ?? "ne").slice(0, 2) === "en"
  return `${bsMonthName(bs.month, isEn)} ${d(bs.day)}, ${d(bs.year)}`
}

/**
 * BS label for a span between two calendar-only AD dates, collapsing whatever
 * the two ends share — साउन २९ – ३२, २०८३ inside one month, साउन २९ – भदौ ४,
 * २०८३ across months, both years spelled out only when the span crosses a
 * Vikram new year.
 */
export function formatBsCivilIsoRange(
  startIso: string,
  endIso: string,
  lang?: string,
  digits?: (v: string | number) => string,
): string {
  const a = bsFromCivilIso(startIso)
  const b = bsFromCivilIso(endIso)
  const d = digits ?? String
  const isEn = (lang ?? "ne").slice(0, 2) === "en"
  const startMonth = bsMonthName(a.month, isEn)
  const endMonth = bsMonthName(b.month, isEn)
  if (a.year !== b.year) {
    return `${startMonth} ${d(a.day)}, ${d(a.year)} – ${endMonth} ${d(b.day)}, ${d(b.year)}`
  }
  if (a.month !== b.month) {
    return `${startMonth} ${d(a.day)} – ${endMonth} ${d(b.day)}, ${d(a.year)}`
  }
  return `${startMonth} ${d(a.day)} – ${d(b.day)}, ${d(a.year)}`
}

/**
 * Compact weekday + BS month/day + AD short for element span cards.
 * e.g. सोम असार ३१ · Jun १४ / Mon Ashadh 31 · Jun 14
 */
export function formatBsAdStamp(
  iso: string,
  options?: {
    lang?: string
    timeZone?: string
    digits?: (v: string | number) => string
  },
): { weekday: string; bsMonthDay: string; adShort: string; label: string } {
  const { lang = "ne", timeZone, digits = String } = options ?? {}
  const z = getZonedParts(new Date(iso), timeZone)
  const bs = adToBS(new Date(z.year, z.month - 1, z.day))
  const isEn = lang.slice(0, 2) === "en"
  const weekday = isEn
    ? (WEEKDAYS_SHORT[z.weekday] ?? "")
    : (WEEKDAYS_SHORT_NE[z.weekday] ?? "")
  const month = isEn ? BS_MONTH_NAMES[bs.month - 1] : BS_MONTHS_NE[bs.month - 1]
  const bsMonthDay = `${month} ${digits(bs.day)}`
  const adShort = `${AD_MONTHS_SHORT[z.month - 1]} ${digits(z.day)}`
  return {
    weekday,
    bsMonthDay,
    adShort,
    label: `${weekday} ${bsMonthDay} · ${adShort}`,
  }
}

/**
 * Zoned instant as BS calendar date + weekday + clock.
 * e.g. असार ४, २०७६, सोमबार ०६:३७
 */
export function formatZonedBsMoment(
  date: Date,
  options?: {
    lang?: string
    timeZone?: string
    digits?: (v: string | number) => string
  },
): string {
  const { lang = "ne", timeZone, digits = String } = options ?? {}
  const z = getZonedParts(date, timeZone)
  const bs = adToBS(new Date(z.year, z.month - 1, z.day))
  const time = `${z.hour}:${z.minute}`
  const isEn = lang.slice(0, 2) === "en"

  if (isEn) {
    const monthEn = BS_MONTH_NAMES[bs.month - 1]
    const weekdayEn = WEEKDAY_FULL_EN[z.weekday] ?? ""
    return `${monthEn} ${bs.day}, ${bs.year}, ${weekdayEn} at ${time}`
  }
  const monthNe = BS_MONTHS_NE[bs.month - 1]
  const weekdayNe = WEEKDAY_FULL_NE[z.weekday] ?? ""
  return `${monthNe} ${digits(bs.day)}, ${digits(bs.year)}, ${weekdayNe} ${digits(time)}`
}

/**
 * Zoned instant as AD (Gregorian) calendar date + weekday + clock — the
 * English-mode counterpart to {@link formatZonedBsMoment}. A BS year number
 * like "2076" means nothing to an English reader; a range like "2019–2036"
 * does, so callers showing a long-spanning date range (e.g. a dasha period)
 * in English should use this instead of translating BS month names.
 * e.g. December 13, 2019, Friday at 22:29
 */
export function formatZonedAdMoment(
  date: Date,
  options?: {
    lang?: string
    timeZone?: string
    digits?: (v: string | number) => string
  },
): string {
  const { lang = "ne", timeZone, digits = String } = options ?? {}
  const z = getZonedParts(date, timeZone)
  const time = `${z.hour}:${z.minute}`
  const isEn = lang.slice(0, 2) === "en"

  if (isEn) {
    const monthEn = AD_MONTH_NAMES[z.month - 1]
    const weekdayEn = WEEKDAY_FULL_EN[z.weekday] ?? ""
    return `${monthEn} ${z.day}, ${z.year}, ${weekdayEn} at ${time}`
  }
  const monthNe = AD_MONTH_NAMES_NE[z.month - 1]
  const weekdayNe = WEEKDAY_FULL_NE[z.weekday] ?? ""
  return `${monthNe} ${digits(z.day)}, ${digits(z.year)}, ${weekdayNe} ${digits(time)}`
}
