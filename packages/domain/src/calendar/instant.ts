/**
 * A *moment* — the identity the birth-chart endpoints take: a civil day named
 * in some era plus an observer-local clock. The backend turns it into a Julian
 * Day (`apps/api/app/instant_resolver.py`); nothing here converts dates.
 */
import type { Era } from "./era";

/** A civil day in `inputEra`, plus the local time of day on it. */
export type InstantQuery = {
  inputEra: Era;
  year: number;
  month: number;
  day: number;
  /** Observer-local `HH:MM`. */
  clock: string;
};

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
