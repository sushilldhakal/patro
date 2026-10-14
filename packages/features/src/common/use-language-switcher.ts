/**
 * The header's language toggle, shared by the website's and the app's
 * `components/LanguageSwitcher.tsx`: which language it switches to, and its
 * label, always naming that language in that language. Each app switches in
 * its own way (the website also stores the choice and loads the bundle).
 */
import { useLocale } from "@vedic-patro/i18n/react";

export function useLanguageSwitcher() {
  const { t, lang } = useLocale();
  const isNepali = lang !== "en";
  return {
    next: isNepali ? ("en" as const) : ("ne" as const),
    label: isNepali ? t("switch_to_english") : t("switch_to_nepali"),
  };
}
