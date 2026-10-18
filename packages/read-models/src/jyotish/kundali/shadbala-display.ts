import type { ShadbalaPlanet, YuddhaData } from "@vedic-patro/api-client";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { bilingualText, type Lang } from "@vedic-patro/domain/locale";
import { type BalaStackKey, SHADBALA_PLANET_ORDER } from "@vedic-patro/domain/jyotish/kundali/shadbala-display";

export * from "@vedic-patro/domain/jyotish/kundali/shadbala-display";

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
