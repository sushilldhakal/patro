import { useCallback, useState } from "react";
import { defaultClockForTimezone } from "@vedic-patro/domain/panchanga/panchanga-mode";
export { defaultClockForTimezone, formatClockParts } from "@vedic-patro/domain/panchanga/panchanga-mode";

export type PanchangaDataMode = "udaya" | "instant";

export function parseClockParts(clock: string): { hour: number; minute: number } {
  const [h, m] = clock.split(":");
  const hour = Number(h);
  const minute = Number(m);
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 0,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  };
}

/** 24h hour → 12h hour + meridiem, for AM/PM pickers. */
export function to12h(hour24: number): { hour12: number; meridiem: "AM" | "PM" } {
  const meridiem = hour24 < 12 ? "AM" : "PM";
  const base = hour24 % 12;
  return { hour12: base === 0 ? 12 : base, meridiem };
}

/** 12h hour + meridiem → 24h hour, for storing back into a "HH:MM" clock string. */
export function from12h(hour12: number, meridiem: "AM" | "PM"): number {
  const base = hour12 % 12;
  return meridiem === "AM" ? base : base + 12;
}

export function usePanchangaClock(
  defaultTimezone: string,
  initial?: { clock?: string },
) {
  const [clock, setClockState] = useState(
    () => initial?.clock ?? defaultClockForTimezone(defaultTimezone),
  );

  const setClock = useCallback((next: string) => {
    setClockState(next);
  }, []);

  return { clock, setClock };
}

/** @deprecated Use usePanchangaClock — mode toggle removed from panchanga page. */
export function usePanchangaMode(
  defaultTimezone: string,
  initial?: { mode?: PanchangaDataMode; clock?: string },
) {
  return usePanchangaClock(defaultTimezone, { clock: initial?.clock });
}
