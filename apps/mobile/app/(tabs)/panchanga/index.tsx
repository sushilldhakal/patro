import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { DayTimeline, EphemerisModeBanner } from "@vedic-patro/ui/kit/panchanga";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { PanchangaWheel } from "@/components/panchanga/PanchangaWheel";
import { PanchangaAsidePanels } from "@/components/panchanga/PanchangaAsidePanels";
import { useDayCycleTabs } from "@/components/panchanga/use-day-cycle-tabs";
import { PanchangaDateNav } from "@/components/panchanga/PanchangaDateNav";
import { useAppPanchangaPage } from "@/components/panchanga/use-app-panchanga-page";
import {
  DinVisheshSection,
  FestivalsSection,
  NivasShoolSection,
  PanchangCoreSection,
  BalamSection,
  PanchakaLagnaSection,
  RashiSection,
  RituSection,
  SunMoonSamvatSection,
} from "@vedic-patro/ui/kit/panchanga";
import { GocharPromoCard } from "@vedic-patro/ui/kit/panchanga";
import { LearnMoreCard } from "@/components/learn/LearnMoreCard";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useInPanchangaTabsShell } from "@/components/panchanga/PanchangaTabsShell";
import { useThemeColors } from "@/lib/theme-context";
import { floatingNavBottomPadding, pageTopPadding, PAGE_HORIZONTAL_PADDING, PANCHANGA_SIDEBAR_SPLIT, PANCHANGA_SIDEBAR_WIDTH } from "@/lib/mobile-nav";
import { useBreakpoint } from "@/lib/responsive";
import { useDeferredMount } from "@/lib/use-deferred-mount";
import { cn } from "@vedic-patro/domain/utils";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { usePageRefreshControl } from "@/components/ui/PageRefreshControl";
import { useWindowReminder } from "@/components/reminders/use-window-reminder";
import { resolveWindowKey } from "@/lib/notifications/window-key";
import { useLocale } from "@/lib/i18n";

/** Daily panchanga — the app's drawing of `usePanchangaPage` (@vedic-patro/features). */
export default function PanchangaScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { width, isTablet, isCompact } = useBreakpoint();
  const inShell = useInPanchangaTabsShell();
  const pagePadH = inShell ? 0 : PAGE_HORIZONTAL_PADDING;
  const splitSidebar = width >= PANCHANGA_SIDEBAR_SPLIT;
  /* The wheel, the nine sections and the aside's chart are below the fold on a
     phone; drawing them with the date bar and timeline in one frame is what held
     the screen blank on open. They follow as soon as the screen has drawn. */
  const belowFold = useDeferredMount();
  const refreshControl = usePageRefreshControl();
  const { page, location, setLocation, ready, date, setDate, clock, adDateStr, commitCalendar } = useAppPanchangaPage();
  const { wheelData, data, angaData, bs, showWheelSkeleton, dayCycleMode, setDayCycleMode } = page;

  const dayCycleTabs = useDayCycleTabs(dayCycleMode, setDayCycleMode);
  const { t, pick } = useLocale();
  const reminder = useWindowReminder();

  if (page.failed) {
    return (
      <ScrollView
        refreshControl={refreshControl}
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: floatingNavBottomPadding(isTablet), paddingHorizontal: pagePadH, paddingTop: pageTopPadding(isCompact) }}
      >
        <ErrorState message={page.copy.error} onRetry={page.retry} />
      </ScrollView>
    );
  }

  // Only while the saved place is unknown (primed at launch, so rarely). While
  // the day loads, the page below draws its own skeletons under a live date bar.
  if (!ready) {
    return (
      <ScrollView
        refreshControl={refreshControl}
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: floatingNavBottomPadding(isTablet), paddingHorizontal: pagePadH, paddingTop: pageTopPadding(isCompact) }}
      >
        <LoadingState />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      refreshControl={refreshControl}
      className="mx-auto w-full max-w-page flex-1 bg-background"
      contentContainerStyle={{
        paddingBottom: floatingNavBottomPadding(isTablet),
        paddingTop: pageTopPadding(isCompact),
        paddingHorizontal: pagePadH,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View
        className="gap-4"
        style={splitSidebar ? { flexDirection: "row", alignItems: "flex-start", gap: 20 } : undefined}
      >
        {/* flex-1 only beside the sidebar: stacked in the scroll column it has a zero
            basis and was squeezed under the aside when that mounted. */}
        <View className={cn(splitSidebar && "flex-1", panchangaPageClasses.page.mainColumn)}>
          <PanchangaDateNav
            date={date}
            onDateChange={setDate}
            todayAd={page.todayAd}
            adDateStr={adDateStr}
            wheelData={wheelData}
            clock={clock}
            onClockChange={page.changeClock}
            tabs={dayCycleTabs.tabs}
            tabsLabel={dayCycleTabs.label}
            location={location}
            onLocationChange={setLocation}
          />
          {page.ephemeris && data ? <EphemerisModeBanner p={data} clock={clock} viewedDateAd={page.civilAnchor} /> : null}
          {wheelData || showWheelSkeleton ? (
            <DayTimeline
              p={wheelData}
              loading={showWheelSkeleton}
              dateAd={adDateStr}
              isToday={page.isToday}
              timezone={page.timeZone}
              needleClock={page.clockUserAdjusted ? clock : undefined}
              showNeedle={page.clockUserAdjusted || page.isToday}
              mode={dayCycleMode}
              civil={page.civilTimeline}
              civilLoading={page.civilLoading}
              remindLabel={t("ui.home.set_a_reminder")}
              onRemind={(period) =>
                void reminder.open({
                  windowKey: resolveWindowKey(period),
                  subtitle: `${pick(period.ne, period.en)} · ${period.time}`,
                })
              }
              renderStatus={(mark) => (
                <GrahaStatusBadges planetKey={mark.planetKey} isRetrograde={mark.isRetrograde} isCombust={mark.isCombust} size={mark.size} />
              )}
            />
          ) : null}
        </View>

        {splitSidebar || belowFold ? (
        <View
          className={panchangaPageClasses.page.aside}
          style={
            splitSidebar
              ? { width: PANCHANGA_SIDEBAR_WIDTH, flexShrink: 0, alignSelf: "flex-start" }
              : { width: "100%" }
          }
        >
          <PanchangaAsidePanels
            sunrise={page.sunrise}
            sunset={page.sunset}
            timezone={page.timeZone}
            chartData={data}
            jdUt={page.jdUt}
            refDateAd={page.civilAnchor}
            location={location.params}
            planetEventsHref="/gochar"
          />
        </View>
        ) : null}
      </View>

      {belowFold ? (
      <View className={panchangaPageClasses.page.sections}>
        {wheelData || showWheelSkeleton ? (
          <>
            <PanchangaWheel
              p={wheelData}
              loading={showWheelSkeleton}
              bsYear={bs.year}
              bsMonthNe={bs.monthName}
              bsDay={bs.day}
              isToday={page.isToday}
              timezone={page.timeZone}
              locationLabel={page.locationLabel}
              clock={clock}
              calendarPick={{
                year: bs.year,
                month: bs.month,
                day: bs.day,
                clock,
                todayAd: page.todayAd,
                onCommit: commitCalendar,
              }}
            />
            {wheelData ? (
              <Pressable
                onPress={() => router.push("/panchanga/year")}
                className={cn("flex-row active:bg-muted", panchangaPageClasses.page.yearLink)}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.foreground} />
                <Text className={panchangaPageClasses.page.yearLinkText}>
                  {page.copy.yearLink}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {page.loadError ? (
          <View className={panchangaPageClasses.page.errorBox}>
            <Text className={panchangaPageClasses.page.errorText}>
              {page.copy.error}
            </Text>
          </View>
        ) : null}

        {data ? (
          <View className={panchangaPageClasses.page.sectionStack}>
            <SunMoonSamvatSection p={data} />
            <PanchangCoreSection p={angaData ?? data} />
            <RashiSection p={angaData ?? data} />
            <RituSection p={data} />
            <BalamSection p={angaData ?? data} clock={clock} />
            <PanchakaLagnaSection p={angaData ?? data} clock={clock} />
            <NivasShoolSection p={data} fallback={wheelData} />
            <DinVisheshSection p={data} />
            <FestivalsSection p={data} />
          </View>
        ) : null}

        <GocharPromoCard onPress={() => router.push("/gochar" as never)} />
        <LearnMoreCard
          heading={page.copy.learnHeading}
          slugs={page.learnSlugs}
        />
      </View>
      ) : null}
      {reminder.element}
    </ScrollView>
  );
}
