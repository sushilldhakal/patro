import { getLocalStorageItem, setLocalStorageItem } from "@/lib/browser";
import { LANGUAGE_STORAGE_KEY, parseStoredLanguage } from "@vedic-patro/domain/locale";
import {
  CALENDAR_STORAGE_KEY,
  DEFAULT_CALENDAR,
  configureCalendarPersistence,
  getCalendarSystem,
  parseStoredCalendar,
  setCalendarSystem,
  type CalendarSystem,
} from "@vedic-patro/domain/calendar/calendar-system";

/** Matches i18next LanguageDetector / our LanguageBootstrap (same key in the app). */
export const LANG_STORAGE_KEY = LANGUAGE_STORAGE_KEY;

/** Matches next-themes default storage key. */
export const THEME_STORAGE_KEY = "theme";

export type StoredLang = "en" | "ne";

/** Read UI language preference. Default for new visitors is Nepali (no key). */
export function getStoredLanguage(): StoredLang | null {
  return parseStoredLanguage(getLocalStorageItem(LANG_STORAGE_KEY));
}

/** Persist UI language until the user switches again. */
export function setStoredLanguage(lang: StoredLang): void {
  setLocalStorageItem(LANG_STORAGE_KEY, lang);
}

/** Window event fired when the calendar system changes (so non-store readers re-render). */
export const CALENDAR_PREF_EVENT = "patro-calendar-pref";

/** Read the stored calendar system (BS/AD), or null when never chosen. */
export function getStoredCalendar(): CalendarSystem | null {
  return parseStoredCalendar(getLocalStorageItem(CALENDAR_STORAGE_KEY));
}

/** Persist the calendar system until the user switches again. */
export function setStoredCalendar(calendar: CalendarSystem): void {
  setLocalStorageItem(CALENDAR_STORAGE_KEY, calendar);
}

let calendarPreferenceReady = false;

/**
 * Wire calendar persistence and load the stored value before first render.
 * Browser only; SSR/prerender keep DEFAULT_CALENDAR (bs).
 *
 * Migration: with nothing stored, a stored English language seeds "ad" (the old
 * English => AD behaviour) and persists it once; everyone else gets "bs".
 */
export function initCalendarPreference(): void {
  if (calendarPreferenceReady || typeof window === "undefined") return;
  calendarPreferenceReady = true;
  configureCalendarPersistence({
    persist: (calendar) => {
      setStoredCalendar(calendar);
      window.dispatchEvent(new Event(CALENDAR_PREF_EVENT));
    },
  });
  let initial = getStoredCalendar();
  if (initial == null) {
    initial = getStoredLanguage() === "en" ? "ad" : DEFAULT_CALENDAR;
    setStoredCalendar(initial);
  }
  if (initial !== getCalendarSystem()) setCalendarSystem(initial);
}
