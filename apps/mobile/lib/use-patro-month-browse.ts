import { useState } from "react";
import { adToBS, getCurrentBs } from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { clampBrowseYear } from "@vedic-patro/domain/patro-browse-range";
import { isValidBrowseYear } from "@vedic-patro/domain/patro-year-axis";
import { getCachedCalendarEraPreference } from "@/lib/patro-era-preference";
import { defaultEraForLanguage, patroBrowseTodayEra, type Era } from "@vedic-patro/domain/era";
import { shiftPatroBrowseMonth } from "@vedic-patro/domain/patro-year-browse-step";

function positiveInt(y: number): number {
  const t = Math.trunc(y);
  return t >= 1 ? t : 1;
}

function positiveMonth(m: number): number {
  const t = Math.trunc(m);
  if (t < 1) return 1;
  if (t > 12) return 12;
  return t;
}

function defaultMonthBrowseParts(era: Era): { year: number; month: number } {
  if (era === "bs" || era === "bbs") return getCurrentBs();
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

/** Month + year browse in the active era — syncs era/year/month when UI language changes (web parity). */
export function usePatroMonthBrowse() {
  const { lang } = useLocale();
  const baseEra = defaultEraForLanguage(lang);

  const [era, setEraState] = useState<Era>(() => getCachedCalendarEraPreference() ?? baseEra);
  const [year, setYearState] = useState(() => defaultMonthBrowseParts(era).year);
  const [month, setMonthState] = useState(() => defaultMonthBrowseParts(era).month);
  const [syncedLang, setSyncedLang] = useState(lang);

  if (lang !== syncedLang) {
    setSyncedLang(lang);
    const nextEra = defaultEraForLanguage(lang);
    setEraState(nextEra);
    const next = defaultMonthBrowseParts(nextEra);
    setYearState(next.year);
    setMonthState(next.month);
  }

  const setYear = (y: number) => {
    const n = positiveInt(y);
    if (!isValidBrowseYear(era, n)) return;
    setYearState(clampBrowseYear(era, n));
  };

  const setEra = (next: Era) => {
    setEraState(next);
    setYearState((y) => clampBrowseYear(next, y));
  };

  const setMonth = (m: number) => setMonthState(positiveMonth(m));

  const stepMonth = (delta: number) => {
    const next = shiftPatroBrowseMonth(era, year, month, delta);
    setYearState(next.year);
    setMonthState(next.month);
  };

  const goToday = (todayAd?: string) => {
    const targetEra = patroBrowseTodayEra(era);
    if (targetEra !== era) setEraState(targetEra);

    if (targetEra === "bs") {
      const bs = todayAd ? adToBS(new Date(`${todayAd}T12:00:00`)) : getCurrentBs();
      setYearState(bs.year);
      setMonthState(bs.month);
      return;
    }
    const d = todayAd ? new Date(`${todayAd}T12:00:00`) : new Date();
    if (targetEra === "ad" || targetEra === "bc") {
      setYearState(d.getFullYear());
      setMonthState(d.getMonth() + 1);
    }
  };

  return {
    era,
    year,
    month,
    setYear,
    setEra,
    setMonth,
    stepMonth,
    goToday,
  } as const;
}
