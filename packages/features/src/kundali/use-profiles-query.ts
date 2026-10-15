/**
 * The signed-in reader's saved birth profiles, one cache entry shared by every
 * page that lists or reads them (kundali hub and detail, kundali milan,
 * account). The apps' `lib/kundali/profiles-query.ts` re-export this.
 */
import { useQuery } from "@tanstack/react-query";
import { listProfiles, PROFILES_QUERY_KEY } from "@vedic-patro/api-client";

export { PROFILES_QUERY_KEY };

export const PROFILES_STALE_TIME = 1000 * 60 * 5;

export function useProfilesQuery(enabled = true) {
  return useQuery({
    queryKey: PROFILES_QUERY_KEY,
    queryFn: listProfiles,
    enabled,
    staleTime: PROFILES_STALE_TIME,
  });
}
