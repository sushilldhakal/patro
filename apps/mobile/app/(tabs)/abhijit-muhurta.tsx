import { useEffect, useMemo } from "react";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PatroMonthYearNavBlock } from "@/components/patro-date/PatroMonthYearNavBlock";
import { SunriseSunsetIcon } from "@/components/panchanga/SunriseSunsetIcon";
import { Text } from "@/components/ui/Text";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { apiKeys, type CalendarDay } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { formatPatroMonthCrossEraSubtitle } from "@vedic-patro/domain/patro-headline-subtitle";
import { abhijitFromCalendarDay, formatClockNepali } from "@vedic-patro/domain/panchanga-format";
import { civilIsoDayOfMonth } from "@vedic-patro/domain/patro-day";
import { usePatroMonthBrowse } from "@/lib/use-patro-month-browse";
import { applyMonthLimits } from "@/lib/use-patro-capabilities";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { fetchMonthCalendarOffline } from "@/lib/offline/offline-month";
import { space } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/domain/utils";
import { abhijitClasses as ac } from "@vedic-patro/design-tokens/classes/abhijit-classes";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

type AbhijitRow = {
  day: CalendarDay;
  abhijit: NonNullable<ReturnType<typeof abhijitFromCalendarDay>>;
};

function buildRows(days: CalendarDay[]): AbhijitRow[] {
  return days.flatMap((day) => {
    const abhijit = abhijitFromCalendarDay(day);
    return abhijit ? [{ day, abhijit }] : [];
  });
}

function AbhijitDayCard({
  row,
  isToday,
  width,
}: {
  row: AbhijitRow;
  isToday: boolean;
  width: string;
}) {
  const { lang, pick, digits } = useLocale();
  const { day, abhijit } = row;
  const adDay = civilIsoDayOfMonth(day.date_ad);
  const sunrise = formatClockNepali(day.sunrise) ?? day.sunrise ?? "—";
  const sunset = formatClockNepali(day.sunset) ?? day.sunset ?? "—";
  const weekday =
    (lang === "en" ? (day.weekday_en ?? day.weekday) : (day.weekday_ne ?? day.weekday)) ?? "";

  return (
    <View
      style={{ width: width as never }}
      className={cn(ac.dayCard, isToday ? ac.dayCardToday : ac.dayCardIdle)}
    >
      <View className={ac.dayHead}>
        <Text numberOfLines={1} className={cn(ac.dayWeekday, "shrink")} style={nepaliTextStyle()}>
          {weekday}
        </Text>
        {isToday ? (
          <View className={cn(ac.todayBadge, "shrink-0")}>
            <Text className={ac.todayBadgeText} style={nepaliTextStyle()}>
              {pick("आज", "Today")}
            </Text>
          </View>
        ) : null}
      </View>

      <View className={ac.dayNumRow}>
        <Text className={ac.dayNum} style={nepaliTextStyle()}>
          {digits(day.day)}
        </Text>
        <Text className={ac.dayNumAd} style={nepaliTextStyle()}>
          /{digits(adDay)}
        </Text>
      </View>

      <View className={ac.dayBody}>
        <Text
          className={ac.dayRange}
          style={nepaliTextStyle()}
        >
          {abhijit.rangeDisplay}
        </Text>
        <Text className={ac.dayNoon} style={nepaliTextStyle()}>
          {pick("मध्यान्ह", "Solar noon")}{" "}
          <Text className={ac.dayNoonValue} style={nepaliTextStyle()}>
            {abhijit.noonDisplay ?? "—"}
          </Text>
        </Text>
        <Text numberOfLines={1} className={ac.daySun} style={nepaliTextStyle()}>
          ↑{sunrise} · ↓{sunset}
        </Text>
      </View>
    </View>
  );
}

export default function AbhijitMuhurtaScreen() {
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear, month, setMonth, stepMonth, goToday } = usePatroMonthBrowse();
  const tz = resolveTimeZone(undefined, location.params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), tz);
  const { lang, pick, digits, t } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();

  const crossEraSubtitle = useMemo(
    () => formatPatroMonthCrossEraSubtitle(era, year, month, lang, digits),
    [era, year, month, lang, digits],
  );

  const monthQ = useQuery({
    queryKey: apiKeys.month(year, month, location.params),
    queryFn: () =>
      fetchMonthCalendarOffline(year, month, location.params, { era: "bs" }),
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    applyMonthLimits(monthQ.data?.limits);
  }, [monthQ.data?.limits]);

  const rows = useMemo(() => buildRows(monthQ.data?.calendar ?? []), [monthQ.data?.calendar]);
  const todayRow = useMemo(
    () => rows.find(({ day }) => day.date_ad === todayAd) ?? null,
    [rows, todayAd],
  );

  const monthLabel = pick(BS_MONTHS_NE[month - 1], BS_MONTH_NAMES[month - 1]);

  // Same column steps as the website's grid (3 / sm:4 / md:6 / lg:7 / xl:8).
  const cols =
    width >= 1280 ? 8 : width >= 1024 ? 7 : width >= 768 ? 6 : width >= 640 ? 4 : 3;
  const cardWidth = `${(100 / cols - 1.5).toFixed(2)}%`;

  return (
    <AppShell title={pick("अभिजित् मुहूर्त", "Abhijit Moment")} showHeader={false}>
      <View className="mb-6">
        <View className={ac.titleRow}>
          <AppNavIcon name="sparkles" size={28} color={colors.secondary} />
          <Text className={cn(ac.title, "flex-1 text-3xl")} style={nepaliTextStyle()}>
            {t("abhijit.title")}
          </Text>
        </View>
        <Text className={ac.subtitle} style={nepaliTextStyle()}>
          {t("abhijit.subtitle")}
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
        onToday={() => goToday(todayAd)}
        onPrev={() => stepMonth(-1)}
        onNext={() => stepMonth(1)}
      />

      {todayRow ? (
        <View className={cn(ac.hero, "mt-6 gap-4 bg-secondary/10")}>
          <View>
            <Text className={ac.heroEyebrow} style={nepaliTextStyle()}>
              {pick("आजको अभिजित् मुहूर्त", "Today's Abhijit Moment")}
            </Text>
            <Text className={ac.heroDate} style={nepaliTextStyle()}>
              {digits(todayRow.day.day)} ·{" "}
              {lang === "en"
                ? (todayRow.day.weekday_en ?? todayRow.day.weekday)
                : (todayRow.day.weekday_ne ?? todayRow.day.weekday)}{" "}
              · <Text className={ac.heroDateAd}>{todayRow.day.date_ad}</Text>
            </Text>
            <Text className={cn(ac.heroRange, "text-2xl sm:text-3xl")} style={nepaliTextStyle()}>
              {todayRow.abhijit.rangeDisplay}
            </Text>
            <Text className={ac.heroNoon} style={nepaliTextStyle()}>
              {pick("मध्यान्ह", "Solar noon")}:{" "}
              <Text className={ac.heroNoonValue} style={nepaliTextStyle()}>
                {todayRow.abhijit.noonDisplay ?? "—"}
              </Text>
            </Text>
          </View>
          <View className={ac.sunPanel}>
            <View className="flex-row flex-wrap items-center gap-x-3 gap-y-2">
              <View className="flex-row items-center gap-2">
                <SunriseSunsetIcon variant="rise" size={16} color={colors.primary} />
                <Text className="font-num text-sm" style={nepaliTextStyle()}>
                  {formatClockNepali(todayRow.day.sunrise) ?? todayRow.day.sunrise ?? "—"}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <SunriseSunsetIcon variant="set" size={16} color={colors.secondary} />
                <Text className="font-num text-sm" style={nepaliTextStyle()}>
                  {formatClockNepali(todayRow.day.sunset) ?? todayRow.day.sunset ?? "—"}
                </Text>
              </View>
            </View>
            <Text className={ac.sunDate} style={nepaliTextStyle()}>
              {todayRow.day.date_ad}
            </Text>
          </View>
        </View>
      ) : null}

      <View className={cn(ac.noteBox, ac.noteRow, "mt-6")}>
        <Ionicons name="sparkles-outline" size={16} color={colors.secondary} style={{ marginTop: space.hair }} />
        <Text className={cn(ac.noteText, "flex-1")} style={nepaliTextStyle()}>
          {pick(
            "अभिजित् दिनको आठौँ मुहूर्त हो — सूर्योदय र सूर्यास्त बीचको सर्वश्रेष्ठ शुभ समय, स्थानीय मध्यान्हमा केन्द्रित।",
            "Abhijit is the 8th daytime moment — the most auspicious window, centred on local solar noon between sunrise and sunset.",
          )}
        </Text>
      </View>

      <View className={cn(ac.headingRow, "mt-6")}>
        <Text className={ac.heading} style={nepaliTextStyle()}>
          {pick("मासिक सूची", "Month at a glance")} — {monthLabel} {digits(year)}
        </Text>
        {!monthQ.isLoading && rows.length > 0 ? (
          <View className={ac.countPill}>
            <Text className={ac.countText} style={nepaliTextStyle()}>
              {pick(`${digits(rows.length)} दिन`, `${rows.length} days`)}
            </Text>
          </View>
        ) : null}
      </View>

      {monthQ.isError ? (
        <View className={cn(ac.errorBox, "mt-6")}>
          <Text className={ac.errorText} style={nepaliTextStyle()}>
            {pick(
              "पात्रो लोड गर्न सकिएन। केही बेरपछि पुनः प्रयास गर्नुहोस्।",
              "Could not load the calendar. Try again shortly.",
            )}
          </Text>
        </View>
      ) : monthQ.isLoading ? (
        <SkeletonPulse className={cn(ac.skeleton, "mt-6 bg-foreground/5")} />
      ) : rows.length === 0 ? (
        <Text className={ac.empty} style={nepaliTextStyle()}>
          {pick(
            "यस महिनाका लागि अभिजित् समय उपलब्ध छैन।",
            "No Abhijit timings for this month.",
          )}
        </Text>
      ) : (
        <View className={cn(ac.gridWrap, "mt-6")}>
          <View className="flex-row flex-wrap gap-2">
            {rows.map((row) => (
              <AbhijitDayCard
                key={row.day.date_ad}
                row={row}
                isToday={row.day.date_ad === todayAd}
                width={cardWidth}
              />
            ))}
          </View>
        </View>
      )}
    </AppShell>
  );
}
