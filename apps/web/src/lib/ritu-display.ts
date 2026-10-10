import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTropicalSeasons, seasonsKeys } from "@/lib/api";
import {
  resolveLocationTimezone,
  type PanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";

export const RITU_SEASON_KEYS = [
  "spring",
  "summer",
  "monsoon",
  "autumn",
  "pre_winter",
  "winter",
] as const;

export type RituSeasonKey = (typeof RITU_SEASON_KEYS)[number];

export const RITU_SEASON_EMOJI: Record<RituSeasonKey, string> = {
  spring: "🌸",
  summer: "☀️",
  monsoon: "🌧️",
  autumn: "🍂",
  pre_winter: "🌫️",
  winter: "❄️",
};

export const RITU_MARKER_KEYS: Partial<Record<number, string>> = {
  0: "ritu.vernal_equinox",
  3: "ritu.autumnal_equinox",
};

export function displayRituSlot(solarSlot: number, southern: boolean): number {
  return southern ? (solarSlot + 3) % 6 : solarSlot;
}

export function rituSeasonKeyAtSlot(solarSlot: number, southern: boolean): RituSeasonKey {
  return RITU_SEASON_KEYS[displayRituSlot(solarSlot, southern)]!;
}

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
