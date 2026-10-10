import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchSaitPersonalize,
  saitPersonalizeKey,
  type LocationParams,
  type SaitPersonalizeDay,
  type SaitSuitability,
} from "@/lib/api";
import type { Profile } from "@/lib/auth/client";
import { profileChartParams } from "@/lib/kundali/profile-chart";

/**
 * Native (profile-based) sait personalisation, shared by the vivah screen and
 * every /sait/<category> screen — the same wiring the web pages use.
 *
 * The profile supplies only the birth chart (janma Moon); the viewing location
 * stays whatever the user picked, since they may be planning from somewhere
 * other than their birth place.
 */
export function useSaitPersonalize(
  year: number,
  category: string,
  location: LocationParams | undefined,
) {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const birth = selectedProfile ? profileChartParams(selectedProfile) : null;
  const birthTz = selectedProfile?.timezone ?? "Asia/Kathmandu";
  const gender = selectedProfile?.gender ?? "";

  const query = useQuery({
    queryKey: saitPersonalizeKey(year, category, location, birth?.moment ?? null, birthTz, gender),
    queryFn: () =>
      fetchSaitPersonalize(year, category, location, birth!.moment, birthTz, gender),
    enabled: Boolean(category) && Boolean(selectedProfile) && Boolean(birth?.moment),
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  });

  const suitabilityByDay = useMemo(() => {
    const map = new Map<string, SaitSuitability>();
    for (const d of query.data?.days ?? []) {
      map.set(`${d.bs_month}-${d.bs_day}`, d.suitability);
    }
    return map;
  }, [query.data]);

  const personalizeByDay = useMemo(() => {
    const map = new Map<string, SaitPersonalizeDay>();
    for (const d of query.data?.days ?? []) {
      map.set(`${d.bs_month}-${d.bs_day}`, d);
    }
    return map;
  }, [query.data]);

  return {
    selectedProfile,
    setSelectedProfile,
    counts: query.data?.counts ?? null,
    /** Only overlay verdicts once a profile is actually chosen. */
    suitabilityByDay: selectedProfile ? suitabilityByDay : undefined,
    personalizeByDay: selectedProfile ? personalizeByDay : undefined,
    isLoading: query.isLoading,
  };
}
