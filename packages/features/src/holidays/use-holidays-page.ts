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
import type { Era } from "@vedic-patro/domain/calendar/era";
import { useLocale } from "@vedic-patro/i18n/react";
import { todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { spanText, useNowMs, type NowHeroView } from "../common/now-hero";
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
  /** The holiday (or festival) on today, else the next one, with a countdown. */
  hero?: NowHeroView;
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
    queryKey: holidayKeys.holidays(year, era, location, lang),
    queryFn: () => fetchHolidays(year, era, location, lang),
    staleTime: HOUR,
  });
  const festivalsQ = useQuery({
    queryKey: holidayKeys.festivals(year, era, undefined, location, lang),
    queryFn: () => fetchFestivals(year, { era, location, language: lang }),
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

  // Next one on the Nepal calendar: today's, else the first still to come.
  const nowMs = useNowMs();
  const hero = useMemo((): NowHeroView | undefined => {
    const source = (tab === "holidays" ? holidays : festivals) ?? [];
    const todayAd = todayAdStringInTimezone(new Date(nowMs), location?.timezone ?? "Asia/Kathmandu");
    const dated = source
      .map((item, i) => ({ item, row: toHolidayRow(item, lang, i), start: item.start_date ?? "", days: item.duration_days ?? 1 }))
      .filter((x) => x.start)
      .sort((a, b) => a.start.localeCompare(b.start));
    const endOf = (x: (typeof dated)[number]) => {
      const d = new Date(`${x.start}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + Math.max(1, x.days) - 1);
      return d.toISOString().slice(0, 10);
    };
    const at = dated.findIndex((x) => x.start <= todayAd && todayAd <= endOf(x));
    const ahead = dated.findIndex((x) => x.start > todayAd);
    const i = at >= 0 ? at : ahead;
    if (i < 0) return undefined;
    const cur = dated[i]!;
    const after = dated[i + 1];
    const on = at >= 0;
    const kind = tab === "holidays" ? "holiday" : "festival";
    const until = Date.parse(`${cur.start}T00:00:00+05:45`) - nowMs;
    return {
      eyebrow: t(on ? `now_hero.${kind}_today` : `now_hero.${kind}_next`),
      live: on,
      tone: cur.row.isPublic || tab === "holidays" ? "bad" : "good",
      title: cur.row.name,
      subtitle: cur.row.type !== "—" ? cur.row.type : undefined,
      foot: { left: cur.row.bsDate, right: on ? t("now_hero.today") : t("now_hero.in", { time: spanText(until, t, digits) }) },
      next: after ? { label: t("now_hero.then"), title: after.row.name, detail: after.row.bsDate } : undefined,
    };
  }, [tab, holidays, festivals, nowMs, location?.timezone, lang, t, digits]);

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
    hero,
    status: active.isError ? "error" : active.isLoading ? "loading" : "ready",
    gregorianRange: range?.start && range?.end ? { start: range.start, end: range.end } : undefined,
  };
}
