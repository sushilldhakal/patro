import { useEffect, useMemo } from "react";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
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
import { formatPatroMonthCrossEraSubtitle } from "@/lib/patro-headline-subtitle";
import { abhijitFromCalendarDay, formatClockNepali } from "@/lib/panchanga-format";
import { civilIsoDayOfMonth } from "@vedic-patro/domain/patro-day";
import { usePatroMonthBrowse } from "@/lib/use-patro-month-browse";
import { applyMonthLimits } from "@/lib/use-patro-capabilities";
import { useBreakpoint } from "@/lib/responsive";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { fetchMonthCalendarOffline } from "@/lib/offline/offline-month";

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
  const colors = useThemeColors();
  const { day, abhijit } = row;
  const adDay = civilIsoDayOfMonth(day.date_ad);
  const sunrise = formatClockNepali(day.sunrise) ?? day.sunrise ?? "—";
  const sunset = formatClockNepali(day.sunset) ?? day.sunset ?? "—";
  const weekday =
    (lang === "en" ? (day.weekday_en ?? day.weekday) : (day.weekday_ne ?? day.weekday)) ?? "";

  return (
    <View
      style={{
        width: width as never,
        minHeight: 148,
        borderColor: isToday ? colorWithAlpha("#0b565a", 0.5) : colors.border,
        backgroundColor: isToday ? colorWithAlpha("#0b565a", 0.1) : colors.card,
      }}
      className="rounded-xl border p-3"
    >
      <View className="mb-1.5 flex-row items-center justify-between gap-1">
        <Text
          numberOfLines={1}
          className="text-body shrink font-semibold text-muted-foreground"
          style={nepaliTextStyle(14)}
        >
          {weekday}
        </Text>
        {isToday ? (
          <View
            style={{ backgroundColor: colorWithAlpha("#0b565a", 0.2) }}
            className="shrink-0 rounded-full px-2 py-0.5"
          >
            <Text
              style={{ color: colors.secondary, ...nepaliTextStyle(12) }}
              className="text-caption font-bold uppercase"
            >
              {pick("आज", "Today")}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mb-2 flex-row items-baseline justify-center gap-1.5">
        <Text className="text-display font-num font-bold text-foreground" style={nepaliTextStyle(22)}>
          {digits(day.day)}
        </Text>
        <Text className="text-body font-num text-muted-foreground" style={nepaliTextStyle(14)}>
          /{digits(adDay)}
        </Text>
      </View>

      <View className="mt-auto gap-2">
        <Text
          style={{ color: colors.secondary, ...nepaliTextStyle(15) }}
          className="text-body text-center font-num font-bold"
        >
          {abhijit.rangeDisplay}
        </Text>
        <Text className="text-body text-center text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick("मध्यान्ह", "Solar noon")}{" "}
          <Text className="text-body font-num font-semibold text-foreground" style={nepaliTextStyle(16)}>
            {abhijit.noonDisplay ?? "—"}
          </Text>
        </Text>
        <View className="flex-row items-center justify-center gap-1.5">
          <SunriseSunsetIcon variant="rise" size={14} color={colors.mutedForeground} />
          <Text
            numberOfLines={1}
            className="text-body font-num text-muted-foreground"
            style={nepaliTextStyle(13)}
          >
            {sunrise}
          </Text>
          <Text className="text-muted-foreground">·</Text>
          <SunriseSunsetIcon variant="set" size={14} color={colors.mutedForeground} />
          <Text
            numberOfLines={1}
            className="text-body font-num text-muted-foreground"
            style={nepaliTextStyle(13)}
          >
            {sunset}
          </Text>
        </View>
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

  // Fewer columns on phone → wider cards and larger type.
  const cols =
    width >= 1280 ? 8 : width >= 1024 ? 7 : width >= 768 ? 6 : width >= 640 ? 4 : width < 420 ? 2 : 3;
  const cardWidth = `${(100 / cols - 1.5).toFixed(2)}%`;

  return (
    <AppShell title={pick("अभिजित् मुहूर्त", "Abhijit Moment")} showHeader={false}>
      <PatroPageHeader
        icon={<AppNavIcon name="sparkles" size={28} color={colors.secondary} />}
        title={t("abhijit.title")}
        subtitle={t("abhijit.subtitle")}
      />

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
        <View
          style={{
            borderColor: colorWithAlpha("#0b565a", 0.3),
            backgroundColor: colorWithAlpha("#0b565a", 0.1),
          }}
          className="mt-4 gap-4 overflow-hidden rounded-2xl border p-5"
        >
          <View>
            <Text
              style={{ color: colors.secondary, letterSpacing: 0.8, ...nepaliTextStyle(13) }}
              className="text-body mb-1 font-bold uppercase"
            >
              {pick("आजको अभिजित् मुहूर्त", "Today's Abhijit Moment")}
            </Text>
            <Text className="text-body mb-2 text-muted-foreground" style={nepaliTextStyle(16)}>
              {digits(todayRow.day.day)} ·{" "}
              {lang === "en"
                ? (todayRow.day.weekday_en ?? todayRow.day.weekday)
                : (todayRow.day.weekday_ne ?? todayRow.day.weekday)}{" "}
              · <Text className="font-num">{todayRow.day.date_ad}</Text>
            </Text>
            <Text className="text-display font-num font-bold text-foreground" style={nepaliTextStyle(28)}>
              {todayRow.abhijit.rangeDisplay}
            </Text>
            <Text className="text-body mt-2 text-muted-foreground" style={nepaliTextStyle(16)}>
              {pick("मध्यान्ह", "Solar noon")}:{" "}
              <Text className="text-title font-num font-semibold text-foreground" style={nepaliTextStyle(18)}>
                {todayRow.abhijit.noonDisplay ?? "—"}
              </Text>
            </Text>
          </View>
          <View
            style={{ borderColor: colors.border, backgroundColor: colors.background }}
            className="gap-2 rounded-xl border px-4 py-3"
          >
            <View className="flex-row flex-wrap items-center gap-x-3 gap-y-2">
              <View className="flex-row items-center gap-2">
                <SunriseSunsetIcon variant="rise" size={20} color={colors.primary} />
                <Text className="text-body font-num text-foreground" style={nepaliTextStyle(16)}>
                  {formatClockNepali(todayRow.day.sunrise) ?? todayRow.day.sunrise ?? "—"}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <SunriseSunsetIcon variant="set" size={20} color={colors.secondary} />
                <Text className="text-body font-num text-foreground" style={nepaliTextStyle(16)}>
                  {formatClockNepali(todayRow.day.sunset) ?? todayRow.day.sunset ?? "—"}
                </Text>
              </View>
            </View>
            <Text className="text-body font-num text-muted-foreground" style={nepaliTextStyle(14)}>
              {todayRow.day.date_ad}
            </Text>
          </View>
        </View>
      ) : null}

      <View
        style={{ backgroundColor: colors.surfaceInset, borderColor: colors.border }}
        className="mt-4 flex-row gap-2.5 rounded-xl border px-4 py-3.5"
      >
        <Ionicons name="sparkles-outline" size={18} color={colors.secondary} style={{ marginTop: 2 }} />
        <Text
          className="text-body flex-1 leading-relaxed text-muted-foreground"
          style={nepaliTextStyle(16)}
        >
          {pick(
            "अभिजित् दिनको आठौँ मुहूर्त हो — सूर्योदय र सूर्यास्त बीचको सर्वश्रेष्ठ शुभ समय, स्थानीय मध्यान्हमा केन्द्रित।",
            "Abhijit is the 8th daytime moment — the most auspicious window, centred on local solar noon between sunrise and sunset.",
          )}
        </Text>
      </View>

      <View className="mt-4 flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(18)}>
          {pick("मासिक सूची", "Month at a glance")} — {monthLabel} {digits(year)}
        </Text>
        {!monthQ.isLoading && rows.length > 0 ? (
          <View className="rounded-full border border-border bg-card px-3 py-1">
            <Text className="text-body font-semibold text-muted-foreground" style={nepaliTextStyle(14)}>
              {pick(`${digits(rows.length)} दिन`, `${rows.length} days`)}
            </Text>
          </View>
        ) : null}
      </View>

      {monthQ.isError ? (
        <Text
          style={{ color: colors.destructive, ...nepaliTextStyle(14) }}
          className="text-body mt-3"
        >
          {pick(
            "पात्रो लोड गर्न सकिएन। केही बेरपछि पुनः प्रयास गर्नुहोस्।",
            "Could not load the calendar. Try again shortly.",
          )}
        </Text>
      ) : monthQ.isLoading ? (
        <Text className="text-body mt-3 text-muted-foreground" style={nepaliTextStyle(16)}>
          {pick("लोड हुँदै…", "Loading…")}
        </Text>
      ) : rows.length === 0 ? (
        <Text className="text-body mt-3 text-muted-foreground" style={nepaliTextStyle(16)}>
          {pick(
            "यस महिनाका लागि अभिजित् समय उपलब्ध छैन।",
            "No Abhijit timings for this month.",
          )}
        </Text>
      ) : (
        <View
          style={{ backgroundColor: colors.surfaceInset, borderColor: colors.border }}
          className="mt-3 rounded-2xl border p-3"
        >
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
