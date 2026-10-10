import type { NavigateOptions } from "@tanstack/react-router";
import {
  keepPreviousData,
  useQuery,
  type QueryKey,
  type UseQueryResult,
} from "@tanstack/react-query";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { usePatroYearUrlBrowse } from "@/hooks/use-patro-url-browse";
import type { LocationParams } from "@/lib/api";
import type { Era } from "@/lib/era";
import { useRouteLoading } from "@/lib/route-loading";
import { searchToLocation } from "@/lib/url-state";

type NavigateFn = (opts: NavigateOptions) => void;

export const PATRO_YEAR_DATA_STALE_TIME = 1000 * 60 * 60;

/** Location + year URL browse state shared by yearly patro data pages. */
export function usePatroYearDataPage(search: object, navigate: NavigateFn) {
  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));
  const yearBrowse = usePatroYearUrlBrowse(search, navigate, location, setLocation);
  return { location, setLocation, yearBrowse };
}

export type PatroYearDataPageContext = ReturnType<typeof usePatroYearDataPage> & {
  gregorianRange?: { start: string; end: string } | null;
};

interface PatroYearDataQueryConfig<TData> {
  queryKey: (year: number, location?: LocationParams, era?: Era) => QueryKey;
  queryFn: (year: number, location?: LocationParams, era?: Era) => Promise<TData>;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Shared React Query contract for year-browsed patro pages. Keep cache lifetime,
 * placeholder behavior, and route loading in one place so these pages do not
 * drift into subtly different loading/performance behavior.
 */
export function usePatroYearDataQuery<TData>(
  page: ReturnType<typeof usePatroYearDataPage>,
  config: PatroYearDataQueryConfig<TData>,
): UseQueryResult<TData> {
  const enabled = config.enabled ?? true;
  const query = useQuery<TData>({
    queryKey: config.queryKey(page.yearBrowse.year, page.location.params, page.yearBrowse.era),
    queryFn: () =>
      config.queryFn(page.yearBrowse.year, page.location.params, page.yearBrowse.era),
    enabled,
    staleTime: config.staleTime ?? PATRO_YEAR_DATA_STALE_TIME,
    placeholderData: keepPreviousData,
  });

  useRouteLoading(enabled && query.isLoading && !query.data);

  return query;
}
