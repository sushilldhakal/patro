import { useQuery } from "@tanstack/react-query";
import { fetchPanchanga, type LocationParams } from "@vedic-patro/api-client";
import { buildDayTimePicks, type DayTimePicks } from "./day-time-picks";

const EMPTY: DayTimePicks = { shubh: [], ashubh: [], pushkara: [] };

/** The शुभ / अशुभ / पुष्कर times of `date` ("YYYY-MM-DD") at the chosen place, for the event form. */
export function useDayTimePicks(date: string, location: LocationParams, enabled = true) {
  const query = useQuery({
    queryKey: ["events", "day-picks", date, location.lat, location.lon, location.timezone, location.city_id],
    enabled,
    staleTime: 60 * 60_000,
    queryFn: () => fetchPanchanga(date, "ad", location),
  });
  return {
    picks: query.data ? buildDayTimePicks(query.data, date) : EMPTY,
    loading: query.isLoading && enabled,
    failed: query.isError,
  };
}
