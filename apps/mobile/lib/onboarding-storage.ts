import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { PatroBrowseEra } from "@/lib/patro-era";

const ONBOARDING_DONE_KEY = "onboardingCompleted";
const ONBOARDING_ERA_KEY = "onboardingCalendarEra";
const ONBOARDING_OFFLINE_KEY = "onboardingOfflineMode";

/** Only BS or AD is offered at onboarding — BBS/BC stay reachable from the in-page era toggle. */
export type OnboardingCalendarEra = Extract<PatroBrowseEra, "ad" | "bs">;
export type OnboardingDataMode = "offline" | "online";

async function readItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeItem(key: string, value: string): Promise<void> {
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

export async function isOnboardingComplete(): Promise<boolean> {
  return (await readItem(ONBOARDING_DONE_KEY)) === "1";
}

export async function setOnboardingComplete(): Promise<void> {
  await writeItem(ONBOARDING_DONE_KEY, "1");
}

export async function getStoredCalendarEraPreference(): Promise<OnboardingCalendarEra | null> {
  const raw = await readItem(ONBOARDING_ERA_KEY);
  return raw === "ad" || raw === "bs" ? raw : null;
}

export async function setStoredCalendarEraPreference(era: OnboardingCalendarEra): Promise<void> {
  await writeItem(ONBOARDING_ERA_KEY, era);
}

export async function getStoredDataMode(): Promise<OnboardingDataMode | null> {
  const raw = await readItem(ONBOARDING_OFFLINE_KEY);
  return raw === "offline" || raw === "online" ? raw : null;
}

export async function setStoredDataMode(mode: OnboardingDataMode): Promise<void> {
  await writeItem(ONBOARDING_OFFLINE_KEY, mode);
}
