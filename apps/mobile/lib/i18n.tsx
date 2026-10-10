import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import en from "@/lib/translations/en.json";
import ne from "@/lib/translations/ne.json";
import {
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  setStoredLanguage,
  type AppLanguage,
} from "@/lib/language-storage";

export type { AppLanguage };

/**
 * Translation bundles generated from the web app's single bilingual catalogue
 * (dhakal-patro/src/i18n/strings.ts). Both apps read the same keys, so copy is
 * written once and cannot drift between platforms. Do not edit the JSON.
 */
const BUNDLES: Record<AppLanguage, unknown> = { ne, en };

export type TranslateVars = Record<string, string | number>;

function lookup(bundle: unknown, key: string): unknown {
  let node = bundle;
  for (const segment of key.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
}

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/**
 * Resolve a catalogue key, falling back to Nepali when a language is missing a
 * value and finally to the key itself, so a typo shows up as the key rather
 * than as blank space.
 */
function translate(lang: AppLanguage, key: string, vars?: TranslateVars): string {
  const value = lookup(BUNDLES[lang], key) ?? lookup(BUNDLES.ne, key);
  return typeof value === "string" ? interpolate(value, vars) : key;
}

/** Read a key that holds a list (the SEO FAQ blocks) rather than a string. */
export function translateList<T>(lang: AppLanguage, key: string): T[] {
  const value = lookup(BUNDLES[lang], key) ?? lookup(BUNDLES.ne, key);
  return Array.isArray(value) ? (value as T[]) : [];
}

type LocaleContextValue = {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  t: (key: string, vars?: TranslateVars) => string;
  pick: (ne: string, en: string) => string;
  digits: (value: string | number) => string;
  isEnglish: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const NEPALI_DIGITS: Record<string, string> = {
  "0": "०", "1": "१", "2": "२", "3": "३", "4": "४",
  "5": "५", "6": "६", "7": "७", "8": "८", "9": "९",
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>(DEFAULT_LANGUAGE);

  // Restore the saved choice on launch; until it arrives the app shows Nepali,
  // which is the default anyway.
  useEffect(() => {
    let active = true;
    void getStoredLanguage().then((stored) => {
      if (active && stored) setLangState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
    void setStoredLanguage(next);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      pick: (nepali, english) => (lang === "ne" ? nepali : english),
      digits: (v) =>
        lang === "ne"
          ? String(v).replace(/[0-9]/g, (d) => NEPALI_DIGITS[d] ?? d)
          : String(v),
      isEnglish: lang === "en",
    }),
    [lang, setLang],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** Mirrors react-i18next's shape so components can be shared with the web app. */
export function useTranslation() {
  const { t, lang } = useLocale();
  return { t, i18n: { language: lang } };
}
