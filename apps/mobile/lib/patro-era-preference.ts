import { getStoredCalendarEraPreference, type OnboardingCalendarEra } from "@/lib/onboarding-storage";

/**
 * The BS/AD choice made at onboarding, cached in memory so the month/year
 * browse hooks can read it synchronously as their initial state (they can't
 * await a storage read without either flashing the wrong era first or
 * delaying the very first render). `loadCalendarEraPreference` is awaited
 * once during app boot (see app/_layout.tsx) before the main app renders;
 * `setCachedCalendarEraPreference` updates it immediately when the onboarding
 * screen itself sets the choice, in the same session.
 */
let cached: OnboardingCalendarEra | null = null;

export async function loadCalendarEraPreference(): Promise<OnboardingCalendarEra | null> {
  cached = await getStoredCalendarEraPreference();
  return cached;
}

export function getCachedCalendarEraPreference(): OnboardingCalendarEra | null {
  return cached;
}

export function setCachedCalendarEraPreference(era: OnboardingCalendarEra): void {
  cached = era;
}
