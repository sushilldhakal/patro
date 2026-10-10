import type { ShadbalaPlanet, YuddhaData } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { bilingualText, type Lang } from "@/i18n/locale";

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

/** Sub-bala rows: `key` indexes the API payload, `label` the string catalogue. */
export const STHANA_SUBS: { key: string; label: string }[] = [
  { key: "uchcha", label: "kundali.x.sthana_uchcha" },
  { key: "saptavargaja", label: "kundali.x.sthana_saptavargaja" },
  { key: "oja_yugma", label: "kundali.x.sthana_oja_yugma" },
  { key: "kendradi", label: "kundali.x.sthana_kendradi" },
  { key: "drekkana", label: "kundali.x.sthana_drekkana" },
];

export const KALA_SUBS: { key: string; label: string }[] = [
  { key: "nathonnatha", label: "kundali.x.kala_nathonnatha" },
  { key: "paksha", label: "sections.paksha" },
  { key: "tribhaga", label: "kundali.x.kala_tribhaga" },
  { key: "varshadhipati", label: "kundali.x.kala_varshadhipati" },
  { key: "masadhipati", label: "kundali.x.kala_masadhipati" },
  { key: "varadhipati", label: "kundali.x.kala_varadhipati" },
  { key: "horadhipati", label: "kundali.x.kala_horadhipati" },
  { key: "ayana", label: "kundali.ayana" },
  { key: "yuddha", label: "kundali.x.kala_yuddha" },
];

export type BalaStackKey = "sthana" | "dig" | "kala" | "cheshta" | "naisargika" | "drik";

/** Bottom-to-top stack, coloured with the app brand palette. */
export const BALA_STACK: {
  key: BalaStackKey;
  breakdownKey: keyof ShadbalaPlanet["breakdown"];
  label: string;
  color: string;
}[] = [
  { key: "sthana", breakdownKey: "sthana", label: "kundali.x.bala_sthana", color: "var(--brand-saffron)" },
  { key: "dig", breakdownKey: "dig", label: "kundali.disha", color: "var(--brand-green)" },
  { key: "kala", breakdownKey: "kala", label: "kundali.x.bala_kala", color: "var(--brand-blue)" },
  { key: "cheshta", breakdownKey: "cheshta", label: "kundali.x.bala_chesta", color: "var(--brand-vermilion)" },
  { key: "naisargika", breakdownKey: "naisargika", label: "kundali.x.bala_naisargika", color: "var(--brand-gold)" },
  { key: "drik", breakdownKey: "drik", label: "kundali.drishti", color: "var(--brand-saffron-bright)" },
];

export const GRAHA_NAME_I18N: Record<string, string> = {
  sun: "kundali.graha_name_sun",
  moon: "kundali.graha_name_moon",
  mars: "kundali.graha_name_mars",
  mercury: "kundali.graha_name_mercury",
  jupiter: "kundali.graha_name_jupiter",
  venus: "kundali.graha_name_venus",
  saturn: "kundali.graha_name_saturn",
};

export function grahaDisplayName(key: string, lang: Lang, planet?: ShadbalaPlanet): string {
  const graha = GRAHA_NAME[key as GrahaKey];
  if (graha) return bilingualText(lang, graha.ne, graha.en);
  if (planet) return bilingualText(lang, planet.name_ne, planet.name, key);
  return key;
}

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
