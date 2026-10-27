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
  /* Harvest: the fog emoji drew as a white blob on Android. Hemanta is the dhan-harvest season. */
  pre_winter: "🌾",
  winter: "❄️",
};

/** Ritus are 60° arcs from 330°: the solstices open Varsha (slot 2) and Shishira (slot 5). */
export const RITU_MARKER_KEYS: Partial<Record<number, string>> = {
  2: "ritu.june_solstice",
  5: "ritu.december_solstice",
};

export function displayRituSlot(solarSlot: number, southern: boolean): number {
  return southern ? (solarSlot + 3) % 6 : solarSlot;
}

export function rituSeasonKeyAtSlot(solarSlot: number, southern: boolean): RituSeasonKey {
  return RITU_SEASON_KEYS[displayRituSlot(solarSlot, southern)]!;
}
