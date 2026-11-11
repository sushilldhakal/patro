import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPanchanga, panchangaKeys } from "@/lib/api";
import { usePanchangaLocation, resolveLocationTimezone } from "@/lib/use-panchanga-location";
import { todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";

/** Today's whole panchanga for the chosen place, and its timezone — what the website's hora ring draws from. */
export function useTodayPanchanga() {
  const { location } = usePanchangaLocation();
  const timezone = resolveLocationTimezone(location);
  const todayAd = useMemo(() => todayAdStringInTimezone(new Date(), timezone), [timezone]);
  const query = useQuery({
    queryKey: panchangaKeys.day(todayAd, "ad", location.params),
    queryFn: () => fetchPanchanga(todayAd, "ad", location.params),
    staleTime: 1000 * 60 * 30,
  });
  return { p: query.data, timezone: query.data?.location?.timezone ?? timezone, loading: query.isLoading };
}
