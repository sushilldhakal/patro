import { useCallback } from "react";
import { useTranslation } from "react-i18next";

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
  const { i18n: inst } = useTranslation();
  return useCallback(
    (value: string | number) => formatLocaleDigits(value, inst.language),
    [inst.language],
  );
}
