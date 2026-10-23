/**
 * Calendar system preference (Bikram Sambat vs Gregorian), independent of the UI language.
 *
 * Pure and platform-free, like `locale.ts`: each app reads/writes the stored value
 * itself and calls `configureCalendarPersistence` once at start-up; everything else
 * here is an in-memory store with subscribe/notify.
 */

import type { Era } from "./era";

export type CalendarSystem = "bs" | "ad";

/** New installs use Bikram Sambat in both languages. */
export const DEFAULT_CALENDAR: CalendarSystem = "bs";

/** Where the chosen calendar system is stored (both apps). */
export const CALENDAR_STORAGE_KEY = "calendarSystem";

/** A stored value ("bs", "AD", " ad ") → a calendar system, or null when unset/unknown. */
export function parseStoredCalendar(raw: string | null | undefined): CalendarSystem | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toLowerCase();
  return code === "bs" ? "bs" : code === "ad" ? "ad" : null;
}

let current: CalendarSystem = DEFAULT_CALENDAR;
const listeners = new Set<() => void>();
let persist: (c: CalendarSystem) => void = () => {};

/** Synchronous read of the in-memory store. */
export function getCalendarSystem(): CalendarSystem {
  return current;
}

/**
 * Update the store, notify subscribers (only when the value changed) and persist.
 * Persisting always runs, so choosing the default (e.g. BS in onboarding) is still stored.
 */
export function setCalendarSystem(next: CalendarSystem): void {
  if (next !== "bs" && next !== "ad") return;
  if (next !== current) {
    current = next;
    for (const listener of [...listeners]) listener();
  }
  try {
    persist(next);
  } catch {
    // Persistence is best-effort; the in-memory value is already updated.
  }
}

/** Called whenever the calendar system changes. Returns the unsubscribe. */
export function subscribeCalendarSystem(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Each app supplies how the choice is written to storage. */
export function configureCalendarPersistence(opts: { persist: (c: CalendarSystem) => void }): void {
  persist = opts.persist;
}

/** The civil era a calendar system shows by default. */
export function eraForCalendar(c: CalendarSystem): "bs" | "ad" {
  return c === "ad" ? "ad" : "bs";
}

/** bs/bbs → bs; ad/bc → ad. */
export function calendarForEra(era: Era): CalendarSystem {
  return era === "ad" || era === "bc" ? "ad" : "bs";
}
