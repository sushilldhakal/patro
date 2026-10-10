import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { formatLocaleDigits } from "@/i18n/digits";
import { normalizeLang, resolveActiveLang } from "@/i18n/locale";
import type { Language } from "@/lib/era";

/** Patro date nav: URL `language` overrides i18n for labels and digits. */
export function usePatroDisplayLocale(urlLanguage?: Language) {
  const { i18n: inst } = useTranslation();
  const baseLang = resolveActiveLang(inst.language, inst.resolvedLanguage);
  const lang = urlLanguage ? normalizeLang(urlLanguage) : baseLang;
  const digits = useCallback(
    (value: string | number | null | undefined): string =>
      value == null ? "" : formatLocaleDigits(value, lang),
    [lang],
  );
  return { lang, isEnglish: lang === "en", digits };
}
