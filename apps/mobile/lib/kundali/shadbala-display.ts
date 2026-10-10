/** Shared Shadbala display data — planet order, sub-bala rows, and the
 * bottom-to-top bala stack used by both the matrix table and the chart. */

import type { ShadbalaPlanet, YuddhaData } from "@/lib/api";

/** Classical display order for the seven tara grahas. */
export const SHADBALA_PLANET_ORDER = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
] as const;

export type ShadbalaPlanetKey = (typeof SHADBALA_PLANET_ORDER)[number];

/** Sub-bala rows: `key` indexes the API payload. */
export const STHANA_SUBS: { key: string; ne: string; en: string }[] = [
  { key: "uchcha", ne: "उच्च", en: "Uchcha" },
  { key: "saptavargaja", ne: "सप्त वर्गीय", en: "Sapta Vargiya" },
  { key: "oja_yugma", ne: "ओज युग्म", en: "Oja Yugma" },
  { key: "kendradi", ne: "केन्द्रादि", en: "Kendradi" },
  { key: "drekkana", ne: "द्रेक्काण", en: "Drekkana" },
];

export const KALA_SUBS: { key: string; ne: string; en: string }[] = [
  { key: "nathonnatha", ne: "नता उन्नत", en: "Nata Unnata" },
  { key: "paksha", ne: "पक्ष", en: "Paksha" },
  { key: "tribhaga", ne: "त्रि भाग", en: "Tri Bhaga" },
  { key: "varshadhipati", ne: "वर्षाधिपति", en: "Varshadhipati" },
  { key: "masadhipati", ne: "मासाधिपति", en: "Masadhipati" },
  { key: "varadhipati", ne: "वाराधिपति", en: "Varadhipati" },
  { key: "horadhipati", ne: "होराधिपति", en: "Horadhipati" },
  { key: "ayana", ne: "अयन", en: "Ayana" },
  { key: "yuddha", ne: "युद्ध", en: "Yuddha" },
];

export type BalaStackKey = "sthana" | "dig" | "kala" | "cheshta" | "naisargika" | "drik";

/** Bottom-to-top stack, coloured with the app brand palette (mirrors web's
 * --brand-* CSS custom properties as plain hex, since RN has no CSS vars). */
export const BALA_STACK: {
  key: BalaStackKey;
  breakdownKey: keyof ShadbalaPlanet["breakdown"];
  ne: string;
  en: string;
  color: string;
}[] = [
  { key: "sthana", breakdownKey: "sthana", ne: "स्थान", en: "Sthana", color: "#d97706" },
  { key: "dig", breakdownKey: "dig", ne: "दिशा", en: "Disha", color: "#2e7d32" },
  { key: "kala", breakdownKey: "kala", ne: "काल", en: "Kala", color: "#0b565a" },
  { key: "cheshta", breakdownKey: "cheshta", ne: "चेष्टा", en: "Chesta", color: "#c62828" },
  { key: "naisargika", breakdownKey: "naisargika", ne: "नैसर्गिक", en: "Naisargika", color: "#d4a017" },
  { key: "drik", breakdownKey: "drik", ne: "दृष्टि", en: "Drishti", color: "#e67e22" },
];

export function yuddhaVirupasForPlanet(planet: ShadbalaPlanet, yuddha: YuddhaData): number {
  const api = planet.sub_balas?.kala?.yuddha;
  if (api != null && api !== 0) return api;
  return yuddha.byPlanet[planet.key] ?? 0;
}

export function orderShadbalaPlanets(planets: ShadbalaPlanet[]): ShadbalaPlanet[] {
  return SHADBALA_PLANET_ORDER
    .map((key) => planets.find((planet) => planet.key === key))
    .filter((planet): planet is ShadbalaPlanet => planet != null);
}
