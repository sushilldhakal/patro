import { fetchMonthCalendar, type LocationParams, type MonthBrowseEra, type MonthCalendar } from "@/lib/api";
import { isCurrentlyOnline } from "@/lib/offline/network-status";
import { getCachedYear, OfflineUnavailableError } from "@/lib/offline/offline-store";
import { yearWheelToMonthCalendar } from "@/lib/offline/year-wheel-adapter";

async function fromOfflineCache(year: number, month: number, location?: LocationParams): Promise<MonthCalendar | null> {
  const cachedYear = await getCachedYear(year, location);
  if (!cachedYear) return null;
  return yearWheelToMonthCalendar(cachedYear, month);
}

/**
 * Offline-aware drop-in for `fetchMonthCalendar`, for BS-era browsing only (the
 * bulk offline store is keyed by BS year — see `lib/offline/offline-store.ts`).
 * AD/BC/BBS browsing always goes straight to the network.
 *
 * Online: tries the live endpoint first (freshest data), falling back to the
 * offline cache only if that request fails. Offline: serves the cache
 * directly, or throws `OfflineUnavailableError` so the UI can show a "you're
 * offline" message instead of a generic fetch error.
 */
export async function fetchMonthCalendarOffline(
  year: number,
  month: number,
  location?: LocationParams,
  options?: { era?: MonthBrowseEra },
): Promise<MonthCalendar> {
  const era = options?.era ?? "bs";
  if (era !== "bs") return fetchMonthCalendar(year, month, location, options);

  const online = await isCurrentlyOnline();
  if (online) {
    try {
      return await fetchMonthCalendar(year, month, location, options);
    } catch (err) {
      const cached = await fromOfflineCache(year, month, location);
      if (cached) return cached;
      throw err;
    }
  }

  const cached = await fromOfflineCache(year, month, location);
  if (cached) return cached;
  throw new OfflineUnavailableError(year);
}
