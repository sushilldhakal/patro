import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/** Matches web next-themes storage key. */
export const THEME_STORAGE_KEY = "theme";

export type ThemePreference = "system" | "light" | "dark";

const VALID: ThemePreference[] = ["system", "light", "dark"];

function parsePreference(raw: string | null): ThemePreference | null {
  if (!raw) return null;
  return VALID.includes(raw as ThemePreference) ? (raw as ThemePreference) : null;
}

export async function getStoredThemePreference(): Promise<ThemePreference | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return null;
      return parsePreference(localStorage.getItem(THEME_STORAGE_KEY));
    }
    return parsePreference(await SecureStore.getItemAsync(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export async function setStoredThemePreference(preference: ThemePreference): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
      return;
    }
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, preference);
  } catch {
    // ignore persistence errors
  }
}
