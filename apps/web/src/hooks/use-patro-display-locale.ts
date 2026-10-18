import { useCallback } from "react";
import { useLanguage } from "@vedic-patro/i18n/react";
import { formatLocaleDigits } from "@/i18n/digits";
import { normalizeLang } from "@/i18n/locale";
import type { Language } from "@vedic-patro/domain/calendar/era";

/** Patro date nav: URL `language` overrides i18n for labels and digits. */
export function usePatroDisplayLocale(urlLanguage?: Language) {
  const baseLang = useLanguage();
  const lang = urlLanguage ? normalizeLang(urlLanguage) : baseLang;
  const digits = useCallback(
    (value: string | number | null | undefined): string =>
      value == null ? "" : formatLocaleDigits(value, lang),
    [lang],
  );
  return { lang, isEnglish: lang === "en", digits };
}
