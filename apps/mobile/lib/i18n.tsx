import { useEffect, type ReactNode } from "react";

import { setupI18n } from "@vedic-patro/i18n/setup";
import { setLanguage, translateList as translateListIn, type Lang } from "@vedic-patro/i18n/runtime";
import en from "@vedic-patro/i18n/en.json";
import ne from "@vedic-patro/i18n/ne.json";
import { configureCalendarPersistence } from "@vedic-patro/domain/calendar/calendar-system";
import { getStoredLanguage, setStoredLanguage, type AppLanguage } from "@/lib/language-storage";
import { setStoredCalendar } from "@/lib/calendar-system-storage";

export type { AppLanguage };

/**
 * The app uses the shared translator (@vedic-patro/i18n) — the same lookup,
 * `{{value}}` filling and fallbacks as the website. Both bundles ship in the
 * binary, so English is available at once.
 */
setupI18n({ bundles: { ne, en }, persist: (lang) => void setStoredLanguage(lang) });

/** The calendar system (BS/AD) is stored apart from the language and never follows it. */
configureCalendarPersistence({ persist: (c) => void setStoredCalendar(c) });

export { useLocale, useTranslation, useCalendarSystem } from "@vedic-patro/i18n/react";

/** Read a key that holds a list (the SEO FAQ blocks) rather than a string. */
export function translateList<T>(lang: AppLanguage, key: string): T[] {
  return translateListIn<T>(lang as Lang, key);
}

/** Restores the saved language on launch; until it arrives the app shows Nepali, the default anyway. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let active = true;
    void getStoredLanguage().then((stored) => {
      if (active && stored) void setLanguage(stored);
    });
    return () => {
      active = false;
    };
  }, []);
  return <>{children}</>;
}
