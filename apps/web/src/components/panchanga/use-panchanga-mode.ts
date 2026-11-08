import { useCallback, useState } from "react";
import { setLocalStorageItem } from "@/lib/browser";
import { defaultClockForTimezone, formatClockParts } from "@vedic-patro/domain/panchanga/panchanga-mode";
export { defaultClockForTimezone, formatClockParts } from "@vedic-patro/domain/panchanga/panchanga-mode";

const CLOCK_KEY = "dhakalPatroPanchClock";

export function parseClockParts(clock: string): { hour: number; minute: number } {
  const [h, m] = clock.split(":");
  const hour = Number(h);
  const minute = Number(m);
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 0,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  };
}

export function usePanchangaClock(
  defaultTimezone: string,
  initial?: { clock?: string },
) {
  const [clock, setClockState] = useState(() => {
    // A link's ?time= wins; otherwise the place's time now, not a clock saved on an earlier visit.
    const raw = initial?.clock;
    if (raw) {
      const { hour, minute } = parseClockParts(raw);
      return formatClockParts(hour, minute);
    }
    return defaultClockForTimezone(defaultTimezone);
  });

  const setClock = useCallback((next: string) => {
    const { hour, minute } = parseClockParts(next);
    const normalized = formatClockParts(hour, minute);
    setClockState(normalized);
    setLocalStorageItem(CLOCK_KEY, normalized);
  }, []);

  return { clock, setClock };
}
