import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import { useHomeAside, type HomeAside } from "@vedic-patro/features/home";
import { fetchPanchangaDay, fetchSaitMonthAll, panchangaKeys, saitMonthAllKey, type CalendarDay } from "../lib/api";
import { CalendarView, loadHomePatroView, type CalendarMonthContext, type HomePatroView, HOME_PATRO_VIEW_KEY } from "../components/CalendarView";
import { AakashGocharEntryCard } from "@/components/sky3d/AakashGocharEntryCard";
import { useRouteLoading } from "@/lib/route-loading";
import { setLocalStorageItem } from "@/lib/browser";
import { resolveLocationTimezone, usePanchangaLocation, type PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { adToBS, getCurrentBs } from "@vedic-patro/domain/calendar/bs-calendar";
import { cn } from "@vedic-patro/design-tokens/cn";
import { patroAsideTab } from "@/lib/patro-classes";
import { parseCivilIsoToDate } from "@vedic-patro/domain/calendar/patro-day";
import { getLanguageForEra, type Era } from "@vedic-patro/domain/calendar/era";
import { patroDayFetchFromApiDateAd, patroDayFetchFromBrowseGridParts, type PatroDayFetchState } from "@/lib/patro-day-url";
import { PanchangaAsideTabPanel } from "@/components/home/PanchangaAsideTabs";
import { prefetchAsidePanels } from "@/components/home/aside-prefetch";
import { HomeVedaMantra } from "@/components/home/HomeVedaMantra";
import { AdhikMaasNotice } from "@/components/home/AdhikMaasNotice";
import { HomeQuickLinks } from "@/components/home/HomeQuickLinks";
import { TodayHighlightCard } from "@/components/home/TodayHighlightCard";
import { HomeRashifalTeaser } from "@/components/home/HomeRashifalTeaser";
import { PanchangaDirectory } from "@/components/panchanga/PanchangaDirectory";
import { Button } from "@/components/ui/button";
import { usePatroMonthUrlBrowse } from "@/hooks/use-patro-url-browse";
import { currentPatroDayLinkSearch } from "@/lib/url-state";
import { smoothScrollToElement } from "@/lib/scroll";
import { minWidthQuery } from "@vedic-patro/design-tokens";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

const ASIDE_SIDEBAR_MQ = minWidthQuery("xl");
const PANCHANGA_SCROLL_OFFSET = 72; // sticky header (h-16) + small gap

const routeApi = getRouteApi("/");

/** The web's request for the panel's day: by grid parts in a BS month (any era), else by civil date. */
function asideDayStateFor(dayAd: string, picked: CalendarDay | null, ctx: CalendarMonthContext, browseEra: Era): PatroDayFetchState {
  const display = { era: browseEra, language: getLanguageForEra(browseEra) };
  if (picked?.date_ad) return patroDayFetchFromApiDateAd(picked.date_ad, display);
  if (!ctx.isAdCalendar && ctx.year && ctx.month && dayAd) {
    try {
      const bs = adToBS(parseCivilIsoToDate(dayAd));
      if (bs.year === ctx.year && bs.month === ctx.month) {
        return patroDayFetchFromBrowseGridParts({ year: bs.year, month: bs.month, day: bs.day }, display);
      }
    } catch {
      /* use the civil date below */
    }
  }
  const cell = ctx.days.find((d) => !d.outsideMonth && d.date_ad === dayAd) ?? ctx.days.find((d) => !d.outsideMonth && d.day === 1) ?? null;
  if (!ctx.isAdCalendar && ctx.year && ctx.month && cell && !cell.outsideMonth) {
    return patroDayFetchFromBrowseGridParts({ year: ctx.year, month: ctx.month, day: cell.day }, display);
  }
  return patroDayFetchFromApiDateAd(cell?.date_ad ?? dayAd, display);
}

const PanchangaAside = forwardRef(function PanchangaAside(
  { aside, todayAd, monthContext, location }: { aside: HomeAside; todayAd: string; monthContext: CalendarMonthContext; location: PanchangaLocation },
  ref: React.ForwardedRef<HTMLElement>,
) {
  const { copy, p, contextDay } = aside;
  return (
    <aside ref={ref} id="home-panchanga-aside" className={cn("scroll-mt-[4.5rem] flex flex-col", homeClasses.asideShell)}>
      <div className={homeClasses.asideHeader}>
        <h2 className={cn("m-0", homeClasses.asideTitle)}>{copy.title}</h2>
        <Link
          to="/panchanga"
          search={currentPatroDayLinkSearch(location, aside.dayAd)}
          className={cn(homeClasses.asideLink, "no-underline whitespace-nowrap hover:underline")}
        >
          {copy.fullDetail}
        </Link>
      </div>

      <TodayHighlightCard selectedDay={contextDay} selectedAdDate={aside.dayAd} todayAd={todayAd} monthContext={monthContext} p={p} />

      <div className={cn("flex min-w-0 flex-1 flex-col", homeClasses.asideBody)}>
        <div className={cn("grid shrink-0 grid-cols-3", homeClasses.asideTabBar)} role="tablist" aria-label={copy.tabsLabel}>
          {aside.tabs.map((tab) => (
            <Button
              key={tab.id}
              role="tab"
              variant="ghost"
              size="sm"
              className={cn(patroAsideTab(tab.active), "h-auto w-full rounded-none p-0")}
              aria-selected={tab.active}
              onClick={() => aside.setTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className={cn("flex-1 to-card max-md:p-3", homeClasses.asidePanel)} role="tabpanel">
          {aside.error && !p ? (
            <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 rounded-xl bg-error-surface px-4 py-6 text-center">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-danger/10 text-sm font-bold text-danger">!</span>
              <p className="m-0 text-sm leading-relaxed text-danger">{copy.error}</p>
            </div>
          ) : (
            <div className="animate-in fade-in-0 duration-200">
              <PanchangaAsideTabPanel
                tab={aside.tab}
                p={p}
                selectedDay={contextDay}
                selectedAdDate={aside.dayAd}
                location={location}
                bsYear={monthContext.year}
                bsMonth={monthContext.month}
                adYear={monthContext.isAdCalendar ? monthContext.adYear : undefined}
                adMonth={monthContext.isAdCalendar ? monthContext.adMonth : undefined}
                loading={aside.loading}
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
});

/** Home — the website's drawing of `useHomeMonth` (in CalendarView) and `useHomeAside` (@vedic-patro/features). */
export function Home() {
  const navigate = useNavigate({ from: "/" });
  const search = routeApi.useSearch();
  const { location, setLocation } = usePanchangaLocation();
  const monthBrowse = usePatroMonthUrlBrowse(search, navigate, location, setLocation);
  const { year: bsYear, month: bsMonth } = getCurrentBs();
  const todayAd = useMemo(() => todayAdStringInTimezone(new Date(), resolveLocationTimezone(location)), [location]);
  const panchangaAsideRef = useRef<HTMLElement>(null);
  const scrollToPanchangaRef = useRef(false);
  const [patroView, setPatroView] = useState<HomePatroView>(loadHomePatroView);
  const [monthContext, setMonthContext] = useState<CalendarMonthContext>(() => {
    const today = new Date();
    return { year: bsYear, month: bsMonth, days: [], adYear: today.getFullYear(), adMonth: today.getMonth() + 1, isAdCalendar: false };
  });
  const handleMonthContextChange = useCallback((ctx: CalendarMonthContext) => {
    setMonthContext((prev) => (prev.year === ctx.year && prev.month === ctx.month && prev.days === ctx.days ? prev : ctx));
  }, []);

  const { era: browseEra, year: browseYear, month: browseMonth } = monthBrowse;
  const aside = useHomeAside({
    context: monthContext,
    todayAd,
    source: (dayAd, picked) => {
      const state = asideDayStateFor(dayAd, picked, monthContext, browseEra);
      return { queryKey: panchangaKeys.daySelection(state, location.params), queryFn: () => fetchPanchangaDay(state, location.params) };
    },
  });
  const asideDayState = useMemo(
    () => asideDayStateFor(aside.dayAd, aside.selectedDay, monthContext, browseEra),
    [aside.dayAd, aside.selectedDay, monthContext, browseEra],
  );
  const { selectDay, selectedDay } = aside;

  const handleDaySelect = useCallback(
    (day: CalendarDay | null) => {
      selectDay(day);
      if (day && typeof window !== "undefined" && !window.matchMedia(ASIDE_SIDEBAR_MQ).matches) {
        scrollToPanchangaRef.current = true;
      }
    },
    [selectDay],
  );

  useEffect(() => {
    if (!scrollToPanchangaRef.current || !selectedDay) return;
    scrollToPanchangaRef.current = false;
    const el = panchangaAsideRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      smoothScrollToElement(el, { duration: 400, offset: PANCHANGA_SCROLL_OFFSET });
    });
  }, [selectedDay]);

  // Warm the sait and daily-muhurta tabs once the page is idle: their code
  // chunks and the sait month. Off the main thread so it never competes with
  // the first render.
  const queryClient = useQueryClient();
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      prefetchAsidePanels();
      void queryClient.prefetchQuery({
        queryKey: saitMonthAllKey(browseYear, browseMonth),
        queryFn: () => fetchSaitMonthAll(browseYear, browseMonth),
        staleTime: 1000 * 60 * 60,
      });
    };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    const handle = ric ? ric(run, { timeout: 2500 }) : window.setTimeout(run, 1200);
    return () => {
      cancelled = true;
      const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
      if (ric && cic) cic(handle);
      else window.clearTimeout(handle);
    };
  }, [queryClient, browseYear, browseMonth]);

  const handlePatroViewChange = useCallback((view: HomePatroView) => {
    setPatroView(view);
    setLocalStorageItem(HOME_PATRO_VIEW_KEY, view);
  }, []);

  const { setYearMonth } = monthBrowse;
  const handleAdhikJump = useCallback(
    (year: number, month: number) => {
      setYearMonth(year, month);
      selectDay(null);
    },
    [setYearMonth, selectDay],
  );

  useRouteLoading(aside.initialLoading);

  return (
    <main className="mx-auto max-w-page px-4 pb-12 pt-4 max-md:px-0 max-md:pb-16 max-md:pt-0">
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
            <AdhikMaasNotice
              bsYear={browseEra === "bs" ? browseYear : bsYear}
              onJump={browseEra === "bs" ? handleAdhikJump : undefined}
              className="mt-3 max-sm:mx-2.5"
            />
            <AakashGocharEntryCard className={cn("mt-3 max-sm:mx-2.5", homeClasses.aakashCardTone)} />
            <HomeVedaMantra dateAd={todayAd} className="mt-3 max-sm:mx-2.5" />
          </>
        }
        aside={<PanchangaAside ref={panchangaAsideRef} aside={aside} todayAd={todayAd} monthContext={monthContext} location={location} />}
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
      <p className={cn(homeClasses.footerNote, "max-sm:px-2.5")}>{aside.copy.footerNote}</p>
    </main>
  );
}
