import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRootNavigationState, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueries, useQuery } from "@tanstack/react-query";
import { BsMonthHeaderTitle } from "@/components/home/BsMonthHeaderTitle";
import { BsCalendarGrid } from "@/components/home/BsCalendarGrid";
import { PanchangaAsidePanel } from "@/components/home/PanchangaAsidePanel";
import { PanchangaMonthGrid } from "@/components/home/PanchangaMonthGrid";
import { type HomePatroView } from "@/components/home/PatroViewToggle";
import { PatroFooterNote } from "@/components/branding/PatroFooterNote";
import { HomeRashifalSection } from "@/components/home/HomeRashifalSection";
import { AakashGocharEntryCard } from "@/components/home/AakashGocharEntryCard";
import { HomeQuickLinks } from "@/components/home/HomeQuickLinks";
import { TodayHighlightCard } from "@/components/home/TodayHighlightCard";
import { PanchangaDirectoryMobile } from "@/components/panchanga/PanchangaDirectoryMobile";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { ErrorState } from "@/components/ui/States";
import {
  apiKeys,
  fetchFestivals,
  fetchPanchanga,
  fetchSaitMonthAll,
  type CalendarDay,
  type Festival,
  type MonthBrowseEra,
} from "@/lib/api";
import { fetchMonthCalendarOffline } from "@/lib/offline/offline-month";
import { OfflineUnavailableError } from "@/lib/offline/offline-store";
import { OfflineDownloadPrompt } from "@/components/offline/OfflineDownloadPrompt";
import {
  BS_SUPPORTED_END_YEAR,
  BS_SUPPORTED_START_YEAR,
  adToBS,
  todayAdString,
} from "@/lib/bs-calendar";
import {
  applyHolidaysToDays,
  buildAdCalendarGridDays,
  buildCalendarGridDays,
  buildLocalAdMonthDays,
  buildLocalMonthDays,
  getBsMonthsOverlappingAdMonth,
  mergeEnrichedDays,
} from "@/lib/local-calendar";
import { useLocale } from "@/lib/i18n";
import { floatingNavBottomPadding, homeContentInset } from "@/lib/mobile-nav";
import { formatPatroMonthCrossEraSubtitle } from "@/lib/patro-headline-subtitle";
import { PATRO_BROWSE_ERAS, isGregorianBrowseEra, type PatroBrowseEra } from "@/lib/patro-era";
import { shiftPatroBrowseMonth } from "@/lib/patro-year-browse-step";
import { usePatroMonthBrowse } from "@/lib/use-patro-month-browse";
import { useBreakpoint } from "@/lib/responsive";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

const ASIDE_SIDEBAR_SPLIT = 1280;
const ASIDE_WIDTH = 360;
const ASIDE_MAX_WIDTH = 400;

function monthStartAd(ctx: { year: number; month: number; days: CalendarDay[] }): string {
  const first = ctx.days.find((d) => d.day === 1) ?? ctx.days[0];
  return first?.date_ad ?? todayAdString();
}

function mergeMonthFromApi(
  era: MonthBrowseEra,
  year: number,
  month: number,
  calendar: CalendarDay[] | undefined,
  lang: string,
  festivals: Festival[] | undefined,
) {
  const local = isGregorianBrowseEra(era)
    ? buildLocalAdMonthDays(year, month)
    : buildLocalMonthDays(year, month);
  let merged = calendar?.length ? mergeEnrichedDays(local, calendar) : local;
  if (festivals?.length) merged = applyHolidaysToDays(merged, festivals, lang);
  return merged;
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const { pick, digits, lang } = useLocale();
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
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [dayOpen, setDayOpen] = useState(false);
  const [patroView, setPatroView] = useState<HomePatroView>("calendar");
  const todayAd = todayAdString();
  const splitAside = width >= ASIDE_SIDEBAR_SPLIT;

  // The browsed era/year/month lives in the address (?era=&year=&month=), like the
  // website, so a shared link reopens the same month and it survives a relaunch.
  const urlParams = useLocalSearchParams<{ era?: string; year?: string; month?: string }>();
  const router = useRouter();
  const pendingBrowse = useRef<{ era: PatroBrowseEra; year: number; month: number } | null>(
    (() => {
      const y = Number(urlParams.year);
      const m = Number(urlParams.month);
      const e = (urlParams.era ?? "bs") as PatroBrowseEra;
      if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null;
      if (!(PATRO_BROWSE_ERAS as readonly string[]).includes(e)) return null;
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

  const prevBm = useMemo(
    () => shiftPatroBrowseMonth(browseEra, year, month, -1),
    [browseEra, year, month],
  );
  const nextBm = useMemo(
    () => shiftPatroBrowseMonth(browseEra, year, month, 1),
    [browseEra, year, month],
  );
  const canFetchPrev = isGregorianBrowseEra(browseEra)
    ? !(year === 1 && month === 1)
    : !(month === 1 && year <= BS_SUPPORTED_START_YEAR);
  const canFetchNext = isGregorianBrowseEra(browseEra)
    ? true
    : !(month === 12 && year >= BS_SUPPORTED_END_YEAR);

  // Tapping a day opens its detail window (as on the website). On a wide split
  // layout the side panel already shows it, so only the selection changes.
  const handleSelectDay = useCallback(
    (day: CalendarDay) => {
      if (day.outsideMonth) return;
      setSelectedDay(day);
      if (!splitAside) setDayOpen(true);
    },
    [splitAside],
  );

  const monthQueries = useQueries({
    queries: [
      {
        queryKey: apiKeys.month(prevBm.year, prevBm.month, location.params, browseEra),
        queryFn: () => fetchMonthCalendarOffline(prevBm.year, prevBm.month, location.params, { era: browseEra }),
        staleTime: 1000 * 60 * 60,
        enabled: canFetchPrev,
      },
      {
        queryKey: apiKeys.month(year, month, location.params, browseEra),
        queryFn: () => fetchMonthCalendarOffline(year, month, location.params, { era: browseEra }),
        staleTime: 1000 * 60 * 60,
      },
      {
        queryKey: apiKeys.month(nextBm.year, nextBm.month, location.params, browseEra),
        queryFn: () => fetchMonthCalendarOffline(nextBm.year, nextBm.month, location.params, { era: browseEra }),
        staleTime: 1000 * 60 * 60,
        enabled: canFetchNext,
      },
    ],
  });

  const [prevQ, currentQ, nextQ] = monthQueries;

  const festivalYears = useMemo(() => {
    if (isGregorianBrowseEra(browseEra)) {
      const overlapping = getBsMonthsOverlappingAdMonth(year, month);
      const years = new Set(overlapping.map((m) => m.year));
      years.add(adToBS(new Date(`${todayAd}T12:00:00`)).year);
      return [...years].filter((y) => y >= 60 && y <= BS_SUPPORTED_END_YEAR);
    }
    const years = new Set<number>([year, prevBm.year, nextBm.year]);
    return [...years].filter((y) => y >= 60 && y <= BS_SUPPORTED_END_YEAR);
  }, [browseEra, year, month, prevBm.year, nextBm.year, todayAd]);

  const festivalQueries = useQuery({
    queryKey: ["festivals-home", ...festivalYears, lang],
    queryFn: async () => {
      const lists = await Promise.all(festivalYears.map((y) => fetchFestivals(y, lang === "en" ? "en" : "ne")));
      const byKey = new Map<string, (typeof lists)[0]["festivals"][0]>();
      for (const res of lists) {
        for (const f of res.festivals ?? []) {
          if (f.start_date) byKey.set(`${f.id}:${f.start_date}`, f);
        }
      }
      return [...byKey.values()];
    },
    staleTime: 1000 * 60 * 60,
  });

  const yearFestivals = festivalQueries.data;

  const crossEraSubtitle = useMemo(
    () => formatPatroMonthCrossEraSubtitle(browseEra, year, month, lang, digits),
    [browseEra, year, month, lang, digits],
  );

  const monthDays = useMemo(
    () =>
      mergeMonthFromApi(browseEra, year, month, currentQ.data?.calendar, lang, yearFestivals),
    [browseEra, year, month, currentQ.data?.calendar, lang, yearFestivals],
  );

  const gridDays = useMemo(() => {
    const enriched = {
      prev: prevQ.data?.calendar,
      current: currentQ.data?.calendar,
      next: nextQ.data?.calendar,
    };
    if (isGregorianBrowseEra(browseEra)) {
      let grid = buildAdCalendarGridDays(year, month, enriched);
      if (yearFestivals?.length) grid = applyHolidaysToDays(grid, yearFestivals, lang);
      return grid;
    }
    let grid = buildCalendarGridDays(year, month, enriched);
    if (yearFestivals?.length) grid = applyHolidaysToDays(grid, yearFestivals, lang);
    return grid;
  }, [
    browseEra,
    year,
    month,
    prevQ.data?.calendar,
    currentQ.data?.calendar,
    nextQ.data?.calendar,
    yearFestivals,
    lang,
  ]);

  const viewingCurrentMonth = useMemo(() => {
    if (isGregorianBrowseEra(browseEra)) {
      const d = new Date(`${todayAd}T12:00:00`);
      return year === d.getFullYear() && month === d.getMonth() + 1;
    }
    const todayBs = adToBS(new Date(`${todayAd}T12:00:00`));
    return year === todayBs.year && month === todayBs.month;
  }, [browseEra, year, month, todayAd]);

  const asideAdDate = useMemo(() => {
    if (selectedDay?.date_ad) return selectedDay.date_ad;
    if (viewingCurrentMonth) return todayAd;
    return monthStartAd({ year, month, days: monthDays });
  }, [selectedDay, viewingCurrentMonth, todayAd, year, month, monthDays]);

  const panchangaQ = useQuery({
    queryKey: apiKeys.panchanga(asideAdDate, "ad", location.params),
    queryFn: () => fetchPanchanga(asideAdDate, "ad", location.params),
  });

  const saitQ = useQuery({
    queryKey: apiKeys.saitMonthAll(year, month, location.params),
    queryFn: () => fetchSaitMonthAll(year, month, location.params),
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  const publicHolidayDates = useMemo(() => {
    const set = new Set<string>();
    for (const d of monthDays) {
      if (d.is_public_holiday) set.add(d.date_ad);
    }
    return set;
  }, [monthDays]);

  const goMonth = useCallback(
    (delta: number) => {
      stepMonth(delta);
      setSelectedDay(null);
    },
    [stepMonth],
  );

  const goToday = () => {
    goTodayBrowse(todayAd);
    setSelectedDay(null);
  };

  const monthLoading = currentQ.isLoading && !currentQ.data;
  const monthError = currentQ.isError;
  const monthFetching = monthQueries.some((q) => q.isFetching && q.data);

  const contentInset = homeContentInset(isPhone);

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
          setSelectedDay(null);
        }}
        onYearChange={(y) => {
          setYear(y);
          setSelectedDay(null);
        }}
        prevDisabled={!canFetchPrev}
        nextDisabled={!canFetchNext}
        patroView={patroView}
        onPatroViewChange={(v) => {
          setPatroView(v);
          setSelectedDay(null);
        }}
        location={location}
        onLocationChange={setLocation}
      />
    </View>
  );

  const calendarBlock = (
    <View className="min-w-0 flex-1">
      {monthHeaderBlock}

      {monthLoading ? (
        <View className="py-16" style={{ paddingHorizontal: contentInset }}>
          <VedicPatroLoader />
        </View>
      ) : monthError ? (
        <View style={{ paddingHorizontal: contentInset }}>
          <ErrorState
            message={
              currentQ.error instanceof OfflineUnavailableError
                ? pick(
                    "तपाईं अफलाइन हुनुहुन्छ र यो पात्रो अझै डाउनलोड गरिएको छैन।",
                    "You're offline and this calendar hasn't been downloaded yet.",
                  )
                : pick("पात्रो लोड गर्न सकिएन।", "Could not load calendar.")
            }
            onRetry={() => currentQ.refetch()}
          />
        </View>
      ) : patroView === "panchanga" ? (
        <PanchangaMonthGrid
          days={gridDays}
          year={year}
          month={month}
          todayAd={todayAd}
          selectedAd={selectedDay?.date_ad ?? (viewingCurrentMonth ? todayAd : undefined)}
          loading={monthFetching}
          onPickDay={handleSelectDay}
          edgeToEdge={isPhone}
        />
      ) : (
        <BsCalendarGrid
          days={gridDays}
          selectedAd={selectedDay?.date_ad ?? (viewingCurrentMonth ? todayAd : undefined)}
          todayAd={todayAd}
          publicHolidayDates={publicHolidayDates}
          onSelectDay={handleSelectDay}
          isEnriching={monthFetching}
          primaryDate={isGregorianBrowseEra(browseEra) ? "ad" : "bs"}
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
              paddingHorizontal: contentInset,
            }
      }
      className="min-w-0 w-full"
    >
      <PanchangaAsidePanel
        month={month}
        year={year}
        selectedAd={asideAdDate}
        todayAd={todayAd}
        selectedDay={selectedDay}
        contextDays={monthDays}
        p={panchangaQ.data}
        loading={panchangaQ.isLoading}
        error={panchangaQ.isError}
        onRetry={() => panchangaQ.refetch()}
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
    <View className="min-w-0 flex-1">
      {calendarBlock}

      <View className="mt-3 gap-3" style={{ paddingHorizontal: contentInset }}>
        {isPhone ? (
          <TodayHighlightCard
            selectedDay={selectedDay}
            selectedAdDate={asideAdDate}
            todayAd={todayAd}
            isAdCalendar={isGregorianBrowseEra(browseEra)}
            year={year}
            month={month}
            location={location.params}
            p={panchangaQ.data}
            onOpenDay={() => {
              if (!selectedDay) {
                const day = monthDays.find((d) => d.date_ad === asideAdDate);
                if (day) setSelectedDay(day);
              }
              setDayOpen(true);
            }}
          />
        ) : null}
        <AakashGocharEntryCard />
        <OfflineDownloadPrompt year={year} era={browseEra} />
      </View>
    </View>
  );

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="mx-auto w-full max-w-[1400px]"
        contentContainerStyle={{
          paddingBottom: floatingNavBottomPadding(isTablet),
          paddingHorizontal: isPhone ? 0 : contentInset,
          paddingTop: isPhone ? 12 : 16,
        }}
      >
        <View className={splitAside ? "flex-row items-start gap-5" : "gap-5"}>
          {leftColumn}
          {isPhone ? null : asideBlock}
        </View>

        <View className="mt-6">
          <HomeRashifalSection
            dateAd={asideAdDate}
            location={location.params}
            contentInset={contentInset}
          />
        </View>

        <View className="mt-8" style={{ paddingHorizontal: contentInset }}>
          <HomeQuickLinks />
        </View>

        <View className="mt-4" style={{ paddingHorizontal: contentInset }}>
          <PanchangaDirectoryMobile />
        </View>

        <PatroFooterNote paddingHorizontal={contentInset} />
      </ScrollView>

      <BottomSheetModal visible={dayOpen} onClose={() => setDayOpen(false)} maxHeight="92%">
        <View className="flex-row items-center justify-between px-4 pb-1 pt-2">
          <Text className="text-base font-bold text-foreground">{pick("दिन विवरण", "Day detail")}</Text>
          <Pressable onPress={() => setDayOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={pick("बन्द", "Close")}>
            <Ionicons name="close" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {asideBlock}
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}
