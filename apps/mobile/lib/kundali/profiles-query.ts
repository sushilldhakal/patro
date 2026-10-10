import { useQuery } from "@tanstack/react-query";
import { listProfiles } from "@/lib/auth/client";

export const PROFILES_QUERY_KEY = ["profiles"] as const;

export function useProfilesQuery(enabled = true) {
  return useQuery({
    queryKey: PROFILES_QUERY_KEY,
    queryFn: listProfiles,
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
