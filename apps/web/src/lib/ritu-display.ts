import { useCurrentRitu as useCurrentRituAt } from "@vedic-patro/features/ritu";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";

export {
  RITU_MARKER_KEYS,
  RITU_SEASON_EMOJI,
  RITU_SEASON_KEYS,
  displayRituSlot,
  rituSeasonKeyAtSlot,
  type RituSeasonKey,
} from "@vedic-patro/domain/ritu-display";

/** The season right now at a place — shared logic in @vedic-patro/features/ritu. */
export function useCurrentRitu(location: PanchangaLocation) {
  return useCurrentRituAt(location.params);
}
