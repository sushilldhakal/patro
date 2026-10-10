import { useQuery } from "@tanstack/react-query";
import { listProfiles } from "@/lib/auth/client";

export const PROFILES_QUERY_KEY = ["profiles"] as const;

/** Shared profile list — warm cache on /kundali so /kundali/:id opens instantly. */
export function useProfilesQuery(enabled = true) {
  return useQuery({
    queryKey: PROFILES_QUERY_KEY,
    queryFn: listProfiles,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
