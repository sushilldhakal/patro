/**
 * One birth chart from the API's /kundali/detail endpoint — panchanga,
 * divisional charts, yogas, dashas, balas — for a birth moment, a place and
 * an ayanamsha. The website's KundaliView and the app's profile page both
 * read their chart through this.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchKundaliDetail, kundaliDetailKeys, type LocationParams } from "@vedic-patro/api-client";
import type { AyanamshaMode } from "@vedic-patro/domain/astronomy/ayanamsha";
import type { InstantQuery } from "@vedic-patro/domain/calendar/instant-query";

/** A birth chart is fixed for one birth; the query key carries the engine version,
 * so a stored chart is reused (and kept offline) until the engine itself changes.
 * Every reopen used to refetch after 5 minutes. */
export const KUNDALI_CHART_STALE_TIME = Infinity;

export type KundaliChartStatus = "idle" | "loading" | "error" | "ready";

export function useKundaliChart(
  moment: InstantQuery | null | undefined,
  locationParams: LocationParams | undefined,
  ayanamshaMode: AyanamshaMode,
) {
  const query = useQuery({
    queryKey: moment
      ? kundaliDetailKeys.atTime(moment, locationParams, ayanamshaMode)
      : (["kundali", "detail", "idle"] as const),
    queryFn: () => fetchKundaliDetail(moment!, locationParams, { ayanamsha: ayanamshaMode }),
    enabled: Boolean(moment),
    staleTime: KUNDALI_CHART_STALE_TIME,
  });
  const status: KundaliChartStatus = !moment
    ? "idle"
    : query.isError && !query.data
      ? "error"
      : query.data
        ? "ready"
        : "loading";
  return { query, detail: query.data, status };
}
