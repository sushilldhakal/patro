/**
 * React bindings for the shared translator — the same hooks on the website and
 * in the app.
 *
 *   const { t } = useTranslation();          // t("holidays.title")
 *   const { lang, t, digits } = useLocale(); // + language, digits, setLang
 *   <Trans i18nKey="sun_times.ayana_body" components={{ north: <b /> }} />
 *
 * There is no provider: the language lives in `./runtime`, and every component
 * re-renders when it (or a bundle) changes. Server rendering always sees the
 * Nepali default, which is what a first visit shows too.
 */
import {
  cloneElement,
  Fragment,
  isValidElement,
  useMemo,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import { formatLocaleDigits } from "@vedic-patro/domain/locale";
import {
  ensureBundle,
  getLanguage,
  getStateKey,
  getRequestedLanguage,
  getT,
  hasBundle,
  setLanguage,
  subscribe,
  t as tCurrent,
  translateList,
  type Lang,
  type TFunction,
  type TranslateOptions,
} from "./runtime";

export type { Lang, TFunction, TranslateOptions };

/** The language the UI is in; re-renders the caller when it (or a loaded bundle) changes. */
export function useLanguage(): Lang {
  const state = useSyncExternalStore(subscribe, getStateKey, getStateKey);
  return state.slice(0, 2) as Lang;
}

// ─── i18next-shaped handle ──────────────────────────────────────────────────

type LanguageEvent = "languageChanged" | "loaded";
type LanguageListener = (lang: Lang) => void;
const wrapped = new Map<LanguageListener, () => void>();

/**
 * The handle `useTranslation().i18n` returns, shaped like i18next's so code
 * written against it keeps working: `language` is what the reader picked,
 * `resolvedLanguage` is what the UI shows (they differ only while English loads).
 */
export const i18n = {
  get language(): Lang {
    return getRequestedLanguage();
  },
  get resolvedLanguage(): Lang {
    return getLanguage();
  },
  t: tCurrent,
  changeLanguage: (code: string): Promise<void> => setLanguage(code),
  hasResourceBundle: (lang: string, _namespace?: string): boolean => hasBundle(lang === "en" ? "en" : "ne"),
  loadLanguage: (lang: Lang): Promise<void> => ensureBundle(lang),
  /** Both events fire on any language or bundle change; listeners get the picked language. */
  on(_event: LanguageEvent, listener: LanguageListener): void {
    if (wrapped.has(listener)) return;
    let last = `${getRequestedLanguage()}:${getLanguage()}`;
    wrapped.set(
      listener,
      subscribe(() => {
        const now = `${getRequestedLanguage()}:${getLanguage()}`;
        if (now === last) return;
        last = now;
        listener(getRequestedLanguage());
      }),
    );
  },
  off(_event: LanguageEvent, listener: LanguageListener): void {
    wrapped.get(listener)?.();
    wrapped.delete(listener);
  },
};

export type I18nHandle = typeof i18n;

/** `{ t, i18n }`, as react-i18next's hook returned. */
export function useTranslation(): { t: TFunction; i18n: I18nHandle; lang: Lang; ready: true } {
  const lang = useLanguage();
  return { t: getT(lang), i18n, lang, ready: true };
}

// ─── Locale helpers ─────────────────────────────────────────────────────────

export type Locale = {
  lang: Lang;
  isEnglish: boolean;
  t: TFunction;
  /** A key that holds a list (FAQ blocks). */
  tList: <T>(key: string) => T[];
  /**
   * Choose between two values the API (or data) already holds in both
   * languages. Not for copy: interface text goes in strings.ts and `t()`.
   */
  pick: <T>(ne: T, en: T) => T;
  /** Devanagari digits in Nepali, Western digits in English. */
  digits: (value: string | number | null | undefined) => string;
  /** Same as `digits`; kept for tabular-number call sites. */
  monoDigits: (value: string | number | null | undefined) => string;
  setLang: (lang: Lang) => Promise<void>;
};

export function useLocale(): Locale {
  const lang = useLanguage();
  return useMemo<Locale>(() => {
    const digits = (value: string | number | null | undefined) =>
      value == null ? "" : formatLocaleDigits(value, lang);
    return {
      lang,
      isEnglish: lang === "en",
      t: getT(lang),
      tList: <T,>(key: string) => translateList<T>(lang, key),
      pick: <T,>(ne: T, en: T) => (lang === "en" ? en : ne),
      digits,
      monoDigits: digits,
      setLang: setLanguage,
    };
  }, [lang]);
}

// ─── <Trans> ────────────────────────────────────────────────────────────────

const TAG = /<(\w+)>([\s\S]*?)<\/\1>/g;

/**
 * A translated string with markup: `<1>…</1>` or `<north>…</north>` in the copy
 * is drawn with the element passed under that name in `components`. Works on
 * both platforms (in the app, pass `<Text>` elements and put Trans inside a Text).
 */
export function Trans({
  i18nKey,
  values,
  components = {},
}: {
  i18nKey: string;
  values?: Record<string, unknown>;
  components?: Record<string, ReactElement> | ReactElement[];
}): ReactNode {
  const lang = useLanguage();
  const text = getT(lang)(i18nKey, values);
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TAG)) {
    const [whole, name, inner] = match;
    if (match.index > last) parts.push(text.slice(last, match.index));
    const element = (components as Record<string, ReactElement>)[name!];
    parts.push(
      isValidElement(element)
        ? cloneElement(element as ReactElement<{ children?: ReactNode }>, { key: parts.length }, inner)
        : inner,
    );
    last = match.index + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Fragment>{parts}</Fragment>;
}
