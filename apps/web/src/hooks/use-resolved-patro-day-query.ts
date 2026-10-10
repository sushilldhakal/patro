import { useEffect } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchPanchangaDay,
  panchangaKeys,
  type LocationParams,
} from "@/lib/api";
import type { PatroDayFetchState, ResolvedPatroDayFields } from "@/lib/patro-day-url";

type UseResolvedPatroDayQueryOptions = {
  enabled?: boolean;
  /** When false, skip picker/URL sync from the day payload (e.g. span-only element pages). */
  syncFromData?: boolean;
};

export function useResolvedPatroDayQuery(
  dayState: PatroDayFetchState,
  locationParams: LocationParams,
  sync: {
    syncPickerFromDateAd: (ad: string) => void;
    syncResolvedPatroDay: (fields: ResolvedPatroDayFields) => void;
  },
  options?: UseResolvedPatroDayQueryOptions,
) {
  const enabled = options?.enabled ?? true;
  const syncFromData = options?.syncFromData ?? true;

  const query = useQuery({
    queryKey: panchangaKeys.daySelection(dayState, locationParams),
    queryFn: () => fetchPanchangaDay(dayState, locationParams),
    enabled,
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!syncFromData) return;
    // `placeholderData: keepPreviousData` means `query.data` is still the
    // PREVIOUS day's payload while a new `dayState` key is in flight — same
    // object reference, so it doesn't retrigger this effect on its own. But
    // `sync.syncResolvedPatroDay` is re-created every time `dayState` changes
    // (it closes over `dayState`), so a fresh navigation *does* rerun this
    // effect, once, with that stale placeholder still sitting in `query.data`.
    // Syncing it back would echo the day just left as though it were the
    // answer for the day just requested, undoing the navigation before the
    // real fetch even lands (the "next" button needing 2–3 clicks). Wait for
    // the placeholder to be replaced by data that actually matches this key.
    if (query.isPlaceholderData) return;
    const data = query.data;
    if (!data) return;
    if (data.date_ad) sync.syncPickerFromDateAd(data.date_ad);
    sync.syncResolvedPatroDay({
      date_ad: data.date_ad,
      date_parts: data.date_parts,
      bs_date:
        data.bs_date && typeof data.bs_date === "object"
          ? {
              year: data.bs_date.year,
              month: data.bs_date.month,
              day: data.bs_date.day,
            }
          : undefined,
    });
    // `sync` itself is a fresh object every render (its callers rebuild it
    // inline); the two members actually read are listed instead so this only
    // reruns when one of them does, not on every render of the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    syncFromData,
    query.data,
    query.isPlaceholderData,
    sync.syncPickerFromDateAd,
    sync.syncResolvedPatroDay,
  ]);

  return query;
}
