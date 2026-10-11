import { useCallback, useState } from "react";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/browser";
import { defaultClockForTimezone, formatClockParts } from "@vedic-patro/domain/panchanga-mode";
export { defaultClockForTimezone, formatClockParts } from "@vedic-patro/domain/panchanga-mode";

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
    const raw = initial?.clock ?? getLocalStorageItem(CLOCK_KEY);
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
