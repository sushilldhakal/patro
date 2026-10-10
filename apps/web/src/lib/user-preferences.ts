import { getLocalStorageItem, setLocalStorageItem } from "@/lib/browser";

/** Matches i18next LanguageDetector / our LanguageBootstrap. */
export const LANG_STORAGE_KEY = "i18nextLng";

/** Matches next-themes default storage key. */
export const THEME_STORAGE_KEY = "theme";

export type StoredLang = "en" | "ne";

/** Read UI language preference. Default for new visitors is Nepali (no key). */
export function getStoredLanguage(): StoredLang | null {
  const raw = getLocalStorageItem(LANG_STORAGE_KEY);
  if (!raw) return null;
  const code = raw.slice(0, 2).toLowerCase();
  if (code === "en") return "en";
  if (code === "ne") return "ne";
  return null;
}

/** Persist UI language until the user switches again. */
export function setStoredLanguage(lang: StoredLang): void {
  setLocalStorageItem(LANG_STORAGE_KEY, lang);
}
