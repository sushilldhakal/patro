/**
 * The era switch beside a year (BS and BBS, AD and BC), shared by both apps'
 * `components/patro-date/PatroYearEraToggle.tsx`: which era it switches to,
 * its short label and its accessible label. Null when the era has no pair.
 */
import { isPatroBrowseEraPair, togglePatroBrowseEra, type Era } from "@vedic-patro/domain/era";
import { patroEraShortLabel } from "@vedic-patro/domain/patro-era-label";
import { useLocale } from "@vedic-patro/i18n/react";

export function usePatroYearEraToggle(era: Era): { targetEra: Era; label: string; ariaLabel: string } | null {
  const { t, lang } = useLocale();
  if (!isPatroBrowseEraPair(era)) return null;
  const targetEra = togglePatroBrowseEra(era);
  if (targetEra == null) return null;
  const label = patroEraShortLabel(targetEra, lang);
  return {
    targetEra,
    label,
    ariaLabel: t("patro_date.switch_to_era", { era: label, defaultValue: `Switch to ${label}` }),
  };
}
