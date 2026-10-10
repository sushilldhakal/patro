import type { GrahaDignity, GrahaRelation } from "@/lib/api";

export type GrahaKey =
  | "sun"
  | "moon"
  | "mars"
  | "mercury"
  | "jupiter"
  | "venus"
  | "saturn"
  | "rahu"
  | "ketu";

export const GRAHA_DETAIL_ORDER: GrahaKey[] = [
  "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
];

export const GRAHA_NAME: Record<GrahaKey, { ne: string; en: string }> = {
  sun: { ne: "सूर्य", en: "Sun" },
  moon: { ne: "चन्द्र", en: "Moon" },
  mars: { ne: "मंगल", en: "Mars" },
  mercury: { ne: "बुध", en: "Mercury" },
  jupiter: { ne: "बृहस्पति", en: "Jupiter" },
  venus: { ne: "शुक्र", en: "Venus" },
  saturn: { ne: "शनि", en: "Saturn" },
  rahu: { ne: "राहु", en: "Rahu" },
  ketu: { ne: "केतु", en: "Ketu" },
};

/** One glyph per graha for list/card headers — not the generic "🪐" used
 * elsewhere for the graha category as a whole, which literally depicts
 * Saturn's rings and so is wrong when shown next to every other graha
 * (most visibly Rahu/Ketu, which aren't physical planets at all). Sun/moon
 * get their own real emoji; mars/mercury/jupiter/venus use their classical
 * Jyotish colours (red/green/yellow/white) as plain colour-circle emoji,
 * which render identically everywhere unlike the astrological planet
 * symbols (♂ ☿ ♃ ♀); Rahu/Ketu — the lunar nodes, not planets — get the
 * astronomically accurate ascending/descending-node arrows instead of a
 * planet glyph. */
export const GRAHA_ICON: Record<GrahaKey, string> = {
  sun: "☀️",
  moon: "🌙",
  mars: "🔴",
  mercury: "🟢",
  jupiter: "🟡",
  venus: "⚪",
  saturn: "🪐",
  rahu: "🔺",
  ketu: "🔻",
};

export const RELATION_LABELS: Record<GrahaRelation, { ne: string; en: string }> = {
  self: { ne: "स्वयं", en: "Self" },
  friend: { ne: "मित्र", en: "Friend" },
  enemy: { ne: "शत्रु", en: "Enemy" },
  neutral: { ne: "सम", en: "Neutral" },
};

export const DIGNITY_LABELS: Record<GrahaDignity, { ne: string; en: string }> = {
  exalted: { ne: "उच्च", en: "Exalted" },
  moolatrikona: { ne: "मूलत्रिकोण", en: "Moolatrikona" },
  own: { ne: "स्वगृह", en: "Own sign" },
  friend_house: { ne: "मित्र गृह", en: "Friend's sign" },
  neutral_house: { ne: "सम गृह", en: "Neutral sign" },
  enemy_house: { ne: "शत्रु गृह", en: "Enemy's sign" },
  debilitated: { ne: "नीच", en: "Debilitated" },
};

export const RASHI_EN_NAMES = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
] as const;
