import {
  fetchAdToBs,
  fetchBsToAd,
  type ConvertAdToBs,
  type ConvertBsToAd,
} from "@/lib/api";
import {
  BS_MONTHS_NE,
  BS_MONTH_NAMES,
  BS_SUPPORTED_END_YEAR,
  BS_SUPPORTED_START_YEAR,
  adToBS,
  bsToAD,
  getBSMonthLength,
} from "@/lib/bs-calendar";
import { OfflineMissError } from "@/lib/offline/offline-http";

/**
 * AD ↔ BS conversion for the converter screen.
 *
 * Asks the server (the source of truth). With no connection the app's bundled
 * month table answers instead — that table is a verified copy of the server's
 * (BS 1700–2200), kept in the app for exactly this case. A real error from the
 * server (bad date) is not masked.
 */
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function isNoConnection(err: unknown): boolean {
  if (err instanceof OfflineMissError || err instanceof TypeError) return true;
  const message = err instanceof Error ? err.message : "";
  return /^API 5\d\d/.test(message);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function adIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function convertAdToBs(adDate: string): Promise<ConvertAdToBs> {
  try {
    return await fetchAdToBs(adDate);
  } catch (err) {
    if (!isNoConnection(err)) throw err;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(adDate);
    if (!m) throw err;
    const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const bs = adToBS(date);
    if (bs.year < BS_SUPPORTED_START_YEAR || bs.year > BS_SUPPORTED_END_YEAR) throw err;
    return {
      ad_date: adDate,
      bs_year: bs.year,
      bs_month: bs.month,
      bs_day: bs.day,
      bs_date: `${bs.year}-${pad(bs.month)}-${pad(bs.day)}`,
      bs_month_name: BS_MONTH_NAMES[bs.month - 1]!,
      bs_month_name_ne: BS_MONTHS_NE[bs.month - 1]!,
      weekday: WEEKDAYS[date.getDay()]!,
    };
  }
}

export async function convertBsToAd(bsDate: string): Promise<ConvertBsToAd> {
  try {
    return await fetchBsToAd(bsDate);
  } catch (err) {
    if (!isNoConnection(err)) throw err;
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(bsDate);
    if (!m) throw err;
    const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (year < BS_SUPPORTED_START_YEAR || year > BS_SUPPORTED_END_YEAR) throw err;
    if (month < 1 || month > 12 || day < 1 || day > getBSMonthLength(year, month)) throw err;
    const ad = bsToAD(year, month, day);
    return {
      bs_date: `${year}-${pad(month)}-${pad(day)}`,
      bs_year: year,
      bs_month: month,
      bs_day: day,
      bs_month_name: BS_MONTH_NAMES[month - 1]!,
      bs_month_name_ne: BS_MONTHS_NE[month - 1]!,
      ad_date: adIso(ad),
      weekday: WEEKDAYS[ad.getDay()]!,
    };
  }
}
