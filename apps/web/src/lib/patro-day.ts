/** Proleptic Gregorian civil day → UTC ms at 00:00 (ES `Date.UTC` breaks for years 0–99). */
export function civilGregorianToUtcMs(year: number, month: number, day: number): number {
  if (year >= 100 && year <= 9999) {
    return Date.UTC(year, month - 1, day);
  }
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  return (jdn - 2440588) * 86_400_000;
}

function isUtcCivilMidnight(d: Date): boolean {
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

function civilPartsFromDate(d: Date): { year: number; month: number; day: number } {
  const utcMidnight = isUtcCivilMidnight(d);
  return {
    year: utcMidnight ? d.getUTCFullYear() : d.getFullYear(),
    month: utcMidnight ? d.getUTCMonth() + 1 : d.getMonth() + 1,
    day: utcMidnight ? d.getUTCDate() : d.getDate(),
  };
}

export function formatCivilIsoParts(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  if (year <= 0) {
    return `-${String(Math.abs(year)).padStart(4, "0")}-${m}-${dd}`;
  }
  return `${String(year).padStart(4, "0")}-${m}-${dd}`;
}

/** Proleptic civil ISO from a local or UTC-midnight `Date` (not the browser clock string pattern). */
export function civilIsoFromDate(d: Date): string {
  const { year, month, day } = civilPartsFromDate(d);
  return formatCivilIsoParts(year, month, day);
}

export function civilPartsFromPickerDate(d: Date): { year: number; month: number; day: number } {
  return civilPartsFromDate(d);
}

/** AD date string helpers shared by day-browse patro pages. */
export function toAdStr(d: Date): string {
  return civilIsoFromDate(d);
}

/** Parse proleptic Gregorian ``YYYY-MM-DD`` / ``-YYYY-MM-DD`` (API ``date_ad``). */
export function parseCivilIso(iso: string): { year: number; month: number; day: number } {
  let text = iso.trim();
  if (!text) throw new Error("empty civil iso date");
  let sign = 1;
  if (text.startsWith("-")) {
    sign = -1;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }
  const parts = text.split("-");
  if (parts.length !== 3) throw new Error(`invalid civil iso date: ${iso}`);
  return {
    year: sign * parseInt(parts[0]!, 10),
    month: parseInt(parts[1]!, 10),
    day: parseInt(parts[2]!, 10),
  };
}

/** Day of month from ``date_ad`` — never use ``new Date(iso)`` (breaks on ``0193-…``). */
export function civilIsoDayOfMonth(iso: string): number {
  return parseCivilIso(iso).day;
}

/** Noon UTC on a civil day (for formatting / labels without local year-0–99 bugs). */
export function parseCivilIsoToDate(iso: string): Date {
  const { year, month, day } = parseCivilIso(iso);
  return new Date(civilGregorianToUtcMs(year, month, day) + 12 * 3_600_000);
}

/**
 * Date part of a civil ISO timestamp, whatever the year's width.
 *
 * `iso.slice(0, 10)` is the tempting version and it is wrong for BCE: a signed
 * year makes the date 11 characters, so `-0020-04-16T17:54` sliced to 10 gives
 * `-0020-04-1` — which is how a moonrise label rendered as "-0020-04-1 · १७:५४".
 */
export function civilIsoDatePart(iso: string): string {
  return canonicalCivilIso(iso.split("T")[0]!);
}

/** Canonical ``YYYY-MM-DD`` for maps / API merge (matches Python ``date.isoformat()``). */
export function canonicalCivilIso(iso: string): string {
  const { year, month, day } = parseCivilIso(iso);
  if (year <= 0) {
    return `-${String(Math.abs(year)).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type GregorianDateParts = {
  era?: string;
  year: number;
  month: number;
  day: number;
};

/** Signed proleptic civil ISO from API ``date_parts.gregorian`` (BC uses positive year + era). */
export function civilIsoFromGregorianParts(g: GregorianDateParts): string {
  const y = g.era === "bc" ? 1 - g.year : g.year;
  return formatCivilIsoParts(y, g.month, g.day);
}

/**
 * Authoritative civil day for panchanga payloads — ``date_ad`` alone omits the BC
 * sign (e.g. ``1657-05-27`` for 1657 BCE); gregorian parts carry ``era: bc``.
 */
export function civilAnchorFromPanchangaDay(p: {
  date_ad?: string;
  date_parts?: { gregorian?: GregorianDateParts };
}): string {
  const g = p.date_parts?.gregorian;
  if (g?.year && g.month && g.day) {
    return civilIsoFromGregorianParts(g);
  }
  const ad = p.date_ad?.trim();
  if (!ad) return "";
  return canonicalCivilIso(ad);
}

/** Sunday = 0 … Saturday = 6 for a civil ISO date. */
export function civilIsoWeekday(iso: string): number {
  const { year, month, day } = parseCivilIso(iso);
  const ms = civilGregorianToUtcMs(year, month, day) + 12 * 3_600_000;
  return new Date(ms).getUTCDay();
}

/** Parse "YYYY-MM-DD" in local time (no UTC shift). */
export function parseAdStr(s: string): Date {
  return parseCivilIsoToDate(s);
}

/** Historical BCE year from proleptic civil year (0 = 1 BCE, −56 = 57 BCE). */
export function historicalBceFromCivilYear(civilYear: number): number | null {
  if (civilYear >= 1) return null;
  return 1 - civilYear;
}

/** Gregorian year label: CE digits, or ``57 BC`` / ``५७ ई.पू.`` — never ``-56 AD``. */
export function formatCivilYearLabel(
  year: number,
  lang: string,
  digitFn: (n: number | string) => string = String,
): string {
  if (year >= 1) return digitFn(year);
  const bce = 1 - year;
  const isEn = lang.slice(0, 2) === "en";
  return isEn ? `${digitFn(bce)} BC` : `${digitFn(bce)} ई.पू.`;
}

/** Vikram year headline AD span, e.g. ``56/3/16-55/3/15 BC`` (not ``-0056-03-16``). */
export function formatPatroYearGregorianRange(
  startIso: string,
  endIso: string,
  lang: string,
  digitFn: (n: number | string) => string = String,
): string {
  const start = parseCivilIso(startIso);
  const end = parseCivilIso(endIso);
  const slash = (p: { year: number; month: number; day: number }) => {
    const y = p.year <= 0 ? Math.abs(p.year) : p.year;
    return `${digitFn(y)}/${digitFn(p.month)}/${digitFn(p.day)}`;
  };
  const a = slash(start);
  const b = slash(end);
  if (start.year <= 0 && end.year <= 0) {
    const bc = lang.slice(0, 2) === "en" ? " BC" : " ई.पू.";
    return `${a}-${b}${bc}`;
  }
  const ad = lang.slice(0, 2) === "en" ? " AD" : "";
  return `${a}–${b}${ad}`;
}

/** Step a civil day by ``delta`` days (BCE/CE-safe). */
export function addCivilDays(d: Date, delta: number): Date {
  const { year, month, day } = parseCivilIso(toAdStr(d));
  return new Date(
    civilGregorianToUtcMs(year, month, day) + delta * 86_400_000 + 12 * 3_600_000,
  );
}

/**
 * Align ephemeris ``local`` stamps (astronomical year, e.g. ``-2141-03-04``) with
 * API ``date_ad`` (positive BCE, e.g. ``2142-03-03``). CE dates pass through.
 */
export function positiveGregorianCivilIso(iso: string): string {
  const { year, month, day } = parseCivilIso(iso);
  const civilYear = year <= 0 ? 1 - year : year;
  return formatCivilIsoParts(civilYear, month, day);
}

/** Whole-day offset on a civil ISO string (BCE/CE-safe). */
export function addDaysCivilIso(iso: string, days: number): string {
  const normalized = positiveGregorianCivilIso(iso);
  const next = addCivilDays(parseCivilIsoToDate(normalized), days);
  return toAdStr(next);
}

/** Signed day count from ``b`` to ``a`` on the proleptic Gregorian axis. */
export function civilDayDiffIso(a: string, b: string): number {
  const pa = parseCivilIso(positiveGregorianCivilIso(a));
  const pb = parseCivilIso(positiveGregorianCivilIso(b));
  const msA = civilGregorianToUtcMs(pa.year, pa.month, pa.day);
  const msB = civilGregorianToUtcMs(pb.year, pb.month, pb.day);
  return Math.round((msA - msB) / 86_400_000);
}

/** Vikram date key for `/panchanga/{key}?era=bs` (matches API `format_bs_date`). */
export function formatBsDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const PATRO_DAY_KEY = /^(-?\d+)-(\d{2})-(\d{2})$/;

export function parsePatroDayDateKey(value: string): { year: number; month: number; day: number } {
  if (typeof value !== "string") {
    throw new Error(`invalid patro day date: ${String(value)}`);
  }
  const trimmed = value.trim();
  if (!trimmed) throw new Error("invalid patro day date: empty");
  const m = trimmed.match(PATRO_DAY_KEY);
  if (!m) throw new Error(`invalid patro day date: ${value}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function isPatroDayDateKey(v: unknown): v is string {
  return typeof v === "string" && PATRO_DAY_KEY.test(v);
}

export type PatroDayEra = "bs" | "ad";
