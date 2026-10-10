/**
 * A *moment* — the identity the birth-chart endpoints take.
 *
 * Mirrors the web app's `src/lib/instant-query.ts`. Kundali, vimshottari and
 * milan need finer granularity than a whole civil day, so a moment is a civil
 * day named in some era plus an observer-local clock. The backend turns the day
 * into a Julian Day; this module converts nothing.
 */

import { parseCivilIso } from "@/lib/patro-day";

export type Era = "ad" | "bc" | "bs" | "bbs";

/** A civil day in `inputEra`, plus the local time of day on it. */
export type InstantQuery = {
  inputEra: Era;
  year: number;
  month: number;
  day: number;
  /** Observer-local `HH:MM`. */
  clock: string;
};

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
