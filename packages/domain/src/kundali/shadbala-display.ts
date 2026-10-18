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

export const GRAHA_NAME_I18N: Record<string, string> = {
  sun: "kundali.graha_name_sun",
  moon: "kundali.graha_name_moon",
  mars: "kundali.graha_name_mars",
  mercury: "kundali.graha_name_mercury",
  jupiter: "kundali.graha_name_jupiter",
  venus: "kundali.graha_name_venus",
  saturn: "kundali.graha_name_saturn",
};
