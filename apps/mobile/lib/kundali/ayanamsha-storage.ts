import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AyanamshaMode } from "@vedic-patro/domain/astronomy/ayanamsha";
import { AYANAMSHA_STORAGE_KEY, parseAyanamshaMode as parseMode } from "@vedic-patro/features/kundali";

export { AYANAMSHA_STORAGE_KEY };

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
