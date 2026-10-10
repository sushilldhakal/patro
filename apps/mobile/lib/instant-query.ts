/**
 * A *moment* — the identity the birth-chart endpoints take.
 *
 * Mirrors the web app's `src/lib/instant-query.ts`. Kundali, vimshottari and
 * milan need finer granularity than a whole civil day, so a moment is a civil
 * day named in some era plus an observer-local clock. The backend turns the day
 * into a Julian Day; this module converts nothing.
 */

import type { Era } from "@vedic-patro/domain/era";
import type { InstantQuery } from "@vedic-patro/domain/instant";
import { parseCivilIso } from "@/lib/patro-day";

export type { Era, InstantQuery };
export {
  appendBirthInstantParams,
  appendInstantParams,
  instantCacheKey,
} from "@vedic-patro/domain/instant";

/** Moment from a civil `YYYY-MM-DD` the backend already gave us, plus a clock. */
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
