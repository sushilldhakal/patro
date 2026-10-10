import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { AYANAMSHA_MODES, type AyanamshaMode } from "@/shared/ayanamsha";

export const AYANAMSHA_STORAGE_KEY = "dhakalPatroAyanamshaMode";

function parseMode(raw: string | null): AyanamshaMode | null {
  if (!raw) return null;
  return AYANAMSHA_MODES.some((m) => m.id === raw) ? (raw as AyanamshaMode) : null;
}

export async function getStoredAyanamshaMode(): Promise<AyanamshaMode | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return null;
      return parseMode(localStorage.getItem(AYANAMSHA_STORAGE_KEY));
    }
    return parseMode(await SecureStore.getItemAsync(AYANAMSHA_STORAGE_KEY));
  } catch {
    return null;
  }
}

export async function setStoredAyanamshaMode(mode: AyanamshaMode): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(AYANAMSHA_STORAGE_KEY, mode);
      return;
    }
    await SecureStore.setItemAsync(AYANAMSHA_STORAGE_KEY, mode);
  } catch {
    // ignore persistence errors
  }
}
