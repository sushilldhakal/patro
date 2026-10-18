/**
 * The home page's day panel, shared by the website (`apps/web/src/pages/Home.tsx`)
 * and the app (`apps/mobile/app/(tabs)/index.tsx`): which day it shows (the
 * picked one; else today in the current month; else the month's first day),
 * its panchanga, whether that payload is for the day on screen, and copy.
 * Each app says how that day is requested.
 */
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery, type QueryKey } from "@tanstack/react-query";
import type { CalendarDay, PanchangaDay } from "@vedic-patro/api-client";
import { adToBS, bsToAdOrNull } from "@vedic-patro/domain/calendar/bs-calendar";
import { canonicalCivilIso, civilIsoFromDate } from "@vedic-patro/domain/calendar/patro-day";
import { useLocale } from "@vedic-patro/i18n/react";
import type { CalendarMonthContext } from "./use-home-month";

function monthStartAd(ctx: CalendarMonthContext): string {
  const inMonth = ctx.days.find((d) => !d.outsideMonth && d.day === 1) ?? ctx.days.find((d) => !d.outsideMonth);
  if (inMonth?.date_ad) return inMonth.date_ad;
  // BBS months have no offline mapping; hold today until their days arrive.
  return civilIsoFromDate(bsToAdOrNull(ctx.year, ctx.month, 1) ?? new Date());
}

/** True when `p` is the panchanga of the day the panel shows. */
export function panchangaMatchesDay(
  p: PanchangaDay | undefined,
  dayAd: string,
  ctx: CalendarMonthContext,
  contextDay: CalendarDay | null,
): boolean {
  if (!p) return false;
  const v = p.date_parts?.vikram;
  if (!ctx.isAdCalendar && contextDay && v?.year && v.month && v.day) {
    return v.year === ctx.year && v.month === ctx.month && v.day === contextDay.day;
  }
  const ad = canonicalCivilIso(dayAd);
  if (p.date_ad && canonicalCivilIso(p.date_ad) === ad) return true;
  if (p.panchanga_date_ad && canonicalCivilIso(p.panchanga_date_ad) === ad) return true;
  if (!ctx.isAdCalendar && contextDay && p.bs_date && typeof p.bs_date === "object") {
    return p.bs_date.year === ctx.year && p.bs_date.month === ctx.month && p.bs_date.day === contextDay.day;
  }
  return false;
}

export type HomeAsideTab = "panchanga" | "muhurta" | "sait";
export const HOME_ASIDE_TABS: readonly HomeAsideTab[] = ["panchanga", "sait", "muhurta"];

export function useHomeAside({
  context,
  todayAd,
  source,
}: {
  context: CalendarMonthContext;
  todayAd: string;
  /** How the panel's day is requested (`day` is the grid cell, when there is one). */
  source: (dayAd: string, day: CalendarDay | null) => { queryKey: QueryKey; queryFn: () => Promise<PanchangaDay> };
}) {
  const { t } = useLocale();
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [tab, setTab] = useState<HomeAsideTab>("panchanga");

  // Works for either grid: ask the month's days whether today is among them.
  const viewingCurrentMonth = useMemo(() => {
    if (context.days.length) return context.days.some((d) => d.date_ad === todayAd);
    const todayBs = adToBS(new Date(`${todayAd}T12:00:00`));
    return context.year === todayBs.year && context.month === todayBs.month;
  }, [context.days, context.year, context.month, todayAd]);

  const dayAd = selectedDay?.date_ad || (viewingCurrentMonth ? todayAd : monthStartAd(context));
  const contextDay = useMemo(
    () =>
      selectedDay ??
      context.days.find((d) => !d.outsideMonth && d.date_ad === dayAd) ??
      context.days.find((d) => !d.outsideMonth && d.day === 1) ??
      context.days.find((d) => !d.outsideMonth) ??
      null,
    [selectedDay, context.days, dayAd],
  );

  const request = source(dayAd, selectedDay);
  const query = useQuery({
    queryKey: request.queryKey,
    queryFn: request.queryFn,
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });
  const matches = panchangaMatchesDay(query.data, dayAd, context, contextDay);
  const p = matches ? query.data : undefined;
  const initialLoading = query.isLoading && !p;
  const isToday = dayAd === todayAd;

  return {
    selectedDay,
    /** Pick a day on the grid (null clears the pick); the panel opens on its first tab. */
    selectDay: (day: CalendarDay | null) => {
      setSelectedDay(day);
      setTab("panchanga");
    },
    dayAd,
    contextDay,
    viewingCurrentMonth,
    /** The grid's highlighted day: the pick, else today in the current month. */
    highlightAd: selectedDay?.date_ad ?? (viewingCurrentMonth ? todayAd : undefined),
    isToday,
    /** The panchanga of the day on screen (never another day's while the next loads). */
    p,
    initialLoading,
    loading: initialLoading || query.isFetching || (Boolean(query.data) && !matches),
    error: query.isError,
    retry: () => void query.refetch(),
    tab,
    setTab,
    tabs: HOME_ASIDE_TABS.map((id) => ({ id, label: t(`panchanga.tabs.${id}`), active: id === tab })),
    copy: {
      title: isToday ? t("panchanga.today_title") : t("panchanga.title"),
      fullDetail: `${t("panchanga.full_detail")} →`,
      tabsLabel: t("panchanga.tabs_label"),
      error: t("panchanga.error"),
      footerNote: t("footer_note"),
    },
  };
}

export type HomeAside = ReturnType<typeof useHomeAside>;
