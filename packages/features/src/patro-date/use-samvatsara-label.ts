/**
 * The name of the Samvatsara (the 60-year-cycle name, e.g. "रौद्र") of a
 * browsed year, shown after the year in the picker titles. Empty for
 * Gregorian eras and years the cycle does not cover.
 */
import type { Era } from "@vedic-patro/domain/era";
import { resolveSamvatsaraForPatroYear } from "@vedic-patro/domain/samvatsara";
import { isGregorianEraBrowse } from "@vedic-patro/domain/patro-month-labels";
import { useLocale } from "@vedic-patro/i18n/react";

export function useSamvatsaraLabel(era: Era, year: number): string {
  const { t, lang } = useLocale();
  if (isGregorianEraBrowse(era)) return "";
  const info = resolveSamvatsaraForPatroYear(era, year);
  if (!info) return "";
  return t(`samvatsara_names.${info.key}`, { defaultValue: lang === "en" ? info.name_en : info.name_ne });
}
