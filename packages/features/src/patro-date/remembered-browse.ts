/**
 * The year (and month) the reader last browsed to, kept for the session so
 * every month and year page opens on it until they change it — going to BS 2088
 * on the home calendar and then opening holidays or panchak shows 2088 there too.
 *
 * Module state, not storage: it lives as long as the page (website) or the app
 * process, so a fresh visit starts on today again. A link or URL that names its
 * own year still wins; this only fills in a page opened without one.
 */
import type { Era } from "@vedic-patro/domain/calendar/era";

/** BS runs 56–57 years ahead of AD; the larger gap holds for most of the BS year. */
const BS_AD_OFFSET = 57;

let remembered: { era: Era; year: number; month?: number } | null = null;

export function rememberBrowse(era: Era, year: number, month?: number): void {
  const keepMonth = month ?? (remembered && remembered.era === era && remembered.year === year ? remembered.month : undefined);
  remembered = { era, year, month: keepMonth };
}

/** The remembered year in `era` (converted between BS and AD), or null. */
export function rememberedYear(era: Era): number | null {
  if (!remembered) return null;
  if (remembered.era === era) return remembered.year;
  if (remembered.era === "bs" && era === "ad") return remembered.year - BS_AD_OFFSET;
  if (remembered.era === "ad" && era === "bs") return remembered.year + BS_AD_OFFSET;
  return null;
}

/** The remembered year + month, only when it was browsed in `era` (months do not convert). */
export function rememberedMonth(era: Era): { year: number; month: number } | null {
  if (!remembered || remembered.era !== era || remembered.month == null) return null;
  return { year: remembered.year, month: remembered.month };
}
