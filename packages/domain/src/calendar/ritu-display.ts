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
