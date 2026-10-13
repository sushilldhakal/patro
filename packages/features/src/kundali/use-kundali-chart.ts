/**
 * One birth chart from the API's /kundali/detail endpoint — panchanga,
 * divisional charts, yogas, dashas, balas — for a birth moment, a place and
 * an ayanamsha. The website's KundaliView and the app's profile page both
 * read their chart through this.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchKundaliDetail, kundaliDetailKeys, type LocationParams } from "@vedic-patro/api-client";
import type { AyanamshaMode } from "@vedic-patro/domain/ayanamsha";
import type { InstantQuery } from "@vedic-patro/domain/instant-query";

export const KUNDALI_CHART_STALE_TIME = 1000 * 60 * 5;

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
