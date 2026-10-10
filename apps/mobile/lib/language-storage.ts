import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/** Matches the web app's i18next storage key so the two stay recognisable. */
export const LANGUAGE_STORAGE_KEY = "i18nextLng";

export type AppLanguage = "ne" | "en";

export const DEFAULT_LANGUAGE: AppLanguage = "ne";

function parseLanguage(raw: string | null): AppLanguage | null {
  if (!raw) return null;
  const code = raw.slice(0, 2);
  return code === "en" ? "en" : code === "ne" ? "ne" : null;
}

export async function getStoredLanguage(): Promise<AppLanguage | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return null;
      return parseLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    }
    return parseLanguage(await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export async function setStoredLanguage(language: AppLanguage): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      return;
    }
    await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // ignore persistence errors
  }
}
