import {
  fetchAdToBs,
  fetchBsToAd,
  type ConvertAdToBs,
  type ConvertBsToAd,
} from "@/lib/api";
import { adToBS, bsToAD, getBSMonthLength } from "@vedic-patro/domain/calendar/bs-calendar";
// The server's own month spellings (Baishakh/बैशाख, Poush/पौष …), so a reply reads the same from either side.
import { BS_MONTH_NAMES, BS_MONTH_NAMES_NE as BS_MONTHS_NE } from "@vedic-patro/domain/panchanga/engine/tables.generated";
import { BS_SUPPORTED_END_YEAR, BS_SUPPORTED_START_YEAR } from "@/lib/bs-range";

/**
 * AD ↔ BS conversion for the converter screen.
 *
 * The app's bundled month table answers first: it is a verified copy of the server's (BS 1700–2200), so a
 * conversion needs no round trip. Only a date outside that table (or one the table rejects) goes to the
 * server, which stays the source of truth and reports a bad date as an error.
 */
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// The calendar tables work in UTC midnights: read and build dates in UTC so the phone's time zone never shifts a day.
function adIso(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function localAdToBs(adDate: string): ConvertAdToBs | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(adDate);
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Date rolls an impossible day (Feb 30) into the next month: leave those to the server's error.
  if (adIso(date) !== adDate) return null;
  const bs = adToBS(date);
  if (bs.year < BS_SUPPORTED_START_YEAR || bs.year > BS_SUPPORTED_END_YEAR) return null;
  return {
    ad_date: adDate,
    bs_year: bs.year,
    bs_month: bs.month,
    bs_day: bs.day,
    bs_date: `${bs.year}-${pad(bs.month)}-${pad(bs.day)}`,
    bs_month_name: BS_MONTH_NAMES[bs.month - 1]!,
    bs_month_name_ne: BS_MONTHS_NE[bs.month - 1]!,
    weekday: WEEKDAYS[date.getUTCDay()]!,
  };
}

export function localBsToAd(bsDate: string): ConvertBsToAd | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(bsDate);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (year < BS_SUPPORTED_START_YEAR || year > BS_SUPPORTED_END_YEAR) return null;
  if (month < 1 || month > 12 || day < 1 || day > getBSMonthLength(year, month)) return null;
  const ad = bsToAD(year, month, day);
  return {
    bs_date: `${year}-${pad(month)}-${pad(day)}`,
    bs_year: year,
    bs_month: month,
    bs_day: day,
    bs_month_name: BS_MONTH_NAMES[month - 1]!,
    bs_month_name_ne: BS_MONTHS_NE[month - 1]!,
    ad_date: adIso(ad),
    weekday: WEEKDAYS[ad.getUTCDay()]!,
  };
}

export async function convertAdToBs(adDate: string): Promise<ConvertAdToBs> {
  return localAdToBs(adDate) ?? fetchAdToBs(adDate);
}

export async function convertBsToAd(bsDate: string): Promise<ConvertBsToAd> {
  return localBsToAd(bsDate) ?? fetchBsToAd(bsDate);
}
