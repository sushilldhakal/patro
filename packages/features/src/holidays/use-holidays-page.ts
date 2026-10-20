/**
 * Holidays page logic, shared by the website (`apps/web/src/pages/Holidays.tsx`)
 * and the app (`apps/mobile/app/(tabs)/holidays.tsx`). The app chooses where the
 * year and era live (the URL on the website, screen state in the app) and draws
 * what this returns; everything else — which year/era is fetched, the cache
 * keys, the columns, row text, search, sort and copy — is decided here once.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchFestivals, fetchHolidays, holidayKeys, type LocationParams } from "@vedic-patro/api-client";
import type { Era } from "@vedic-patro/domain/era";
import { useLocale } from "@vedic-patro/i18n/react";
import {
  filterHolidayRows,
  HOLIDAY_COLUMNS,
  nextHolidaySort,
  sortHolidayRows,
  toHolidayRow,
  type HolidayColumn,
  type HolidayColumnKey,
  type HolidayRow,
  type HolidaySort,
  type HolidaysTab,
} from "./model";

export * from "./model";

const HOUR = 1000 * 60 * 60;

export type HolidaysPage = {
  copy: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    error: string;
    loading: string;
    empty: string;
    yes: string;
  };
  tabs: { id: HolidaysTab; label: string; count: number; countLabel: string; active: boolean }[];
  tab: HolidaysTab;
  setTab: (tab: HolidaysTab) => void;
  search: string;
  setSearch: (value: string) => void;
  columns: (HolidayColumn & { label: string; sorted: "asc" | "desc" | null })[];
  toggleSort: (key: HolidayColumnKey) => void;
  rows: HolidayRow[];
  status: "loading" | "error" | "ready";
  /** AD span of the BS year shown (for the year navigator). */
  gregorianRange?: { start: string; end: string };
};

export function useHolidaysPage({
  year,
  era,
  location,
}: {
  year: number;
  era: Era;
  /** Observer location: lunar festival dates follow it outside Nepal. */
  location?: LocationParams;
}): HolidaysPage {
  const { t, lang, digits } = useLocale();
  const [tab, setTab] = useState<HolidaysTab>("holidays");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<HolidaySort>(null);

  const holidaysQ = useQuery({
    queryKey: holidayKeys.holidays(year, era, location),
    queryFn: () => fetchHolidays(year, era, location),
    staleTime: HOUR,
  });
  const festivalsQ = useQuery({
    queryKey: holidayKeys.festivals(year, era, undefined, location),
    queryFn: () => fetchFestivals(year, { era, location }),
    staleTime: HOUR,
  });

  const active = tab === "holidays" ? holidaysQ : festivalsQ;
  const holidays = holidaysQ.data?.holidays;
  const festivals = festivalsQ.data?.festivals;

  const rows = useMemo(() => {
    const source = (tab === "holidays" ? holidays : festivals) ?? [];
    const all = source.map((item, i) => toHolidayRow(item, lang, i));
    return sortHolidayRows(filterHolidayRows(all, search), sort);
  }, [tab, holidays, festivals, lang, search, sort]);

  const range = active.data?.gregorian_range ?? holidaysQ.data?.gregorian_range ?? festivalsQ.data?.gregorian_range;

  const counts: Record<HolidaysTab, number> = { holidays: holidays?.length ?? 0, festivals: festivals?.length ?? 0 };

  return {
    copy: {
      title: t("holidays.page_title"),
      subtitle: t("holidays.page_subtitle"),
      searchPlaceholder: t("holidays.search_placeholder"),
      error: t("holidays.error"),
      loading: t("common.loading"),
      empty: t("common.no_results"),
      yes: t("common.yes"),
    },
    tabs: (["holidays", "festivals"] as const).map((id) => ({
      id,
      label: t(id === "holidays" ? "holidays.tab_holidays" : "holidays.tab_festivals"),
      count: counts[id],
      countLabel: digits(counts[id]),
      active: id === tab,
    })),
    tab,
    setTab,
    search,
    setSearch,
    columns: HOLIDAY_COLUMNS[tab].map((c) => ({
      ...c,
      label: t(c.labelKey),
      sorted: sort?.key === c.key ? sort.dir : null,
    })),
    toggleSort: (key) => setSort((s) => nextHolidaySort(s, key)),
    rows,
    status: active.isError ? "error" : active.isLoading ? "loading" : "ready",
    gregorianRange: range?.start && range?.end ? { start: range.start, end: range.end } : undefined,
  };
}
