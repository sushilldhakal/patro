/**
 * Pieces several page hooks share. Not a page: `check:shared` skips folders
 * that start with `_`.
 */
import { keepPreviousData, useQuery, type QueryKey, type UseQueryResult } from "@tanstack/react-query";
import type { LocationParams } from "@vedic-patro/api-client";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { useCalculationSystem, useLocale } from "@vedic-patro/i18n/react";

/** How long a year of patro data stays fresh — the same on every year page, in both apps. */
export const YEAR_DATA_STALE_TIME = 1000 * 60 * 60;

/** Where a year page is looking: which year, in which era, for which place. */
export type YearScope = { year: number; era: Era; location?: LocationParams };

/**
 * The query every year-browsed page uses: the era always goes to the API (a
 * page that dropped it fetched BS 2026 when the reader chose AD 2026), the
 * previous year stays on screen while the next loads, one cache lifetime.
 */
export function useYearData<T>(
  scope: YearScope,
  config: {
    queryKey: (year: number, location?: LocationParams, era?: Era) => QueryKey;
    queryFn: (year: number, location?: LocationParams, era?: Era) => Promise<T>;
    enabled?: boolean;
  },
): UseQueryResult<T> {
  return useQuery<T>({
    queryKey: config.queryKey(scope.year, scope.location, scope.era),
    queryFn: () => config.queryFn(scope.year, scope.location, scope.era),
    enabled: config.enabled ?? true,
    staleTime: YEAR_DATA_STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

export type PageStatus = "loading" | "error" | "ready";

/** One status for a page from its query: loading only until the first data, then the data stays. */
export function statusOf(query: { isLoading: boolean; isError: boolean; data?: unknown }): PageStatus {
  if (query.data !== undefined) return "ready";
  if (query.isError) return "error";
  return "loading";
}

/**
 * "Drik (modern)" / "Surya Siddhanta": the system the reader chose on Account,
 * named on every page whose days or times it computed. Reading it here also
 * re-renders the page when the choice changes, so its query keys (which read
 * the system) refetch.
 */
export function useCalculationBasisLabel(): string {
  const { t } = useLocale();
  const { system } = useCalculationSystem();
  return t(system === "surya_siddhanta" ? "calculation_system.surya_siddhanta" : "calculation_system.drik");
}
