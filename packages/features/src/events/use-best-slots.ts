import { useQueries } from "@tanstack/react-query";
import { fetchPanchanga, type LocationParams } from "@vedic-patro/api-client";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { bestTimeSlots, clipBestSlot, dayYogas, slotWindowsFromPicks, type BestSlot, type SlotSource } from "./best-time-slots";
import { buildDayTimePicks } from "./day-time-picks";

/**
 * The best-time placeholders of each of `dates` ("YYYY-MM-DD"), for the day and week grids.
 * The rules run on each panchanga day, then each slot is clipped onto the calendar dates it
 * touches, so a window that crosses midnight is decided once. The small hours of a date belong
 * to the day before, so that panchanga is read too.
 *
 * `location` is the place the page is showing (the URL's lat/lon/tz, or a picked city). It is part
 * of the query key, so a different place refetches.
 */
export function useBestSlots(dates: string[], location: LocationParams, enabled: boolean) {
  const needed = enabled && dates.length > 0 ? [shiftDate(dates[0]!, -1), ...dates] : [];
  const results = useQueries({
    queries: needed.map((date) => ({
      queryKey: ["events", "day-picks", date, location.lat, location.lon, location.timezone, location.city_id],
      staleTime: 60 * 60_000,
      queryFn: () => fetchPanchanga(date, "ad", location),
    })),
  });
  const resolved = new Map<string, BestSlot[]>();
  const windowsOf = new Map<string, ReturnType<typeof slotWindowsFromPicks>>();
  needed.forEach((date, i) => {
    const p = results[i]?.data;
    if (!p) return;
    const built = buildDayTimePicks(p, date);
    const windows = slotWindowsFromPicks([...built.shubh, ...built.ashubh], date);
    windowsOf.set(date, windows);
    resolved.set(date, bestTimeSlots(windows));
  });
  const slots = new Map<string, BestSlot[]>();
  for (const date of dates) {
    const prev = shiftDate(date, -1);
    const list = [
      ...(resolved.get(prev) ?? []).map((s) => clipBestSlot(s, prev, date)),
      ...(resolved.get(date) ?? []).map((s) => clipBestSlot(s, date, date)),
    ];
    slots.set(
      date,
      list.filter((s): s is BestSlot => s != null).sort((a, b) => a.startMin - b.startMin || a.intent.localeCompare(b.intent)),
    );
  }
  const yogas = new Map<string, SlotSource[]>();
  for (const date of dates) yogas.set(date, dayYogas(windowsOf.get(date) ?? []));
  return { slots, yogas, loading: results.some((r) => r.isLoading) };
}
