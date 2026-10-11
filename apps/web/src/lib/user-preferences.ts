import { getLocalStorageItem, setLocalStorageItem } from "@/lib/browser";
import { LANGUAGE_STORAGE_KEY, parseStoredLanguage } from "@vedic-patro/domain/locale";

/** Matches i18next LanguageDetector / our LanguageBootstrap (same key in the app). */
export const LANG_STORAGE_KEY = LANGUAGE_STORAGE_KEY;

/** Matches next-themes default storage key. */
export const THEME_STORAGE_KEY = "theme";

export type StoredLang = "en" | "ne";

/** Read UI language preference. Default for new visitors is Nepali (no key). */
export function getStoredLanguage(): StoredLang | null {
  return parseStoredLanguage(getLocalStorageItem(LANG_STORAGE_KEY));
}

/** Persist UI language until the user switches again. */
export function setStoredLanguage(lang: StoredLang): void {
  setLocalStorageItem(LANG_STORAGE_KEY, lang);
}
