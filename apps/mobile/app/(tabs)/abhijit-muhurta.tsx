import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { useAbhijitPage, type AbhijitDayView } from "@vedic-patro/features/abhijit";
import { formatPatroMonthCrossEraSubtitle } from "@vedic-patro/domain/patro-headline-subtitle";
import { space } from "@vedic-patro/design-tokens";
import { abhijitClasses as ac } from "@vedic-patro/design-tokens/classes/abhijit-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Ionicons } from "@/components/icons/Ionicons";
import { Grid } from "@vedic-patro/ui";
import { AppShell } from "@/components/AppShell";
import { PatroMonthYearNavBlock } from "@/components/patro-date/PatroMonthYearNavBlock";
import { SunriseSunsetIcon } from "@/components/panchanga/SunriseSunsetIcon";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { fetchMonthCalendarOffline } from "@/lib/offline/offline-month";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { usePatroMonthBrowse } from "@/lib/use-patro-month-browse";
import { applyMonthLimits } from "@/lib/use-patro-capabilities";

/** Abhijit muhurta — the app's drawing of `useAbhijitPage` (@vedic-patro/features). */
export default function AbhijitMuhurtaScreen() {
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear, month, setMonth, stepMonth, goToday } = usePatroMonthBrowse();
  const page = useAbhijitPage({ era, year, month, location: location.params }, fetchMonthCalendarOffline);
  const { t, lang, digits } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const today = page.today;

  useEffect(() => {
    applyMonthLimits(page.data?.limits);
  }, [page.data?.limits]);

  const crossEraSubtitle = useMemo(
    () => formatPatroMonthCrossEraSubtitle(era, year, month, lang, digits),
    [era, year, month, lang, digits],
  );

  // Same column steps as the website's grid (3 / sm:4 / md:6 / lg:7 / xl:8).
  const cols = width >= 1280 ? 8 : width >= 1024 ? 7 : width >= 768 ? 6 : width >= 640 ? 4 : 3;

  return (
    <AppShell title={t("nav.abhijit_muhurta")} showHeader={false}>
      <View className="mb-6">
        <View className={ac.titleRow}>
          <AppNavIcon name="sparkles" size={28} color={colors.secondary} />
          <Text className={cn(ac.title, "flex-1 text-3xl")} style={nepaliTextStyle()}>
            {page.copy.title}
          </Text>
        </View>
        <Text className={ac.subtitle} style={nepaliTextStyle()}>
          {page.copy.subtitle}
        </Text>
      </View>

      <PatroMonthYearNavBlock
        era={era}
        onEraChange={setEra}
        year={year}
        month={month}
        onMonthChange={setMonth}
        onYearChange={setYear}
        location={location}
        onLocationChange={setLocation}
        crossEraSubtitle={crossEraSubtitle}
        onToday={() => goToday(page.todayAd)}
        onPrev={() => stepMonth(-1)}
        onNext={() => stepMonth(1)}
      />

      {today ? (
        <View className={cn(ac.hero, "mt-6 gap-4 bg-secondary/10")}>
          <View>
            <Text className={ac.heroEyebrow} style={nepaliTextStyle()}>
              {page.copy.todayHero}
            </Text>
            <Text className={ac.heroDate} style={nepaliTextStyle()}>
              {today.day} · {today.weekday} · <Text className={ac.heroDateAd}>{today.dateAd}</Text>
            </Text>
            <Text className={cn(ac.heroRange, "text-2xl sm:text-3xl")} style={nepaliTextStyle()}>
              {today.range}
            </Text>
            <Text className={ac.heroNoon} style={nepaliTextStyle()}>
              {page.copy.noon}: <Text className={ac.heroNoonValue} style={nepaliTextStyle()}>{today.noon}</Text>
            </Text>
          </View>
          <View className={ac.sunPanel}>
            <View className="flex-row flex-wrap items-center gap-x-3 gap-y-2">
              <View className="flex-row items-center gap-2">
                <SunriseSunsetIcon variant="rise" size={16} color={colors.primary} />
                <Text className="font-num text-sm" style={nepaliTextStyle()}>
                  {today.sunrise}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <SunriseSunsetIcon variant="set" size={16} color={colors.secondary} />
                <Text className="font-num text-sm" style={nepaliTextStyle()}>
                  {today.sunset}
                </Text>
              </View>
            </View>
            <Text className={ac.sunDate} style={nepaliTextStyle()}>
              {today.dateAd}
            </Text>
          </View>
        </View>
      ) : null}

      <View className={cn(ac.noteBox, ac.noteRow, "mt-6")}>
        <Ionicons name="sparkles-outline" size={16} color={colors.secondary} style={{ marginTop: space.hair }} />
        <Text className={cn(ac.noteText, "flex-1")} style={nepaliTextStyle()}>
          {page.copy.note}
        </Text>
      </View>

      <View className={cn(ac.headingRow, "mt-6")}>
        <Text className={ac.heading} style={nepaliTextStyle()}>
          {page.copy.heading}
        </Text>
        {page.status === "ready" && page.copy.count ? (
          <View className={ac.countPill}>
            <Text className={ac.countText} style={nepaliTextStyle()}>
              {page.copy.count}
            </Text>
          </View>
        ) : null}
      </View>

      {page.status === "error" ? (
        <View className={cn(ac.errorBox, "mt-6")}>
          <Text className={ac.errorText} style={nepaliTextStyle()}>
            {page.copy.error}
          </Text>
        </View>
      ) : page.status === "loading" ? (
        <SkeletonPulse className={cn(ac.skeleton, "mt-6 bg-foreground/5")} />
      ) : page.days.length === 0 ? (
        <Text className={ac.empty} style={nepaliTextStyle()}>
          {page.copy.none}
        </Text>
      ) : (
        <View className={cn(ac.gridWrap, "mt-6")}>
          {/* Measured cells: percent widths plus gaps overflowed a 375pt phone (3rd card wrapped). */}
          <Grid cols={cols} gap={8}>
            {page.days.map((d) => (
              <DayCard key={d.key} day={d} todayBadge={page.copy.todayBadge} noonLabel={page.copy.noon} />
            ))}
          </Grid>
        </View>
      )}
    </AppShell>
  );
}

function DayCard({ day, todayBadge, noonLabel }: { day: AbhijitDayView; todayBadge: string; noonLabel: string }) {
  return (
    <View className={cn(ac.dayCard, day.isToday ? ac.dayCardToday : ac.dayCardIdle)}>
      <View className={ac.dayHead}>
        <Text numberOfLines={1} className={cn(ac.dayWeekday, "shrink")} style={nepaliTextStyle()}>
          {day.weekday}
        </Text>
        {day.isToday ? (
          <View className={cn(ac.todayBadge, "shrink-0")}>
            <Text className={ac.todayBadgeText} style={nepaliTextStyle()}>
              {todayBadge}
            </Text>
          </View>
        ) : null}
      </View>
      <View className={ac.dayNumRow}>
        <Text className={ac.dayNum} style={nepaliTextStyle()}>
          {day.day}
        </Text>
        <Text className={ac.dayNumAd} style={nepaliTextStyle()}>
          /{day.adDay}
        </Text>
      </View>
      <View className={ac.dayBody}>
        <Text className={ac.dayRange} style={nepaliTextStyle()}>
          {day.range}
        </Text>
        <Text className={ac.dayNoon} style={nepaliTextStyle()}>
          {noonLabel} <Text className={ac.dayNoonValue} style={nepaliTextStyle()}>{day.noon}</Text>
        </Text>
        <Text numberOfLines={1} className={ac.daySun} style={nepaliTextStyle()}>
          ↑{day.sunrise} · ↓{day.sunset}
        </Text>
      </View>
    </View>
  );
}
