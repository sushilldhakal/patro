import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  CALENDAR_STORAGE_KEY,
  DEFAULT_CALENDAR,
  calendarForEra,
  getCalendarSystem,
  parseStoredCalendar,
  setCalendarSystem,
  type CalendarSystem,
} from "@vedic-patro/domain/calendar/calendar-system";
import { getStoredLanguage } from "@/lib/language-storage";
import { getStoredCalendarEraPreference } from "@/lib/onboarding-storage";

export { CALENDAR_STORAGE_KEY, DEFAULT_CALENDAR };

/** Same key and parsing as the website (shared in domain/calendar/calendar-system). */
export async function getStoredCalendar(): Promise<CalendarSystem | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return null;
      return parseStoredCalendar(localStorage.getItem(CALENDAR_STORAGE_KEY));
    }
    return parseStoredCalendar(await SecureStore.getItemAsync(CALENDAR_STORAGE_KEY));
  } catch {
    return null;
  }
}

export async function setStoredCalendar(calendar: CalendarSystem): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(CALENDAR_STORAGE_KEY, calendar);
      return;
    }
    await SecureStore.setItemAsync(CALENDAR_STORAGE_KEY, calendar);
  } catch {
    // ignore persistence errors
  }
}

/**
 * Loads the calendar system into the in-memory store before the main app renders
 * (see app/_layout.tsx), so the browse hooks can read it synchronously.
 *
 * One-time migration: before the calendar became its own preference, English meant
 * AD and Nepali meant BS (language changes overwrote the onboarding BS/AD choice).
 * When no `calendarSystem` is stored yet:
 *   - stored language "en"            → "ad" (what those users were seeing)
 *   - otherwise the legacy onboarding era (`onboardingCalendarEra`) if present
 *   - otherwise "bs"
 * The result is persisted at once (via setCalendarSystem → the persist hook), so
 * the migration never runs again. The legacy key is left in place, readable.
 */
export async function loadCalendarSystemPreference(): Promise<CalendarSystem> {
  const stored = await getStoredCalendar();
  if (stored) {
    setCalendarSystem(stored);
    return stored;
  }
  const [language, legacyEra] = await Promise.all([getStoredLanguage(), getStoredCalendarEraPreference()]);
  const migrated: CalendarSystem =
    language === "en" ? "ad" : legacyEra ? calendarForEra(legacyEra) : DEFAULT_CALENDAR;
  setCalendarSystem(migrated);
  // setCalendarSystem persists through the hook; write directly too in case the hook is not wired yet.
  await setStoredCalendar(migrated);
  return getCalendarSystem();
}
