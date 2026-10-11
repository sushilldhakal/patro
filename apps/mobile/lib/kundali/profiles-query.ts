import { useQuery } from "@tanstack/react-query";
import { listProfiles } from "@/lib/auth/client";

export { PROFILES_QUERY_KEY } from "@vedic-patro/api-client";
import { PROFILES_QUERY_KEY } from "@vedic-patro/api-client";

export function useProfilesQuery(enabled = true) {
  return useQuery({
    queryKey: PROFILES_QUERY_KEY,
    queryFn: listProfiles,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
