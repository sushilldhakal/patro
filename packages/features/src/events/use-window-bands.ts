import { useQueries } from "@tanstack/react-query";
import { fetchPanchanga, type LocationParams } from "@vedic-patro/api-client";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { buildDayTimePicks, type DayTimePick } from "./day-time-picks";

/** A शुभ or अशुभ muhurta clipped to one day's grid, in minutes from its midnight. */
export type WindowBand = { id: string; source: "shubh" | "ashubh"; nameNe: string; nameEn: string; startMin: number; endMin: number };

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** The part of a pick that falls on `date`, or null. A pick may begin the evening before or run past midnight. */
function clip(pick: DayTimePick, date: string): WindowBand | null {
  if (pick.source === "pushkara" || pick.startDate > date || pick.endDate < date) return null;
  const startMin = pick.startDate < date ? 0 : minutesOf(pick.startTime);
  const endMin = pick.endDate > date ? 1440 : minutesOf(pick.endTime);
  if (endMin <= startMin) return null;
  return { id: pick.id, source: pick.source, nameNe: pick.nameNe, nameEn: pick.nameEn, startMin, endMin };
}

/**
 * The शुभ and अशुभ muhurta bands of each of `dates` ("YYYY-MM-DD"), for the day and week grids. A panchanga
 * day runs from sunrise, so the small hours of a date belong to the day before: that one is read too.
 */
export function useWindowBands(dates: string[], location: LocationParams, enabled: boolean) {
  const needed = enabled && dates.length > 0 ? [shiftDate(dates[0]!, -1), ...dates] : [];
  const results = useQueries({
    queries: needed.map((date) => ({
      queryKey: ["events", "day-picks", date, location.lat, location.lon, location.timezone, location.city_id],
      staleTime: 60 * 60_000,
      queryFn: () => fetchPanchanga(date, "ad", location),
    })),
  });
  const picksByDay = new Map<string, DayTimePick[]>();
  needed.forEach((date, i) => {
    const p = results[i]?.data;
    if (p) {
      const built = buildDayTimePicks(p, date);
      picksByDay.set(date, [...built.shubh, ...built.ashubh]);
    }
  });
  const bands = new Map<string, WindowBand[]>();
  for (const date of dates) {
    const list = [...(picksByDay.get(shiftDate(date, -1)) ?? []), ...(picksByDay.get(date) ?? [])];
    bands.set(date, list.map((pick) => clip(pick, date)).filter((b): b is WindowBand => b != null));
  }
  return { bands, loading: results.some((r) => r.isLoading) };
}
