import { useCallback, useEffect, useRef, type ComponentRef } from "react";
import type { CalendarEvent } from "@vedic-patro/api-client";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useThemeColors } from "@/lib/theme-context";
import { useRouter } from "expo-router";
import { useDayEvents, usePersonalDays, type PersonalColumn } from "@vedic-patro/features/events";
import { NowWeatherBadge } from "@vedic-patro/ui/kit/weather";
import { useNowWeather } from "@vedic-patro/features/weather";
import { DEFAULT_PANCHANGA_LOCATION } from "@vedic-patro/read-models/geography/panchanga-location";
import { DayEvents, PersonalDayChip } from "@vedic-patro/ui/kit/events";
import { MuhurtaAsidePanel } from "@vedic-patro/ui/kit/shell";
import { useAuth } from "@/lib/auth/AuthContext";
import { requestAddReminder } from "@/lib/menu-request";
import { TodayHighlightCard } from "./TodayHighlightCard";
import { PanchangaVivaranPanel } from "./PanchangaVivaranPanel";
import { SaitAsidePanel } from "./SaitAsidePanel";
import { HomeAsideTabBar, type AsideTabId } from "./HomeAsideTabs";
import type { CalendarDay, LocationParams, PanchangaDay } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { panchangaMatchesAside } from "@/lib/panchanga-aside-match";
import { type Era, isGregorianEra } from "@vedic-patro/domain/calendar/era";
import { adToBS } from "@vedic-patro/domain/calendar/bs-calendar";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { usePageScrollY } from "@/lib/scroll-motion";
import { setHomeTabsTop } from "@/lib/home-sticky";

type Props = {
  month: number;
  year: number;
  selectedAd: string;
  todayAd: string;
  selectedDay: CalendarDay | null;
  contextDays: CalendarDay[];
  p?: PanchangaDay;
  loading: boolean;
  error: boolean;
  onRetry?: () => void;
  location?: LocationParams;
  browseEra?: Era;
  /** Which of the three tabs (panchanga / sait / daily muhurta) is showing. Owned by the home screen, so its pinned copy shares it. */
  asideTab: AsideTabId;
  onAsideTabChange: (tab: AsideTabId) => void;
  /** The side inset the two cards keep (the home screen's card inset). The
      tabs do NOT take it: they run left edge to right edge of the screen,
      exactly like their pinned copy, so pinning is invisible. */
  bleedInset?: number;
  /** A listed event was tapped: show its details. */
  onOpenEvent?: (event: CalendarEvent) => void;
  /** The day's personal reading was tapped: show it in full. */
  onOpenPersonal?: (date: string, column: PersonalColumn) => void;
};

export function PanchangaAsidePanel({
  month,
  year,
  selectedAd,
  todayAd,
  selectedDay,
  contextDays,
  p,
  loading,
  error,
  onRetry,
  location,
  browseEra = "bs",
  asideTab,
  onAsideTabChange,
  bleedInset = 0,
  onOpenEvent,
  onOpenPersonal,
}: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { scrollY } = usePageScrollY();
  const insets = useSafeAreaInsets();
  const dayEvents = useDayEvents(selectedAd, isAuthenticated);
  // "तपाईंको दिन · शुभ · …" for this day, as the planner's all-day row shows it.
  const personalDays = usePersonalDays([selectedAd], location ?? DEFAULT_PANCHANGA_LOCATION.params, isAuthenticated);
  // The weather now beside today's date (only when today is the day shown).
  const nowWeather = useNowWeather(location ?? DEFAULT_PANCHANGA_LOCATION.params, selectedAd === todayAd);

  const contextDay =
    selectedDay ??
    contextDays.find((d) => d.date_ad === selectedAd) ??
    contextDays.find((d) => d.day === 1) ??
    contextDays[0] ??
    null;

  const isSelectedToday = selectedAd === todayAd;
  const isAdCalendar = isGregorianEra(browseEra);
  const activeP = panchangaMatchesAside(p, selectedAd, { year, month, isAdCalendar }, contextDay)
    ? p
    : undefined;

  // The sait list is keyed by the BS month, so in AD browsing convert the
  // selected day back to BS (the web does the same).
  const saitDate = isAdCalendar ? adToBS(new Date(`${selectedAd}T12:00:00`)) : null;
  const saitYear = saitDate?.year ?? year;
  const saitMonth = saitDate?.month ?? month;
  const saitHighlightDay = saitDate?.day ?? selectedDay?.day;

  // Where the tab bar sits in the scroll, so the pinned copy knows when the
  // tabs reach the top. `measure` gives the bar's top on screen; adding the
  // scroll offset gives its top in the scroll content. Re-measured whenever
  // anything above the tabs moves them (a new month, a new day, data loading).
  // The measure runs on the next frame, after layout has settled: measuring
  // inside onLayout can return the pre-layout position (pageY 0), which
  // leaves the tabs unpinned (a top of 0 means "not measured yet").
  const tabBarRef = useRef<ComponentRef<typeof View>>(null);
  const measureTabBar = useCallback(() => {
    requestAnimationFrame(() => {
      tabBarRef.current?.measure((_x, _y, _w, _h, _pageX, pageY) => {
        setHomeTabsTop(pageY + scrollY.value - insets.top);
      });
    });
  }, [scrollY, insets.top]);
  useEffect(() => {
    measureTabBar();
  }, [measureTabBar, selectedAd, loading, p, month, year]);

  // The aside is two cards with the tabs between them. The tabs run left
  // edge to right edge of the screen, exactly like the pinned copy, so
  // pinning is invisible: the same bar, same place, just stuck. They are
  // full width by construction — this panel's container has no side padding,
  // only the two cards keep the side inset (bleedInset) — instead of a
  // negative margin that has to guess the inset exactly.
  return (
    <View className="gap-2">
      <View className={homeClasses.asideShell} style={{ marginHorizontal: bleedInset, width: "auto", alignSelf: "stretch" }}>
        <View className={homeClasses.asideHeader}>
          <Text className={homeClasses.asideTitle}>
            {isSelectedToday ? t("ui.home.today_s_panchanga") : t("learn.diagrams.hierarchy_converge")}
          </Text>
          <Pressable onPress={() => router.push({ pathname: "/panchanga", params: { date: selectedAd } })}>
            <Text className={homeClasses.asideLink}>{t("ui.home.full_detail")}</Text>
          </Pressable>
        </View>

        <TodayHighlightCard
          selectedDay={contextDay}
          selectedAdDate={selectedAd}
          todayAd={todayAd}
          isAdCalendar={isAdCalendar}
          year={year}
          month={month}
          p={activeP}
          aside={nowWeather && selectedAd === todayAd ? (
              <Pressable onPress={() => router.push("/weather")} accessibilityRole="link">
                <NowWeatherBadge weather={nowWeather} />
              </Pressable>
            ) : null}
        />
        <View className="gap-2 px-4 pt-3">
          <PersonalDayChip date={selectedAd} column={personalDays.columns.get(selectedAd)} onOpen={onOpenPersonal} />
          <DayEvents events={dayEvents.events} onOpen={onOpenEvent} />
          {/* The "+" from here: an event, task or appointment that starts on this day. */}
          {isAuthenticated ? (
            <Pressable
              onPress={() => requestAddReminder(selectedAd)}
              accessibilityRole="button"
              className={homeClasses.asideAddToDay}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.secondary} />
              <Text className={homeClasses.asideAddToDayLabel}>{t("events.add_to_day")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* The three tabs, as on the web: panchanga, sait, daily muhurta. The
          pinned copy (index.tsx) shares the same tab and handler. Full width:
          no side margin here, the container has no side padding. */}
      <HomeAsideTabBar tab={asideTab} onTabChange={onAsideTabChange} tabBarRef={tabBarRef} onTabBarLayout={measureTabBar} />

      <View className={homeClasses.asideShell} style={{ marginHorizontal: bleedInset, width: "auto", alignSelf: "stretch" }}>
        <View className={homeClasses.asideBody}>
          <View className={homeClasses.asidePanel}>
            {asideTab === "sait" ? (
              <SaitAsidePanel year={saitYear} month={saitMonth} highlightDay={saitHighlightDay} location={location} />
            ) : asideTab === "muhurta" ? (
              activeP ? (
                <MuhurtaAsidePanel
                  p={activeP}
                  hintIcon={<Ionicons name="information-circle-outline" size={13} color={colors.mutedForeground} />}
                />
              ) : error ? (
                <ErrorState message={t("ui.common.could_not_load_panchanga")} onRetry={onRetry} />
              ) : (
                <LoadingState />
              )
            ) : error && !p ? (
              <ErrorState message={t("ui.common.could_not_load_panchanga")} onRetry={onRetry} />
            ) : loading && !p ? (
              <LoadingState />
            ) : (
              <PanchangaVivaranPanel
                p={activeP}
                selectedDay={contextDay}
                selectedAd={selectedAd}
                loading={loading && !activeP}
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
