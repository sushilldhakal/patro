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

import type { Era } from "@/lib/era";
import { parseCivilIso } from "@/lib/patro-day";

/** A civil day in `inputEra`, plus the local time of day on it. */
export type InstantQuery = {
  inputEra: Era;
  year: number;
  month: number;
  day: number;
  /** Observer-local `HH:MM`. */
  clock: string;
};

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
export function instantCacheKey(q: InstantQuery): string {
  return `${q.inputEra}:${q.year}-${q.month}-${q.day}@${q.clock}`;
}

/** Write a moment onto a query string, optionally under a per-person prefix. */
export function appendInstantParams(
  params: URLSearchParams,
  q: InstantQuery,
  prefix = "",
): URLSearchParams {
  if (prefix) {
    // Milan addresses two people in one request, so neither can use the
    // request-wide era context — each carries its own namespaced era + parts,
    // resolved server-side by `instant_for_parts`.
    params.set(`${prefix}era`, q.inputEra);
    params.set(`${prefix}year`, String(q.year));
    params.set(`${prefix}month`, String(q.month));
    params.set(`${prefix}day`, String(q.day));
    params.set(`${prefix}clock`, q.clock);
    return params;
  }
  params.set("inputEra", q.inputEra);
  params.set("era", q.inputEra);
  params.set("year", String(q.year));
  params.set("month", String(q.month));
  params.set("day", String(q.day));
  params.set("clock", q.clock);
  return params;
}

/** Namespaced birth-moment params for rashifal / sait personalize. */
export function appendBirthInstantParams(
  params: URLSearchParams,
  q: InstantQuery,
): URLSearchParams {
  params.set("birth_era", q.inputEra);
  params.set("birth_year", String(q.year));
  params.set("birth_month", String(q.month));
  params.set("birth_day", String(q.day));
  params.set("birth_clock", q.clock);
  return params;
}
