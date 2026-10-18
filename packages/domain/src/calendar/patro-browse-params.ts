/** Browse-year/month URL parameters, shared by the website and the app's browse hooks (moved here from both, unchanged). */
import { patroBrowseTodayEra, type Era } from "./era";
import { adToBS, getCurrentBs } from "./bs-calendar";

export function positiveInt(y: number): number {
  const t = Math.trunc(y);
  return t >= 1 ? t : 1;
}

export function positiveMonth(m: number): number {
  const t = Math.trunc(m);
  if (t < 1) return 1;
  if (t > 12) return 12;
  return t;
}

export function defaultBrowseYear(era: Era): number {
  if (era === "bs" || era === "bbs") return getCurrentBs().year;
  return new Date().getFullYear();
}

/**
 * Vikram browse URLs carry BS year/month. Older builds mirrored Gregorian
 * `getFullYear()` / `getMonth()+1` into `era=bs` links — rewrite that pair.
 */
export function coerceMonthBrowseFromUrl(
  era: Era,
  year: number | undefined,
  month: number | undefined,
): { year?: number; month?: number } {
  if (era !== "bs" && era !== "bbs") {
    return { year, month };
  }
  const now = new Date();
  const adYear = now.getFullYear();
  const adMonth = now.getMonth() + 1;
  if (year !== adYear) {
    return { year, month };
  }
  const bs = getCurrentBs();
  return {
    year: bs.year,
    month: month === adMonth ? bs.month : month,
  };
}

/** Same AD-year leak as {@link coerceMonthBrowseFromUrl} — year-only browse URLs. */
export function coerceYearBrowseFromUrl(era: Era, year: number | undefined): number | undefined {
  if (year == null || era === "ad" || era === "bc") return year;
  if (year === new Date().getFullYear()) return getCurrentBs().year;
  return year;
}

/** Default year/month for a month browse in `era` (today in BS or AD). */
export function defaultMonthBrowseParts(era: Era): { year: number; month: number } {
  if (era === "bs" || era === "bbs") return getCurrentBs();
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

/** Browsed year for "today" in {@link patroBrowseTodayEra}. */
export function patroBrowseTodayYear(era: Era, todayAd?: string): number {
  const targetEra = patroBrowseTodayEra(era);
  if (targetEra === "bs") {
    const bs = todayAd ? adToBS(new Date(`${todayAd}T12:00:00`)) : getCurrentBs();
    return bs.year;
  }
  const d = todayAd ? new Date(`${todayAd}T12:00:00`) : new Date();
  if (targetEra === "ad" || targetEra === "bc") return d.getFullYear();
  return getCurrentBs().year;
}
