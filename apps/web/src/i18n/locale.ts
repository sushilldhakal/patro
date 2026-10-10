import { useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import i18n from "./index";
import { formatLocaleDigits } from "./digits";
import { getStoredLanguage } from "@/lib/user-preferences";
import { isBrowser } from "@/lib/browser";

export type Lang = "en" | "ne";

/** Normalize any i18n language code to the two supported UI languages. */
export function normalizeLang(lang?: string): Lang {
  return (lang ?? i18n.language ?? "ne").slice(0, 2) === "en" ? "en" : "ne";
}

/**
 * Active UI language — prefers resolvedLanguage and stored preference on client.
 *
 * English copy is code-split and loaded on demand, so `lng` can be "en" while
 * the bundle is still in flight. Reporting "en" during that window makes
 * `t()`/`bilingualText` hand back the Nepali fallback under an English label,
 * and any value memoized in that render stays Nepali for good. Until the
 * bundle is actually present the UI genuinely is Nepali, so say so.
 */
export function resolveActiveLang(i18nLang?: string, resolvedLang?: string): Lang {
  const wantsEnglish =
    normalizeLang(resolvedLang ?? i18nLang) === "en" ||
    (isBrowser && getStoredLanguage() === "en");
  if (!wantsEnglish) return "ne";
  return i18n.hasResourceBundle("en", "translation") ? "en" : "ne";
}

/** Pick the English or Nepali variant of a value based on the active language. */
export function pickLocale<T>(lang: string | undefined, ne: T, en: T): T {
  return normalizeLang(lang) === "en" ? en : ne;
}

/** Pick Nepali or English from optional bilingual API fields. */
export function bilingualText(
  lang: Lang | string | undefined,
  ne?: string | null,
  en?: string | null,
  fallback = "—",
): string {
  const l = normalizeLang(lang);
  const value = l === "en" ? (en ?? ne) : (ne ?? en);
  return value?.trim() ? value : fallback;
}

/** Bilingual JSX — picks ne or en React tree based on lang. */
export function bilingualNode(
  lang: Lang | string | undefined,
  ne: ReactNode,
  en: ReactNode,
): ReactNode {
  return normalizeLang(lang) === "en" ? en : ne;
}

/**
 * Hook returning the current UI language plus helpers to select localized text
 * and digits. Keeps components from hardcoding `.ne` everywhere.
 */
export function useLocale() {
  const { i18n: inst } = useTranslation();
  const lang = resolveActiveLang(inst.language, inst.resolvedLanguage);

  const digits = useCallback(
    (value: string | number | null | undefined): string =>
      value == null ? "" : formatLocaleDigits(value, lang),
    [lang],
  );

  const monoDigits = useCallback(
    (value: string | number | null | undefined): string =>
      value == null ? "" : formatLocaleDigits(value, lang),
    [lang],
  );

  return { lang, isEnglish: lang === "en", digits, monoDigits };
}
