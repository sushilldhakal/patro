import { useCallback } from "react";
import { useLanguage } from "@vedic-patro/i18n/react";

export { toDevanagariDigits, usesDevanagariDigits, formatLocaleDigits } from "@vedic-patro/domain/locale";
import { formatLocaleDigits } from "@vedic-patro/domain/locale";

/** Locale-aware digits for tabular number spans (`.font-num` / `.font-mono`). */
export function formatMonoDigits(
  value: string | number | null | undefined,
  lang?: string,
): string {
  if (value == null) return "";
  return formatLocaleDigits(value, lang);
}

export function useLocaleDigits() {
  const lang = useLanguage();
  return useCallback((value: string | number) => formatLocaleDigits(value, lang), [lang]);
}
