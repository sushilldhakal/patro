import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { SPRING_SNAP, haptics, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { useLocalSearchParams, useRootNavigationState, useRouter } from "expo-router";
import { BsMonthHeaderTitle } from "@/components/home/BsMonthHeaderTitle";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { BsCalendarGrid } from "@vedic-patro/ui/kit/shell";
import { HomeVedaMantra } from "@/components/home/HomeVedaMantra";
import { HomeReminderCard } from "@/components/home/HomeReminderCard";
import { PanchangaAsidePanel } from "@/components/home/PanchangaAsidePanel";
import { PanchangaMonthGrid } from "@/components/home/PanchangaMonthGrid";
import { type HomePatroView } from "@/components/home/PatroViewToggle";
import { PatroFooterNote } from "@/components/branding/PatroFooterNote";
import { SiteFooter } from "@/components/branding/SiteFooter";
import { HomeRashifalSection } from "@/components/home/HomeRashifalSection";
import { AakashGocharEntryCard } from "@/components/home/AakashGocharEntryCard";
import { AdhikMaasNotice } from "@vedic-patro/ui/kit/shell";
import { getCurrentBs } from "@vedic-patro/domain/calendar/bs-calendar";
import { HomeQuickLinks } from "@/components/home/HomeQuickLinks";
import { PanchangaDirectoryMobile } from "@/components/panchanga/PanchangaDirectoryMobile";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { ErrorState } from "@/components/ui/States";
import { apiKeys, fetchPanchanga, type CalendarDay } from "@/lib/api";
import { useHomeAside, useHomeMonth } from "@vedic-patro/features/home";
import { fetchMonthCalendarOffline } from "@/lib/offline/offline-month";
import { OfflineUnavailableError } from "@/lib/offline/offline-store";
import { OfflineDownloadPrompt } from "@/components/offline/OfflineDownloadPrompt";
import { applyPatroApiLimits } from "@/lib/patro-browse-years";
import { resolveLocationTimezone } from "@vedic-patro/read-models/geography/panchanga-location";
import { todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { useLocale } from "@/lib/i18n";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { floatingNavBottomPadding, HOME_CARD_INSET, homeContentInset, PAGE_HORIZONTAL_PADDING_WIDE, pageTopPadding } from "@/lib/mobile-nav";
import { formatPatroMonthCrossEraSubtitle } from "@vedic-patro/domain/calendar/patro-headline-subtitle";
import { ERAS, isGregorianEra, type Era } from "@vedic-patro/domain/calendar/era";
import { usePatroMonthBrowse } from "@/lib/use-patro-month-browse";
import { MONTH_SWIPE_ENABLED, todayPulse } from "@/components/home/calendar-grid-layout";
import { Reveal } from "@/components/ui/Reveal";
import { SCROLL_EVENT_THROTTLE, ScrollRevealScope, onPageScroll } from "@/lib/scroll-motion";
import { useBreakpoint } from "@/lib/responsive";
import { useDeferredMount } from "@/lib/use-deferred-mount";
import { scrollViewIntoView, setPageScroller } from "@/lib/page-scroll";
import { usePageRefreshControl } from "@/components/ui/PageRefreshControl";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

const ASIDE_SIDEBAR_SPLIT = 1280;
const ASIDE_WIDTH = 360;
const ASIDE_MAX_WIDTH = 400;
const MONTH_FLICK_VELOCITY = 800;

function project(velocity: number) {
  "worklet";
  const decelerationRate = 0.998;
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

function rubberband(overshoot: number, dimension: number) {
  "worklet";
  const constant = 0.55;
  const span = dimension > 0 ? dimension : 1;
  return (overshoot * span * constant) / (span + constant * Math.abs(overshoot));
}

function MonthGridSwipe({
  enabled,
  atStart,
  atEnd,
  onCommit,
  children,
}: {
  enabled: boolean;
  atStart: boolean;
  atEnd: boolean;
  onCommit: (delta: number) => void;
  children: ReactNode;
}) {
  const reduced = Boolean(useReducedMotionPref());
  const tx = useSharedValue(0);
  const widthSv = useSharedValue(0);
  const atStartSv = useSharedValue(atStart);
  const atEndSv = useSharedValue(atEnd);
  const reducedSv = useSharedValue(reduced);
  const drag = useSharedValue(0);
  const originX = useSharedValue(0);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const commit = useCallback((delta: number) => {
    commitRef.current(delta);
  }, []);
  const snap = useCallback(() => {
    haptics.snap();
  }, []);

  useLayoutEffect(() => {
    atStartSv.set(atStart);
    atEndSv.set(atEnd);
    reducedSv.set(reduced);
  }, [atStart, atEnd, reduced, atStartSv, atEndSv, reducedSv]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onStart((e) => {
          // Activate only — a vertical scroll must not cancel a spring already running.
          drag.set(tx.get());
          originX.set(e.translationX);
        })
        .onUpdate((e) => {
          if (reducedSv.get()) return;
          const width = widthSv.get();
          let next = drag.get() + (e.translationX - originX.get());
          if (next > 0 && atStartSv.get()) next = rubberband(next, width);
          else if (next < 0 && atEndSv.get()) next = -rubberband(-next, width);
          tx.set(next);
        })
        .onEnd((e) => {
          const width = widthSv.get();
          const traveled = e.translationX;
          const projected = traveled + project(e.velocityX);
          const flick = Math.abs(e.velocityX) > MONTH_FLICK_VELOCITY;
          const far = width > 0 && (Math.abs(traveled) > width * 0.3 || Math.abs(projected) > width * 0.3);
          const signed = Math.abs(e.velocityX) > 20 ? e.velocityX : traveled;
          const dir = signed > 0 ? -1 : 1;
          const blocked = (dir > 0 && atEndSv.get()) || (dir < 0 && atStartSv.get());
          if ((flick || far) && !blocked && width > 0) {
            scheduleOnRN(snap);
            scheduleOnRN(commit, dir);
          }
          const velocity = reducedSv.get() ? 0 : e.velocityX;
          tx.set(withSpring(0, { ...SPRING_SNAP, velocity }));
        }),
    [atEndSv, atStartSv, commit, drag, enabled, originX, reducedSv, snap, tx, widthSv],
  );

  /* Always written: Reanimated leaves a key it stops returning at its last value,
     so `{}` at rest could strand the grid a fraction of a pixel off after a spring. */
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.get() }] }));

  if (!enabled) return children;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style} onLayout={(event) => widthSv.set(event.nativeEvent.layout.width)}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

export default function HomeScreen() {
  const belowFoldReady = useDeferredMount();
  const refreshControl = usePageRefreshControl();
  const { t, digits, lang } = useLocale();
  const { width, isTablet, isPhone, isCompact } = useBreakpoint();
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
    // Not `panchangaView`: that mode skips the neighbouring months and hands back the
    // month's bare days, so day 1 always sat under Sunday. The panchanga grid
    // takes the same week-aligned days as the calendar (as the website builds it).
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

  /* One page inset on a tablet, given by the scroll view, so the header, the month grid
     and the cards share an edge. A phone pads each block itself: the grid runs edge to edge
     there and the cards sit at their own inset (as on the website). */
  const pageInset = isPhone ? 0 : PAGE_HORIZONTAL_PADDING_WIDE;
  const contentInset = isPhone ? homeContentInset(true) : 0;
  const cardInset = isPhone ? HOME_CARD_INSET : 0;

  const monthHeaderBlock = (
    <View style={{ paddingHorizontal: contentInset }}>
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
      <Reveal index={0}>{monthHeaderBlock}</Reveal>

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
      ) : (
        <Reveal index={1}>
        <MonthGridSwipe
          enabled={MONTH_SWIPE_ENABLED}
          atStart={homeMonth.prevDisabled}
          atEnd={homeMonth.nextDisabled}
          onCommit={goMonth}
        >
          {patroView === "panchanga" ? (
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
              selectedAdDate={aside.highlightAd}
              todayAd={todayAd}
              todayPulse={todayPulse}
              publicHolidayDates={publicHolidayDates}
              onSelectDay={handleSelectDay}
              isEnriching={monthFetching}
              primaryDate={isGregorianEra(browseEra) ? "ad" : "bs"}
              moon={(info) => <CalendarMoonPhaseIcon tithiIndex={info.tithiIndex} title={info.title} size={16} />}
            />
          )}
        </MonthGridSwipe>
        </Reveal>
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
        location={location.params}
        browseEra={browseEra}
      />
    </View>
  );

  const leftColumn = (
    <View className={columnClass}>
      {calendarBlock}

      <Reveal index={2}>
        <View className="mt-3 gap-3" style={{ paddingHorizontal: cardInset }}>
          <AdhikMaasNotice
            bsYear={browseEra === "bs" ? year : getCurrentBs().year}
            onMore={(y) => router.push(`/adhik-maas?year=${y}` as never)}
          />
          <AakashGocharEntryCard />
          <HomeVedaMantra dateAd={todayAd} />
          <HomeReminderCard p={aside.p} />
          <OfflineDownloadPrompt year={year} era={browseEra} />
        </View>
      </Reveal>
    </View>
  );

  return (
    <>
      <ScrollView
        ref={setPageScroller}
        refreshControl={refreshControl}
        className="flex-1 bg-background"
        contentContainerClassName="mx-auto w-full max-w-page"
        contentContainerStyle={{
          paddingBottom: floatingNavBottomPadding(isTablet),
          paddingHorizontal: pageInset,
          paddingTop: pageTopPadding(isCompact),
        }}
        onScroll={onPageScroll}
        scrollEventThrottle={SCROLL_EVENT_THROTTLE}
      >
        <ScrollRevealScope.Provider value>
        <View className={splitAside ? "flex-row items-start gap-4" : "gap-4"}>
          {leftColumn}
          {splitAside ? asideBlock : null}
        </View>

        {splitAside ? null : (
          <View ref={asideRef} collapsable={false} className="mt-4">
            <Reveal index={3}>{asideBlock}</Reveal>
          </View>
        )}

        {/* Below the fold: drawn after the first screen, so the calendar and
            today's panchanga appear first and their requests go out first. */}
        {belowFoldReady ? (
          <>
            <Reveal>
              <View className="mt-6">
                <HomeRashifalSection
                  dateAd={aside.dayAd}
                  location={location.params}
                  contentInset={cardInset}
                />
              </View>
            </Reveal>

            <Reveal>
              <View className="mt-8" style={{ paddingHorizontal: cardInset }}>
                <HomeQuickLinks location={location} />
              </View>
            </Reveal>

            <Reveal>
              <View className="mt-8" style={{ paddingHorizontal: cardInset }}>
                <PanchangaDirectoryMobile />
              </View>
            </Reveal>

            <Reveal>
              <PatroFooterNote className={homeClasses.footerNote} paddingHorizontal={cardInset} />
              <SiteFooter />
            </Reveal>
            </>
          ) : null}
        </ScrollRevealScope.Provider>
        </ScrollView>

    </>
  );
}
