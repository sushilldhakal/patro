/**
 * Copy for the panchanga layout primitives, shared by the website's and the
 * app's `components/panchanga/PanchangaLayout.tsx`: section titles (a catalogue
 * key or a Nepali/English pair), field labels, the "until" suffix on an end
 * time and the not-available range. Each app draws the cards and rows.
 */
import { bilingualText } from "@vedic-patro/domain/locale";
import { rowLabel } from "@vedic-patro/domain/panchanga-layout";
import { useLocale } from "@vedic-patro/i18n/react";

export function usePanchangaLayoutCopy() {
  const { t, lang } = useLocale();
  return {
    sectionTitle: (titleKey?: string, titleNe?: string, titleEn?: string) =>
      titleKey ? t(titleKey) : bilingualText(lang, titleNe ?? titleEn ?? "", titleEn ?? titleNe ?? ""),
    fieldLabel: (labelKey?: string, label?: string) => rowLabel(labelKey, label, t),
    until: (endTime: string) => `${endTime} ${t("sections.until")}`,
    notAvailable: `${t("sections.dash")} ${t("sections.not_available")}`,
    range: (start: string, end: string) => `${start} → ${end}`,
  };
}
