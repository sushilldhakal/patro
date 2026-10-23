import { useSyncExternalStore } from "react";
import { subscribeCalendarSystem } from "@vedic-patro/domain/calendar/calendar-system";
import { type CalendarEra, readCalendarEra } from "@/lib/patro-era";
import { CALENDAR_PREF_EVENT } from "@/lib/user-preferences";

function subscribe(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  const unsubscribe = subscribeCalendarSystem(handler);
  if (typeof window !== "undefined") {
    window.addEventListener(CALENDAR_PREF_EVENT, handler);
  }
  return () => {
    unsubscribe();
    if (typeof window !== "undefined") {
      window.removeEventListener(CALENDAR_PREF_EVENT, handler);
    }
  };
}

export function useCalendarEra(): CalendarEra {
  return useSyncExternalStore(subscribe, readCalendarEra, () => "bs");
}

/** True when the home grid should follow Gregorian month boundaries (1–28/31). */
export function useIsGregorianHomeCalendar(): boolean {
  return useCalendarEra() === "ad";
}
