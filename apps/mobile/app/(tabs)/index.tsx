import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type ComponentRef } from "react";
import { RateAppCard } from "@/components/review/RateAppCard";
import { adaptHomeView, adaptTabletHomeView, isPlannerView, plannerDays, shiftDateIso, useBestSlots, useDayMarks, usePersonalDays, usePlannerText, useUserEvents, type PlannerViewKind } from "@vedic-patro/features/events";
import { PlannerView } from "@vedic-patro/ui/kit/events";
import { EventEditSheet } from "@/components/events/EventEditSheet";
import { EventDetailSheet, type CalendarDetail } from "@/components/events/EventDetailSheet";
import { requestSignIn } from "@/lib/menu-request";
import { updateEvent, type CalendarEvent } from "@/lib/events/api";
import { adToBS, bsToAD } from "@vedic-patro/domain/calendar/bs-calendar";
import { useAuth } from "@/lib/auth/AuthContext";
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
import { PanchangaAsidePanel } from "@/components/home/PanchangaAsidePanel";
import { PanchangaMonthGrid } from "@/components/home/PanchangaMonthGrid";
import { type HomePatroView } from "@/components/home/PatroViewToggle";
import { SiteFooter } from "@/components/branding/SiteFooter";
import { HomeRashifalSection } from "@/components/home/HomeRashifalSection";
import { AakashGocharEntryCard } from "@/components/home/AakashGocharEntryCard";
import { AdhikMaasNotice } from "@vedic-patro/ui/kit/shell";
import { getCurrentBs } from "@vedic-patro/domain/calendar/bs-calendar";
import { HomeQuickLinks } from "@/components/home/HomeQuickLinks";
import { useHomePatroView } from "@/lib/patro-view";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { ErrorState } from "@/components/ui/States";
import { useQueryClient } from "@tanstack/react-query";
import { apiKeys, fetchPanchanga, type CalendarDay } from "@/lib/api";
import { useHomeAside, useHomeMonth } from "@vedic-patro/features/home";
import { fetchMonthCalendarOffline } from "@/lib/offline/offline-month";
import { OfflineUnavailableError } from "@/lib/offline/offline-store";
import { applyPatroApiLimits } from "@/lib/patro-browse-years";
import { resolveLocationTimezone } from "@vedic-patro/read-models/geography/panchanga-location";
import { todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { useLocale } from "@/lib/i18n";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { useNavBottomPadding, HOME_CARD_INSET, homeContentInset, PAGE_HORIZONTAL_PADDING_WIDE, pageTopPadding } from "@/lib/mobile-nav";
import { formatPatroMonthCrossEraSubtitle } from "@vedic-patro/domain/calendar/patro-headline-subtitle";
import { ERAS, isGregorianEra, type Era } from "@vedic-patro/domain/calendar/era";
import { eraForCalendar, getCalendarSystem } from "@vedic-patro/domain/calendar/calendar-system";
import { usePatroMonthBrowse } from "@/lib/use-patro-month-browse";
import { MONTH_SWIPE_ENABLED, todayPulse } from "@/components/home/calendar-grid-layout";
import { Reveal } from "@/components/ui/Reveal";
import { ScrollHero } from "@/components/ui/ScrollHero";
import { PageScrollView } from "@/components/ui/PageScrollView";
import { useBreakpoint } from "@/lib/responsive";
import { useDeferredMount } from "@/lib/use-deferred-mount";
import { scrollViewIntoView, usePageScrollerRef } from "@/lib/page-scroll";
import { usePageRefreshControl } from "@/components/ui/PageRefreshControl";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { withDuoRailInset } from "@/components/navigation/DuoSceneInset";

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

  // Kept mounted while disabled (`.enabled(false)` above): swapping the wrapper out would remount the
  // children, which ends a planner drag the moment it begins.
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style} onLayout={(event) => widthSv.set(event.nativeEvent.layout.width)}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

function HomeScreen() {
  const belowFoldReady = useDeferredMount();
  const refreshControl = usePageRefreshControl();
  const { t, digits, lang } = useLocale();
  const { isAuthenticated } = useAuth();
  const userEvents = useUserEvents(isAuthenticated);
  const { width, isTablet, isPhone, isCompact } = useBreakpoint();
  const navBottom = useNavBottomPadding(isTablet);
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
  const pageScrollerRef = usePageScrollerRef();
  const asideRef = useRef<ComponentRef<typeof View>>(null);
  const scrollToAsideRef = useRef(false);
  // Shared with the header's view menu (lib/patro-view), which can switch it from any page.
  const [patroView, setPatroView] = useHomePatroView();
  const todayAd = useMemo(() => todayAdStringInTimezone(new Date(), resolveLocationTimezone(location)), [location]);
  const plannerKind: PlannerViewKind | null = isPlannerView(patroView) ? patroView : null;
  const [plannerDragging, setPlannerDragging] = useState(false);
  // The planner views (week, day, year, list) centre on this AD date; an event open for editing, or a slot for a new one.
  const [anchor, setAnchor] = useState(todayAd);
  const plannerText = usePlannerText();
  const [editor, setEditor] = useState<{ event?: CalendarEvent; slot?: { date: string; time: string; end?: string; endDate?: string; title?: string } } | null>(null);
  // A tapped event, festival or holiday shows its details first, as in Apple Calendar; Edit opens the form.
  const [detail, setDetail] = useState<CalendarDetail | null>(null);
  const editAfterDetail = useRef<CalendarEvent | null>(null);
  const createAt = useCallback(
    (date: string, time: string, extra?: { end?: string; endDate?: string; title?: string }) => {
      if (!isAuthenticated) {
        requestSignIn();
        return;
      }
      setEditor({ slot: { date, time, ...extra } });
    },
    [isAuthenticated],
  );
  const plannerRange =
    plannerKind === "list" ? { from: anchor, to: shiftDateIso(anchor, 60) } : plannerKind === "year" || plannerKind == null ? { from: anchor, to: anchor } : { from: plannerDays(plannerKind, anchor)[0]!, to: plannerDays(plannerKind, anchor).at(-1)! };
  const dayMarks = useDayMarks(plannerRange.from, plannerRange.to, location.params, plannerKind != null);
  const windowDays = plannerKind === "week" || plannerKind === "day" || plannerKind === "multi" ? plannerDays(plannerKind, anchor) : [];
  // A saved Week on a phone becomes Multi Day; a tablet offers only Day, Week, Month and Panchanga.
  useEffect(() => {
    const fit = width >= 768 ? adaptTabletHomeView(patroView) : adaptHomeView(patroView, false);
    if (fit !== patroView) setPatroView(fit);
  }, [patroView, width, setPatroView]);
  const daySlots = useBestSlots(windowDays, location.params, windowDays.length > 0);
  const personalDays = usePersonalDays(windowDays, location.params, isAuthenticated && windowDays.length > 0);
  // The planner and the header's month follow each other: stepping a week into another month (BS, or AD
  // when browsing ई.सं.) moves the month, and picking a month in the header moves the planner to its first day.
  const plannerAd = isGregorianEra(browseEra);
  const anchorMonth = (iso: string) =>
    plannerAd ? { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) } : adToBS(new Date(`${iso}T12:00:00`));
  useEffect(() => {
    if (!plannerKind || (browseEra !== "bs" && !plannerAd)) return;
    const shown = anchorMonth(anchor);
    if (shown.year !== year) setYear(shown.year);
    if (shown.month !== month) setMonth(shown.month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, plannerKind]);
  useEffect(() => {
    if (!plannerKind || (browseEra !== "bs" && !plannerAd)) return;
    const shown = anchorMonth(anchor);
    if (shown.year === year && shown.month === month) return;
    const first = plannerAd ? new Date(year, month - 1, 1) : bsToAD(year, month, 1);
    setAnchor(`${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-${String(first.getDate()).padStart(2, "0")}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);
  const splitAside = width >= ASIDE_SIDEBAR_SPLIT;

  // The browsed era/year/month lives in the address (?era=&year=&month=), like the
  // website, so a shared link reopens the same month and it survives a relaunch.
  const urlParams = useLocalSearchParams<{ era?: string; year?: string; month?: string }>();
  const router = useRouter();
  const pendingBrowse = useRef<{ era: Era; year: number; month: number } | null>(
    (() => {
      const y = Number(urlParams.year);
      const m = Number(urlParams.month);
      // No ?era= in the link: the browse opens in the reader's calendar preference (BS or AD).
      const e = (urlParams.era ?? eraForCalendar(getCalendarSystem())) as Era;
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

  // The दैनिक tab opens on this month; fetch its fuller month in the background once home is
  // drawn, so switching tabs shows the table at once instead of waiting on the network.
  const queryClient = useQueryClient();
  const homeShown = gridDays.length > 0;
  useEffect(() => {
    if (!homeShown || browseEra !== "bs") return;
    const timer = setTimeout(() => {
      void queryClient.prefetchQuery({
        queryKey: [...apiKeys.month(year, month, location.params), "full-slim"] as const,
        queryFn: () => fetchMonthCalendarOffline(year, month, location.params, { slim: true }),
      });
    }, 1500);
    return () => clearTimeout(timer);
    // Keyed on the place's contents: the params object can be new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeShown, browseEra, year, month, JSON.stringify(location.params), queryClient]);
  const aside = useHomeAside({
    context: homeMonth.context,
    todayAd,
    source: (dayAd) => ({
      queryKey: apiKeys.panchanga(dayAd, "ad", location.params),
      queryFn: () => fetchPanchanga(dayAd, "ad", location.params),
    }),
  });
  const { selectedDay, selectDay } = aside;

  // Day, Multi Day and Week: the sidebar's panchanga follows the planner's date, so stepping to next
  // Wednesday shows that day (भाइटीका and all). The month follows the planner first (above), so its days
  // hold the date once they load.
  useEffect(() => {
    if (plannerKind !== "day" && plannerKind !== "multi" && plannerKind !== "week") return;
    if (selectedDay?.date_ad === anchor) return;
    const day = gridDays.find((d) => d.date_ad === anchor && !d.outsideMonth) ?? gridDays.find((d) => d.date_ad === anchor);
    if (day) selectDay(day);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, plannerKind, gridDays]);

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
      <Reveal index={0}>
        <ScrollHero>{monthHeaderBlock}</ScrollHero>
      </Reveal>

      {plannerKind ? (
        // Edge to edge on a phone, like the month grid: the planner pads its own toolbar.
        <View>
          <PlannerView
            view={plannerKind}
            anchor={anchor}
            primaryDate={isGregorianEra(browseEra) ? "ad" : "bs"}
            onAnchorChange={setAnchor}
            onViewChange={(v) => setPatroView(v)}
            events={userEvents.events}
            marks={dayMarks.marks}
            slots={daySlots.slots}
            yogas={daySlots.yogas}
            personal={personalDays.columns}
            todayAd={todayAd}
            onOpenEvent={(event) => setDetail({ kind: "event", event })}
            onOpenMark={(date, name, holiday) => setDetail({ kind: "mark", date, name, holiday })}
            onOpenPersonal={(date, column) => setDetail({ kind: "personal", date, column })}
            onCreateAt={createAt}
            onMoveEvent={async (event, times) => {
              const { id: _id, ...input } = event;
              await updateEvent(event.id, { ...input, ...times });
              void queryClient.invalidateQueries({ queryKey: ["events"] });
            }}
            onDragChange={setPlannerDragging}
            // Swipe left / right steps forward / back a day, two days or a week, as the month grid's swipe does.
            wrapBody={(body) => (
              <MonthGridSwipe enabled={!plannerDragging} atStart={false} atEnd={false} onCommit={(dir) => setAnchor(plannerText.step(plannerKind, anchor, dir > 0 ? 1 : -1))}>
                {body}
              </MonthGridSwipe>
            )}
          />
        </View>
      ) : monthLoading ? (
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
              primaryDate={isGregorianEra(browseEra) ? "ad" : "bs"}
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
              saitSource={(day) => ({
                queryKey: apiKeys.panchanga(day.date_ad, "ad", location.params),
                queryFn: () => fetchPanchanga(day.date_ad, "ad", location.params),
              })}
              primaryDate={isGregorianEra(browseEra) ? "ad" : "bs"}
              events={userEvents.events}
              onLongPressDay={(day) => createAt(day.date_ad, day.date_ad === todayAd ? `${String(Math.min(23, new Date().getHours() + 1)).padStart(2, "0")}:00` : "09:00")}
              onOpenEvent={(event) => setDetail({ kind: "event", event })}
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
        onOpenEvent={(event) => setDetail({ kind: "event", event })}
        onOpenPersonal={(date, column) => setDetail({ kind: "personal", date, column })}
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
          <RateAppCard />
        </View>
      </Reveal>
    </View>
  );

  return (
    <>
      <PageScrollView
        ref={pageScrollerRef}
        // The day grid is part of this scroll; a dragged event block holds it still.
        scrollEnabled={!plannerDragging}
        refreshControl={refreshControl}
        className="flex-1 bg-background"
        contentContainerClassName="mx-auto w-full max-w-page"
        contentContainerStyle={{
          paddingBottom: navBottom,
          paddingHorizontal: pageInset,
          paddingTop: pageTopPadding(isCompact),
        }}
      >
        <>
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
              <SiteFooter className={homeClasses.footerNote} paddingHorizontal={cardInset} />
            </Reveal>
            </>
          ) : null}
        </>
        </PageScrollView>

        <EventEditSheet editor={editor} onClose={() => setEditor(null)} />
        <EventDetailSheet
          detail={detail}
          todayAd={todayAd}
          onClose={() => setDetail(null)}
          onEdit={(event) => {
            editAfterDetail.current = event;
            setDetail(null);
          }}
          onDismissed={() => {
            const event = editAfterDetail.current;
            editAfterDetail.current = null;
            if (event) setEditor({ event });
          }}
        />
    </>
  );
}

export default withDuoRailInset(HomeScreen);
