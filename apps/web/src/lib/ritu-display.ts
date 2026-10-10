import { RITU_SEASON_EMOJI, rituSeasonKeyAtSlot } from "@vedic-patro/domain/ritu-display";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTropicalSeasons, seasonsKeys } from "@/lib/api";
import {
  resolveLocationTimezone,
  type PanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";

export {
  RITU_MARKER_KEYS,
  RITU_SEASON_EMOJI,
  RITU_SEASON_KEYS,
  displayRituSlot,
  rituSeasonKeyAtSlot,
  type RituSeasonKey,
} from "@vedic-patro/domain/ritu-display";

export function useCurrentRitu(location: PanchangaLocation) {
  const tz = resolveLocationTimezone(location);

  const seasonsQ = useQuery({
    queryKey: seasonsKeys.tropical(location.params),
    queryFn: () => fetchTropicalSeasons(location.params),
    staleTime: 1000 * 60 * 60,
  });

  const south = seasonsQ.data?.southern_hemisphere ?? false;

  const current = useMemo(() => {
    const boundary = seasonsQ.data?.boundaries?.find((b) => b.is_current);
    if (!boundary) return null;
    const seasonKey = rituSeasonKeyAtSlot(boundary.slot, south);
    return {
      seasonKey,
      emoji: RITU_SEASON_EMOJI[seasonKey],
      solarSlot: boundary.slot,
      angle: boundary.angle,
    };
  }, [seasonsQ.data, south]);

  return {
    current,
    south,
    loading: seasonsQ.isLoading,
    timezone: tz,
  };
}
