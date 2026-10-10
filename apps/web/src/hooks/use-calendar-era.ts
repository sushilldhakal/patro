import { useSyncExternalStore } from "react";
import i18n from "@/i18n";
import { type CalendarEra, readCalendarEra } from "@/lib/patro-era";

function subscribe(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  i18n.on("languageChanged", handler);
  i18n.on("loaded", handler);
  if (typeof window !== "undefined") {
    window.addEventListener("patro-lang-pref", handler);
  }
  return () => {
    i18n.off("languageChanged", handler);
    i18n.off("loaded", handler);
    if (typeof window !== "undefined") {
      window.removeEventListener("patro-lang-pref", handler);
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
