import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRootNavigationState, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { BsMonthHeaderTitle } from "@/components/home/BsMonthHeaderTitle";
import { BsCalendarGrid } from "@/components/home/BsCalendarGrid";
import { HomeVedaMantra } from "@/components/home/HomeVedaMantra";
import { HomeAuspiciousTimes } from "@/components/home/HomeAuspiciousTimes";
import { PanchangaAsidePanel } from "@/components/home/PanchangaAsidePanel";
import { PanchangaMonthGrid } from "@/components/home/PanchangaMonthGrid";
import { type HomePatroView } from "@/components/home/PatroViewToggle";
import { PatroFooterNote } from "@/components/branding/PatroFooterNote";
import { SiteFooter } from "@/components/branding/SiteFooter";
import { HomeRashifalSection } from "@/components/home/HomeRashifalSection";
import { AakashGocharEntryCard } from "@/components/home/AakashGocharEntryCard";
import { HomeQuickLinks } from "@/components/home/HomeQuickLinks";
import { PanchangaDirectoryMobile } from "@/components/panchanga/PanchangaDirectoryMobile";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { ErrorState } from "@/components/ui/States";
import { apiKeys, fetchPanchanga, fetchSaitMonthAll, type CalendarDay } from "@/lib/api";
import { useHomeAside, useHomeMonth } from "@vedic-patro/features/home";
import { fetchMonthCalendarOffline } from "@/lib/offline/offline-month";
import { OfflineUnavailableError } from "@/lib/offline/offline-store";
import { OfflineDownloadPrompt } from "@/components/offline/OfflineDownloadPrompt";
import { applyPatroApiLimits } from "@/lib/patro-browse-years";
import { resolveLocationTimezone } from "@vedic-patro/domain/panchanga-location";
import { todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { useLocale } from "@/lib/i18n";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { floatingNavBottomPadding, HOME_CARD_INSET, homeContentInset } from "@/lib/mobile-nav";
import { formatPatroMonthCrossEraSubtitle } from "@vedic-patro/domain/patro-headline-subtitle";
import { ERAS, isGregorianEra, type Era } from "@vedic-patro/domain/era";
import { usePatroMonthBrowse } from "@/lib/use-patro-month-browse";
import { useBreakpoint } from "@/lib/responsive";
import { useDeferredMount } from "@/lib/use-deferred-mount";
import { scrollViewIntoView, setPageScroller } from "@/lib/page-scroll";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

const ASIDE_SIDEBAR_SPLIT = 1280;
const ASIDE_WIDTH = 360;
const ASIDE_MAX_WIDTH = 400;

export default function HomeScreen() {
  const belowFoldReady = useDeferredMount();
  const { t, digits, lang } = useLocale();
  const { width, isTablet, isPhone } = useBreakpoint();
  const { location, setLocation } = usePanchangaLocation();
  const {
    era: browseEra,
    year,
    month,
    setYear,
    setEra: setBrowseEra,
    setMonth,
    stepMonth,
    goToday: goTodayBrowse,
  } = usePatroMonthBrowse();
  const asideRef = useRef<View>(null);
  const scrollToAsideRef = useRef(false);
  const [patroView, setPatroView] = useState<HomePatroView>("calendar");
  const todayAd = useMemo(() => todayAdStringInTimezone(new Date(), resolveLocationTimezone(location)), [location]);
  const splitAside = width >= ASIDE_SIDEBAR_SPLIT;

  // The browsed era/year/month lives in the address (?era=&year=&month=), like the
  // website, so a shared link reopens the same month and it survives a relaunch.
  const urlParams = useLocalSearchParams<{ era?: string; year?: string; month?: string }>();
  const router = useRouter();
  const pendingBrowse = useRef<{ era: Era; year: number; month: number } | null>(
    (() => {
      const y = Number(urlParams.year);
      const m = Number(urlParams.month);
      const e = (urlParams.era ?? "bs") as Era;
      if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null;
      if (!(ERAS as readonly string[]).includes(e)) return null;
      return { era: e, year: y, month: m };
    })(),
  );

  useEffect(() => {
    const target = pendingBrowse.current;
    if (!target) return;
    if (browseEra !== target.era) {
      setBrowseEra(target.era);
      return;
    }
    setYear(target.year);
    setMonth(target.month);
    pendingBrowse.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browseEra]);

  // Writing params before the navigator has mounted throws, so wait for it, and
  // skip the very first run (nothing has changed yet).
  const navReady = Boolean(useRootNavigationState()?.key);
  const browseWritten = useRef(false);
  useEffect(() => {
    if (!navReady || pendingBrowse.current) return;
    if (!browseWritten.current) {
      browseWritten.current = true;
      return;
    }
    try {
      router.setParams({ era: browseEra, year: String(year), month: String(month) } as never);
    } catch {
      /* navigator not ready yet; the next browse change will write it */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navReady, browseEra, year, month]);

  const homeMonth = useHomeMonth({
    era: browseEra,
    year,
    month,
    location: location.params,
    fetchMonth: fetchMonthCalendarOffline,
    panchangaView: patroView === "panchanga",
    onLimits: applyPatroApiLimits,
  });
  const { gridDays, publicHolidayDates } = homeMonth;
  const aside = useHomeAside({
    context: homeMonth.context,
    todayAd,
    source: (dayAd) => ({
      queryKey: apiKeys.panchanga(dayAd, "ad", location.params),
      queryFn: () => fetchPanchanga(dayAd, "ad", location.params),
    }),
  });
  const { selectedDay, selectDay } = aside;

  const crossEraSubtitle = useMemo(
    () => formatPatroMonthCrossEraSubtitle(browseEra, year, month, lang, digits),
    [browseEra, year, month, lang, digits],
  );

  // Below the wide split the panchanga sits under the calendar (as on the
  // website), so a tapped day scrolls it into view.
  const handleSelectDay = useCallback(
    (day: CalendarDay) => {
      if (day.outsideMonth) return;
      selectDay(day);
      if (!splitAside) scrollToAsideRef.current = true;
    },
    [splitAside, selectDay],
  );

  useEffect(() => {
    if (!scrollToAsideRef.current || !selectedDay) return;
    scrollToAsideRef.current = false;
    requestAnimationFrame(() => scrollViewIntoView(asideRef.current, 72));
  }, [selectedDay]);

  const saitQ = useQuery({
    queryKey: apiKeys.saitMonthAll(year, month, location.params),
    queryFn: () => fetchSaitMonthAll(year, month, location.params),
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  const goMonth = useCallback(
    (delta: number) => {
      stepMonth(delta);
      selectDay(null);
    },
    [stepMonth],
  );

  const goToday = () => {
    goTodayBrowse(todayAd);
    selectDay(null);
  };

  const monthLoading = homeMonth.loading;
  const monthError = Boolean(homeMonth.currentError);
  const monthFetching = homeMonth.enriching;

  const contentInset = homeContentInset(isPhone);
  const cardInset = isPhone ? HOME_CARD_INSET : contentInset;

  const monthHeaderBlock = (
    <View className={isPhone ? "mt-2 pt-3" : "mt-2"} style={{ paddingHorizontal: contentInset }}>
      <BsMonthHeaderTitle
        year={year}
        month={month}
        browseEra={browseEra}
        onBrowseEraChange={setBrowseEra}
        onPrev={() => goMonth(-1)}
        onNext={() => goMonth(1)}
        onToday={goToday}
        crossEraSubtitle={crossEraSubtitle}
        onMonthChange={(m) => {
          setMonth(m);
          selectDay(null);
        }}
        onYearChange={(y) => {
          setYear(y);
          selectDay(null);
        }}
        prevDisabled={homeMonth.prevDisabled}
        nextDisabled={homeMonth.nextDisabled}
        patroView={patroView}
        onPatroViewChange={(v) => {
          setPatroView(v);
          selectDay(null);
        }}
        location={location}
        onLocationChange={setLocation}
      />
    </View>
  );

  /* `flex-1` only means something beside the aside (a row). In the stacked
     (phone / narrow) layout the parent has no fixed height, so flex-1 can
     collapse the column to nothing and the panchanga card below paints over the
     calendar — size to content there instead. */
  const columnClass = splitAside ? "min-w-0 flex-1" : "min-w-0 w-full";

  const calendarBlock = (
    <View className={columnClass}>
      {monthHeaderBlock}

      {monthLoading ? (
        <View className="py-16" style={{ paddingHorizontal: contentInset }}>
          <VedicPatroLoader />
        </View>
      ) : monthError ? (
        <View style={{ paddingHorizontal: contentInset }}>
          <ErrorState
            message={
              homeMonth.currentError instanceof OfflineUnavailableError
                ? t("ui.home.you_re_offline_and_this_calendar")
                : t("ui.home.could_not_load_calendar")
            }
            onRetry={homeMonth.retry}
          />
        </View>
      ) : patroView === "panchanga" ? (
        <PanchangaMonthGrid
          days={gridDays}
          year={year}
          month={month}
          todayAd={todayAd}
          selectedAd={aside.highlightAd}
          loading={monthFetching}
          onPickDay={handleSelectDay}
          edgeToEdge={isPhone}
        />
      ) : (
        <BsCalendarGrid
          days={gridDays}
          selectedAd={aside.highlightAd}
          todayAd={todayAd}
          publicHolidayDates={publicHolidayDates}
          onSelectDay={handleSelectDay}
          isEnriching={monthFetching}
          primaryDate={isGregorianEra(browseEra) ? "ad" : "bs"}
        />
      )}
    </View>
  );

  const asideBlock = (
    <View
      style={
        splitAside
          ? {
              width: ASIDE_WIDTH,
              maxWidth: ASIDE_MAX_WIDTH,
              flexGrow: 0,
              flexShrink: 0,
              alignSelf: "flex-start",
            }
          : {
              width: "100%",
              alignSelf: "stretch",
              paddingHorizontal: cardInset,
            }
      }
      className="min-w-0 w-full"
    >
      <PanchangaAsidePanel
        month={month}
        year={year}
        selectedAd={aside.dayAd}
        todayAd={todayAd}
        selectedDay={selectedDay}
        contextDays={homeMonth.monthDays}
        p={aside.p}
        loading={aside.initialLoading}
        error={aside.error}
        onRetry={aside.retry}
        saitData={saitQ.data}
        saitLoading={saitQ.isPending}
        saitError={saitQ.isError}
        onSaitRetry={() => saitQ.refetch()}
        location={location.params}
        browseEra={browseEra}
      />
    </View>
  );

  const leftColumn = (
    <View className={columnClass}>
      {calendarBlock}

      <View className="mt-3 gap-3" style={{ paddingHorizontal: cardInset }}>
        <AakashGocharEntryCard />
        <HomeVedaMantra dateAd={todayAd} />
        <OfflineDownloadPrompt year={year} era={browseEra} />
      </View>
    </View>
  );

  return (
    <>
      <ScrollView
        ref={setPageScroller}
        className="flex-1 bg-background"
        contentContainerClassName="mx-auto w-full max-w-page"
        contentContainerStyle={{
          paddingBottom: floatingNavBottomPadding(isTablet),
          paddingHorizontal: isPhone ? 0 : contentInset,
          paddingTop: isPhone ? 0 : 16,
        }}
      >
        <View className={splitAside ? "flex-row items-start gap-4" : "gap-4"}>
          {leftColumn}
          {splitAside ? asideBlock : null}
        </View>

        {splitAside ? null : (
          <View ref={asideRef} collapsable={false} className="mt-4">
            {asideBlock}
          </View>
        )}

        <View className="mt-6" style={{ paddingHorizontal: cardInset }}>
          <HomeAuspiciousTimes p={aside.p} />
        </View>

        {/* Below the fold: drawn after the first screen, so the calendar and
            today's panchanga appear first and their requests go out first. */}
        {belowFoldReady ? (
          <>
            <View className="mt-6">
              <HomeRashifalSection
                dateAd={aside.dayAd}
                location={location.params}
                contentInset={cardInset}
              />
            </View>

            <View className="mt-8" style={{ paddingHorizontal: cardInset }}>
              <HomeQuickLinks />
            </View>

            <View className="mt-8" style={{ paddingHorizontal: cardInset }}>
              <PanchangaDirectoryMobile />
            </View>

            <PatroFooterNote className={homeClasses.footerNote} paddingHorizontal={cardInset} />
            <SiteFooter />
            </>
          ) : null}
        </ScrollView>

    </>
  );
}
