/**
 * Language handling that is the same on the website and in the app.
 *
 * What differs is where the live language and the copy come from (i18next on the
 * web, a context + JSON catalogue in the app), so each app calls
 * `configureLocale` once at start-up and everything else here stays pure.
 */

export type Lang = "en" | "ne";

export type LocaleRuntime = {
  /** The app's current UI language code, used when a caller passes none. */
  currentLanguage: () => string | undefined;
  /** Catalogue lookup (`rashis.3`) in a given language; `undefined` when the key is missing. */
  translate: (key: string, lng: Lang) => string | undefined;
};

let runtime: LocaleRuntime = {
  currentLanguage: () => "ne",
  translate: () => undefined,
};

export function configureLocale(next: LocaleRuntime): void {
  runtime = next;
}

/**
 * Catalogue lookup in the given language (or the current one). A missing key
 * gives `fallback`, or the key itself when none is passed.
 */
export function translateKey(key: string, lang?: string, fallback?: string): string {
  return runtime.translate(key, normalizeLang(lang)) ?? fallback ?? key;
}

/** Normalize any i18n language code to the two supported UI languages. */
export function normalizeLang(lang?: string): Lang {
  return (lang ?? runtime.currentLanguage() ?? "ne").slice(0, 2) === "en" ? "en" : "ne";
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

const DEVANAGARI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"] as const;

/** Always converts 0-9 to Devanagari digits (ignores locale). */
export function toDevanagariDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => DEVANAGARI_DIGITS[Number(d)] ?? d);
}

export function usesDevanagariDigits(lang?: string): boolean {
  const code = (lang ?? runtime.currentLanguage())?.slice(0, 2) ?? "ne";
  return code === "ne";
}

/** Locale-aware: Devanagari for ne, Western for en. */
export function formatLocaleDigits(value: string | number, lang?: string): string {
  if (!usesDevanagariDigits(lang)) return String(value);
  return toDevanagariDigits(value);
}
