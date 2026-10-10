import { useCallback, useState } from "react";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/browser";

const CLOCK_KEY = "dhakalPatroPanchClock";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function defaultClockForTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour")?.value ?? "12";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return formatClockParts(Number(h) % 24, Number(m));
}

export function parseClockParts(clock: string): { hour: number; minute: number } {
  const [h, m] = clock.split(":");
  const hour = Number(h);
  const minute = Number(m);
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 0,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  };
}

export function formatClockParts(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
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
