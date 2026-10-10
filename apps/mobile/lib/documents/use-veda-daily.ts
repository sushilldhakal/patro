import { useEffect } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { DOCUMENTS_STALE_TIME, fetchVedaDaily, vedaDailyKeys } from "@/lib/documents/api";

/** Days fetched ahead so the card still has a mantra with no connection. */
const PREFETCH_DAYS = 6;

function addDays(dateAd: string, days: number): string {
  const [y, m, d] = dateAd.split("-").map(Number);
  const next = new Date(Date.UTC(y!, m! - 1, d! + days));
  return next.toISOString().slice(0, 10);
}

/**
 * The mantra for `dateAd`. The query cache is persisted (see the root layout),
 * so a mantra already seen is there offline; the next few days are fetched in
 * the background while there is a connection.
 */
export function useVedaDaily(dateAd: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: vedaDailyKeys.day(dateAd ?? ""),
    queryFn: () => fetchVedaDaily(dateAd!),
    enabled: Boolean(dateAd),
    staleTime: DOCUMENTS_STALE_TIME,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!dateAd || !query.data) return;
    for (let i = 1; i <= PREFETCH_DAYS; i += 1) {
      const next = addDays(dateAd, i);
      void queryClient.prefetchQuery({
        queryKey: vedaDailyKeys.day(next),
        queryFn: () => fetchVedaDaily(next),
        staleTime: DOCUMENTS_STALE_TIME,
      });
    }
  }, [dateAd, query.data, queryClient]);

  return query;
}
