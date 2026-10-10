/**
 * A *moment* — the identity the birth-chart endpoints take.
 *
 * The day pipeline (`patro-day-url.ts`) addresses whole civil days. Kundali,
 * vimshottari and milan need finer granularity, so a moment is a civil day named
 * in some era plus an observer-local clock. The backend turns the day into a
 * Julian Day (`app/instant_resolver.py`); this module converts nothing.
 *
 * The older `?datetime=` ISO form still works server-side, but it cannot address
 * a pre-1 CE birth moment and it forces the client to hold a Gregorian date, so
 * new callers should use this.
 */

import type { Era } from "./era";
import type { InstantQuery } from "./instant";
import { parseCivilIso } from "./patro-day";

export type { Era, InstantQuery };
export {
  appendBirthInstantParams,
  appendInstantParams,
  instantCacheKey,
} from "./instant";

/**
 * Moment from a civil `YYYY-MM-DD` the backend already gave us, plus a clock.
 *
 * Sign-aware, so a BCE `date_ad` (`-0043-03-15`) survives the trip.
 */
export function instantFromCivilIso(dateAd: string, clock: string): InstantQuery {
  const { year, month, day } = parseCivilIso(dateAd);
  return { inputEra: "ad", year, month, day, clock };
}

/** Moment from parts already written in an era — no conversion either way. */
export function instantFromEraParts(
  inputEra: Era,
  parts: { year: number; month: number; day: number },
  clock: string,
): InstantQuery {
  return { inputEra, year: parts.year, month: parts.month, day: parts.day, clock };
}

/** Stable cache key. Two spellings of one moment must not produce two keys. */
