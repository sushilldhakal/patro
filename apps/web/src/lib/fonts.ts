import { normalizeLang, type Lang } from "@/i18n/locale";
import { isBrowser } from "@/lib/browser";

/**
 * The app uses Noto Sans Devanagari for all text and numbers in Nepali, and
 * Fira Code for English numerals. There are no per-locale web fonts to load, so
 * this is a no-op kept for API compatibility.
 */
export function ensureLocaleFonts(_lang: string) {
  void _lang;
}

export function syncDocumentLang(lang: string): Lang {
  const code = normalizeLang(lang);
  if (isBrowser) {
    document.documentElement.lang = code;
  }
  return code;
}
