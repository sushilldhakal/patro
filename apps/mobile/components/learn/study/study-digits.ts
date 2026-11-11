import { useCallback } from "react";
import { useLanguage } from "@vedic-patro/i18n/react";
import { formatLocaleDigits } from "@vedic-patro/domain/locale";

/** Locale digits for a study's numbers — the website's `useLocaleDigits`. */
export function useLocaleDigits() {
  const lang = useLanguage();
  return useCallback((value: string | number) => formatLocaleDigits(value, lang), [lang]);
}
