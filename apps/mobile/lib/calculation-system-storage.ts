import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  CALCULATION_SYSTEM_STORAGE_KEY,
  parseStoredCalculationSystem,
  setCalculationSystem,
  type CalculationSystem,
} from "@vedic-patro/domain/calendar/calculation-system";

/** The reader's drik / Surya Siddhanta choice, stored like the calendar system. */
export async function getStoredCalculationSystem(): Promise<CalculationSystem | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return null;
      return parseStoredCalculationSystem(localStorage.getItem(CALCULATION_SYSTEM_STORAGE_KEY));
    }
    return parseStoredCalculationSystem(await SecureStore.getItemAsync(CALCULATION_SYSTEM_STORAGE_KEY));
  } catch {
    return null;
  }
}

export async function setStoredCalculationSystem(system: CalculationSystem): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(CALCULATION_SYSTEM_STORAGE_KEY, system);
      return;
    }
    await SecureStore.setItemAsync(CALCULATION_SYSTEM_STORAGE_KEY, system);
  } catch {
    // ignore persistence errors
  }
}

/**
 * Loads the choice before the main app renders (app/_layout.tsx), so the very
 * first requests already carry it. Nothing stored means drik, the default.
 */
export async function loadCalculationSystemPreference(): Promise<void> {
  const stored = await getStoredCalculationSystem();
  if (stored) setCalculationSystem(stored);
}
