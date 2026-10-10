import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import {
  fetchPanchangaDay,
  fetchSaitMonthAll,
  panchangaKeys,
  saitMonthAllKey,
  type CalendarDay,
  type PanchangaDay,
} from "../lib/api";
import { CalendarView, loadHomePatroView, type CalendarMonthContext, type HomePatroView, HOME_PATRO_VIEW_KEY } from "../components/CalendarView";
import { AakashGocharEntryCard } from "@/components/sky3d/AakashGocharEntryCard";
import { useRouteLoading } from "@/lib/route-loading";
import { setLocalStorageItem } from "@/lib/browser";
import {
  resolveLocationTimezone,
  usePanchangaLocation,
  type PanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";
import { todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { adToBS, bsToAdOrNull, getCurrentBs } from "@vedic-patro/domain/bs-calendar";
import { cn } from "@/lib/utils";
import { patroAsideLink, patroAsideTab } from "@/lib/patro-classes";
import { canonicalCivilIso, parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";
import { getLanguageForEra } from "@/lib/era";
import {
  patroDayFetchFromApiDateAd,
  patroDayFetchFromBrowseGridParts,
  type PatroDayFetchState,
} from "@/lib/patro-day-url";
import {
  ASIDE_TAB_IDS,
  PanchangaAsideTabPanel,
  type AsideTabId,
} from "@/components/home/PanchangaAsideTabs";
import { prefetchAsidePanels } from "@/components/home/aside-prefetch";
import { HomeVedaMantra } from "@/components/home/HomeVedaMantra";
import { HomeQuickLinks } from "@/components/home/HomeQuickLinks";
import { TodayHighlightCard } from "@/components/home/TodayHighlightCard";
import { HomeRashifalTeaser } from "@/components/home/HomeRashifalTeaser";
import { PanchangaDirectory } from "@/components/panchanga/PanchangaDirectory";
import { Button } from "@/components/ui/button";
import { usePatroMonthUrlBrowse } from "@/hooks/use-patro-url-browse";
import { currentPatroDayLinkSearch } from "@/lib/url-state";
import { smoothScrollToElement } from "@/lib/scroll";

const ASIDE_SIDEBAR_MQ = "(min-width: 1280px)";
const PANCHANGA_SCROLL_OFFSET = 72; // sticky header (h-16) + small gap

const routeApi = getRouteApi("/");

function fmtAdIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthStartAdDate(ctx: CalendarMonthContext): string {
  const inMonth =
    ctx.days.find((d) => !d.outsideMonth && d.day === 1) ??
    ctx.days.find((d) => !d.outsideMonth);
  if (inMonth?.date_ad) return inMonth.date_ad;
  // BBS months have no offline mapping — their days come from the API. Hold today
  // until they arrive instead of throwing out of the whole Home tree.
  const ad = bsToAdOrNull(ctx.year, ctx.month, 1);
  return fmtAdIso(ad ?? new Date());
}

function panchangaMatchesAside(
  p: PanchangaDay | undefined,
  asideAdDate: string,
  ctx: CalendarMonthContext,
  contextDay: CalendarDay | null,
): boolean {
  if (!p) return false;
  const v = p.date_parts?.vikram;
  if (!ctx.isAdCalendar && contextDay && v?.year && v.month && v.day) {
    return v.year === ctx.year && v.month === ctx.month && v.day === contextDay.day;
  }
  const ad = canonicalCivilIso(asideAdDate);
  if (p.date_ad && canonicalCivilIso(p.date_ad) === ad) return true;
  if (p.panchanga_date_ad && canonicalCivilIso(p.panchanga_date_ad) === ad) return true;
  if (!ctx.isAdCalendar && contextDay && p.bs_date && typeof p.bs_date === "object") {
    return (
      p.bs_date.year === ctx.year &&
      p.bs_date.month === ctx.month &&
      p.bs_date.day === contextDay.day
    );
  }
  if (
    !ctx.isAdCalendar &&
    contextDay &&
    v?.year === ctx.year &&
    v.month === ctx.month &&
    v.day === contextDay.day
  ) {
    return true;
  }
  return false;
}

const PanchangaAside = forwardRef(function PanchangaAside(
  {
    selectedDay,
    selectedAdDate,
    todayAd,
    monthContext,
    location,
    p,
    loading,
    error,
  }: {
    selectedDay: CalendarDay | null;
    selectedAdDate: string;
    todayAd: string;
    monthContext: CalendarMonthContext;
    location: PanchangaLocation;
    p?: PanchangaDay;
    /** True while the panchanga for the selected date/location is in flight. */
    loading: boolean;
    error: boolean;
  },
  ref: React.ForwardedRef<HTMLElement>,
) {
  const { t } = useTranslation();
  const [asideTab, setAsideTab] = useState<AsideTabId>("panchanga");

  const contextDay =
    selectedDay ??
    monthContext.days.find((d) => !d.outsideMonth && d.date_ad === selectedAdDate) ??
    monthContext.days.find((d) => !d.outsideMonth && d.day === 1) ??
    monthContext.days.find((d) => !d.outsideMonth) ??
    null;
  const pMatches = panchangaMatchesAside(p, selectedAdDate, monthContext, contextDay);
  const activeP = pMatches ? p : undefined;

  const isSelectedToday = selectedAdDate === todayAd;

  return (
    <aside
      ref={ref}
      id="home-panchanga-aside"
      className="scroll-mt-[4.5rem] flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="flex items-baseline gap-2.5 border-b border-border px-4 py-3.5">
        <h2 className="m-0 flex-1 text-lg font-bold">
          {isSelectedToday ? t("panchanga.today_title") : t("panchanga.title")}
        </h2>
        <Link
          to="/panchanga"
          search={currentPatroDayLinkSearch(location, selectedAdDate)}
          className={patroAsideLink}
        >
          {t("panchanga.full_detail")} →
        </Link>
      </div>

      <TodayHighlightCard
        selectedDay={contextDay}
        selectedAdDate={selectedAdDate}
        todayAd={todayAd}
        monthContext={monthContext}
        p={activeP}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card">

            <div
              className="grid shrink-0 grid-cols-3 border-b border-border bg-surface-muted"
              role="tablist"
              aria-label={t("panchanga.tabs_label")}
            >
              {ASIDE_TAB_IDS.map((id) => (
                <Button
                  key={id}
                  role="tab"
                  variant="ghost"
                  size="sm"
                  className={cn(patroAsideTab(id === asideTab), "h-auto w-full rounded-none p-0")}
                  aria-selected={id === asideTab}
                  onClick={() => setAsideTab(id)}
                >
                  {t(`panchanga.tabs.${id}`)}
                </Button>
              ))}
            </div>

            <div
              className="min-h-[12rem] flex-1 to-card p-3 max-md:p-3"
              role="tabpanel"
            >
              {error && !activeP ? (
                <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 rounded-xl bg-error-surface px-4 py-6 text-center">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-danger/10 text-sm font-bold text-danger">
                    !
                  </span>
                  <p className="m-0 text-sm leading-relaxed text-danger">
                    {t("panchanga.error")}
                  </p>
                </div>
              ) : (
                <div className="animate-in fade-in-0 duration-200">
                  <PanchangaAsideTabPanel
                    tab={asideTab}
                    p={activeP}
                    selectedDay={contextDay}
                    selectedAdDate={selectedAdDate}
                    location={location}
                    bsYear={monthContext.year}
                    bsMonth={monthContext.month}
                    adYear={monthContext.isAdCalendar ? monthContext.adYear : undefined}
                    adMonth={monthContext.isAdCalendar ? monthContext.adMonth : undefined}
                    loading={loading}
                  />
                </div>
              )}
            </div>
      </div>
    </aside>
  );
});

export function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/" });
  const search = routeApi.useSearch();
  const { location, setLocation } = usePanchangaLocation();
  const monthBrowse = usePatroMonthUrlBrowse(search, navigate, location, setLocation);
  const { year: bsYear, month: bsMonth } = getCurrentBs();
  const todayAd = useMemo(
    () => todayAdStringInTimezone(new Date(), resolveLocationTimezone(location)),
    [location],
  );
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const panchangaAsideRef = useRef<HTMLElement>(null);
  const scrollToPanchangaRef = useRef(false);

  const handleDaySelect = useCallback((day: CalendarDay | null) => {
    setSelectedDay(day);
    if (
      day &&
      typeof window !== "undefined" &&
      !window.matchMedia(ASIDE_SIDEBAR_MQ).matches
    ) {
      scrollToPanchangaRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!scrollToPanchangaRef.current || !selectedDay) return;
    scrollToPanchangaRef.current = false;
    const el = panchangaAsideRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      smoothScrollToElement(el, {
        duration: 400,
        offset: PANCHANGA_SCROLL_OFFSET,
      });
    });
  }, [selectedDay]);
  const [patroView, setPatroView] = useState<HomePatroView>(loadHomePatroView);
  const [monthContext, setMonthContext] = useState<CalendarMonthContext>(() => {
    const today = new Date();
    return {
      year: bsYear,
      month: bsMonth,
      days: [],
      adYear: today.getFullYear(),
      adMonth: today.getMonth() + 1,
      isAdCalendar: false,
    };
  });
  const handleMonthContextChange = useCallback((ctx: CalendarMonthContext) => {
    setMonthContext((prev) =>
      prev.year === ctx.year && prev.month === ctx.month && prev.days === ctx.days ? prev : ctx,
    );
  }, []);
  const monthStartAd = useMemo(() => monthStartAdDate(monthContext), [monthContext]);
  // Works for either grid: in Gregorian mode the BS month of the displayed
  // month never matches today's BS month, so ask the days themselves.
  const viewingCurrentMonth = useMemo(() => {
    if (monthContext.days.length) {
      return monthContext.days.some((d) => d.date_ad === todayAd);
    }
    const todayBs = adToBS(new Date(`${todayAd}T12:00:00`));
    return monthContext.year === todayBs.year && monthContext.month === todayBs.month;
  }, [monthContext.days, monthContext.year, monthContext.month, todayAd]);
  const asideAdDate = useMemo(() => {
    if (selectedDay?.date_ad) return selectedDay.date_ad;
    if (viewingCurrentMonth) return todayAd;
    return monthStartAd;
  }, [selectedDay, viewingCurrentMonth, todayAd, monthStartAd]);

  const { era: browseEra, year: browseYear, month: browseMonth } = monthBrowse;
  const asideDayState = useMemo((): PatroDayFetchState => {
    const display = {
      era: browseEra,
      language: getLanguageForEra(browseEra),
    };

    if (selectedDay?.date_ad) {
      return patroDayFetchFromApiDateAd(selectedDay.date_ad, display);
    }

    // While the month grid is empty or still fetching, the old logic fell back to
    // day 1 in the browsed month — so the aside fetched e.g. 2083/4/1 while
    // asideAdDate was still today, pMatches failed, and the panel showed "—".
    if (!monthContext.isAdCalendar && monthContext.year && monthContext.month && asideAdDate) {
      try {
        const bs = adToBS(parseCivilIsoToDate(asideAdDate));
        if (bs.year === monthContext.year && bs.month === monthContext.month) {
          return patroDayFetchFromBrowseGridParts(
            { year: bs.year, month: bs.month, day: bs.day },
            display,
          );
        }
      } catch {
        /* use civil date below */
      }
    }

    const cell =
      monthContext.days.find((d) => !d.outsideMonth && d.date_ad === asideAdDate) ??
      monthContext.days.find((d) => !d.outsideMonth && d.day === 1) ??
      null;
    if (
      !monthContext.isAdCalendar &&
      monthContext.year &&
      monthContext.month &&
      cell &&
      !cell.outsideMonth
    ) {
      return patroDayFetchFromBrowseGridParts(
        { year: monthContext.year, month: monthContext.month, day: cell.day },
        display,
      );
    }

    if (cell?.date_ad) {
      return patroDayFetchFromApiDateAd(cell.date_ad, display);
    }

    return patroDayFetchFromApiDateAd(asideAdDate, display);
  }, [browseEra, asideAdDate, monthContext, selectedDay]);

  const panchangaQ = useQuery({
    queryKey: panchangaKeys.daySelection(asideDayState, location.params),
    queryFn: () => fetchPanchangaDay(asideDayState, location.params),
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  // Silently warm the साइत and दैनिक मुहूर्त aside tabs in the background once
  // the home page is idle: prefetch their code-split chunks and the sait month
  // data into the query cache. The muhurta panel derives everything from the
  // already-loaded panchanga day, so it only needs its chunk. Runs off the main
  // thread (requestIdleCallback) so it never competes with the initial render.
  const queryClient = useQueryClient();
  const prefetchYear = browseYear;
  const prefetchMonth = browseMonth;
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      prefetchAsidePanels();
      void queryClient.prefetchQuery({
        queryKey: saitMonthAllKey(prefetchYear, prefetchMonth),
        queryFn: () => fetchSaitMonthAll(prefetchYear, prefetchMonth),
        staleTime: 1000 * 60 * 60,
      });
    };
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    const handle = ric ? ric(run, { timeout: 2500 }) : window.setTimeout(run, 1200);
    return () => {
      cancelled = true;
      const cic = (window as unknown as {
        cancelIdleCallback?: (h: number) => void;
      }).cancelIdleCallback;
      if (ric && cic) cic(handle);
      else window.clearTimeout(handle);
    };
  }, [queryClient, prefetchYear, prefetchMonth]);

  const handlePatroViewChange = useCallback((view: HomePatroView) => {
    setPatroView(view);
    setLocalStorageItem(HOME_PATRO_VIEW_KEY, view);
  }, []);

  const asideContextDay = useMemo(() => {
    if (selectedDay) return selectedDay;
    return (
      monthContext.days.find((d) => !d.outsideMonth && d.date_ad === asideAdDate) ??
      monthContext.days.find((d) => !d.outsideMonth && d.day === 1) ??
      monthContext.days.find((d) => !d.outsideMonth) ??
      null
    );
  }, [selectedDay, monthContext.days, asideAdDate]);

  const asideDataMatches = useMemo(
    () =>
      panchangaQ.data
        ? panchangaMatchesAside(panchangaQ.data, asideAdDate, monthContext, asideContextDay)
        : false,
    [panchangaQ.data, asideAdDate, monthContext, asideContextDay],
  );

  const asideP = asideDataMatches ? panchangaQ.data : undefined;
  const asideInitialLoading = panchangaQ.isLoading && !asideP;
  const asideLoading =
    asideInitialLoading ||
    panchangaQ.isFetching ||
    (Boolean(panchangaQ.data) && !asideDataMatches);
  useRouteLoading(asideInitialLoading);

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-12 pt-4 max-md:px-0 max-md:pb-16 max-md:pt-0">
      {/* `main` drops its padding below md, so the card brings its own there —
          otherwise it alone would run edge to edge above the calendar. */}
     

      <CalendarView
        monthBrowse={monthBrowse}
        location={location}
        onLocationChange={setLocation}
        todayAd={todayAd}
        enablePatroToggle
        patroView={patroView}
        onPatroViewChange={handlePatroViewChange}
        onDaySelect={handleDaySelect}
        onMonthContextChange={handleMonthContextChange}
        belowPatro={
          <>
            <AakashGocharEntryCard className="mt-3 max-sm:mx-2.5 border-secondary/40 bg-secondary/[0.07] shadow-sm" />
            <HomeVedaMantra dateAd={todayAd} className="mt-3 max-sm:mx-2.5" />
          </>
        }
        aside={
          <PanchangaAside
            key={selectedDay?.date_ad ?? "none"}
            ref={panchangaAsideRef}
            selectedDay={selectedDay}
            selectedAdDate={asideAdDate}
            todayAd={todayAd}
            monthContext={monthContext}
            location={location}
            p={asideP}
            loading={asideLoading}
            error={panchangaQ.isError}
          />
        }
        holidays={
          <section className="col-span-full mt-2 max-sm:px-2.5">
            <HomeRashifalTeaser location={location} dayState={asideDayState} />
            <div className="mt-8">
              <HomeQuickLinks location={location} />
            </div>
            <PanchangaDirectory className="mt-8" />
          </section>
        }
      />
      <p className="mt-7 text-center text-sm max-sm:px-2.5">{t("footer_note")}</p>
    </main>
  );
}
