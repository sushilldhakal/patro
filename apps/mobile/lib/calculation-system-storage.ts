import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { isOnboardingComplete } from "@/lib/onboarding-storage";

import {
  AYANAMSHA_STORAGE_KEY,
  CALCULATION_SYSTEM_STORAGE_KEY,
  LEGACY_CALCULATION_SYSTEM,
  parseStoredAyanamsha,
  parseStoredCalculationSystem,
  setAyanamsha,
  setCalculationSystem,
  type CalculationSystem,
} from "@vedic-patro/domain/calendar/calculation-system";
import type { AyanamshaMode } from "@vedic-patro/domain/astronomy/ayanamsha";

async function readStored(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeStored(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // ignore persistence errors
  }
}

/** The reader's drik / Surya Siddhanta choice, stored like the calendar system. */
export async function getStoredCalculationSystem(): Promise<CalculationSystem | null> {
  return parseStoredCalculationSystem(await readStored(CALCULATION_SYSTEM_STORAGE_KEY));
}

export function setStoredCalculationSystem(system: CalculationSystem): Promise<void> {
  return writeStored(CALCULATION_SYSTEM_STORAGE_KEY, system);
}

/** The reader's drik ayanamsha (Account and the kundali pages share it). */
export function setStoredAyanamsha(mode: AyanamshaMode): Promise<void> {
  return writeStored(AYANAMSHA_STORAGE_KEY, mode);
}

/**
 * Loads the calculation — system and ayanamsha — before the main app renders
 * (app/_layout.tsx) and in the background refresh, so the very first requests already
 * carry it. Nothing stored: a new install stays on the default (the Surya Siddhanta;
 * onboarding stores it), while a reader who finished onboarding before that default
 * keeps drik, stored now so it never changes under them.
 */
export async function loadCalculationSystemPreference(): Promise<void> {
  const [stored, ayanamsha, onboarded] = await Promise.all([
    getStoredCalculationSystem(),
    readStored(AYANAMSHA_STORAGE_KEY),
    isOnboardingComplete(),
  ]);
  if (stored) setCalculationSystem(stored);
  else if (onboarded) {
    setCalculationSystem(LEGACY_CALCULATION_SYSTEM);
    await setStoredCalculationSystem(LEGACY_CALCULATION_SYSTEM);
  }
  const mode = parseStoredAyanamsha(ayanamsha);
  if (mode) setAyanamsha(mode);
}
