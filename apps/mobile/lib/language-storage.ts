import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  parseStoredLanguage as parseLanguage,
  type Lang,
} from "@vedic-patro/domain/locale";

/** Same key, default and parsing as the website (shared in domain/locale). */
export { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY };

export type AppLanguage = Lang;

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
