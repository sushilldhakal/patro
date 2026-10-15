/**
 * Kundali copy — read from the shared catalogue (packages/i18n, `kundali.*`),
 * the same strings the website shows. This file used to hold its own copy of
 * them, kept in sync by hand.
 */
import en from "@vedic-patro/i18n/en.json";
import ne from "@vedic-patro/i18n/ne.json";

type KundaliCopy = typeof ne.kundali;

/** A `kundali.*` catalogue key whose value is a plain string. */
export type KundaliI18nKey = {
  [K in keyof KundaliCopy]: KundaliCopy[K] extends string ? K : never;
}[keyof KundaliCopy];

export function kundaliLabel(key: KundaliI18nKey, lang: "ne" | "en"): string {
  const value = (lang === "en" ? en : ne).kundali[key] as string | undefined;
  return value ?? (ne.kundali[key] as string);
}

export function kundaliLabelVars(
  key: KundaliI18nKey,
  lang: "ne" | "en",
  vars: Record<string, string | number>,
): string {
  let s = kundaliLabel(key, lang);
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
  }
  return s;
}

export function bilingualKundali(
  lang: "ne" | "en",
  ne: string,
  en: string,
): string {
  return lang === "en" ? en : ne;
}

export function formatChoghadiyaAtBirth(
  lang: "ne" | "en",
  row: { nameNe: string; nameEn?: string; quality: string },
): string {
  const name = lang === "en" ? row.nameEn ?? row.nameNe : row.nameNe;
  let qualityLabel = row.quality;
  if (row.quality === /* copy-ok */ "शुभ") qualityLabel = kundaliLabel("choghadiya_shubha", lang);
  else if (row.quality === /* copy-ok */ "अशुभ") qualityLabel = kundaliLabel("choghadiya_ashubha", lang);
  else if (row.quality === /* copy-ok */ "सामान्य") qualityLabel = kundaliLabel("choghadiya_samanya", lang);
  return `${name} (${qualityLabel})`;
}
