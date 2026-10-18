import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useGocharPage } from "@vedic-patro/features/gochar";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { AppShell } from "@/components/AppShell";
import { GocharIngressSection, GocharPlanetDeepDive, GocharSkySection } from "@vedic-patro/ui/kit/panchanga";
import { PanchangaDateNav } from "@/components/panchanga/PanchangaDateNav";
import { defaultClockForTimezone } from "@/components/panchanga/use-panchanga-mode";
import { Text } from "@/components/ui/Text";
import { adToBS, bsToAD, getBSMonthLength } from "@vedic-patro/domain/calendar/bs-calendar";
import { getAdMonthLength } from "@vedic-patro/domain/calendar/patro-day";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { applyPatroApiLimits } from "@/lib/patro-browse-years";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { fetchMonthCalendarOffline } from "@/lib/offline/offline-month";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { LoadingState } from "@/components/ui/States";

function toAdStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Gochar — the app's drawing of `useGocharPage` (@vedic-patro/features).
 * The browsed day lives in screen state here (BS browse).
 */
export default function GocharScreen() {
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const { location, setLocation } = usePanchangaLocation();
  const tz = resolveTimeZone(undefined, location.params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), tz);
  const [date, setDate] = useState(() => new Date(`${todayAd}T12:00:00`));
  const [clock, setClock] = useState(() => defaultClockForTimezone(tz));

  const dateAd = useMemo(() => toAdStr(date), [date]);
  const bs = useMemo(() => adToBS(date), [date]);

  const page = useGocharPage({
    era: "bs",
    location,
    todayAd,
    day: {
      dateAd,
      vikram: bs,
      gregorian: { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() },
    },
    fetchMonth: fetchMonthCalendarOffline,
    onPickMonth: ({ calendar, year, month, day }) =>
      setDate(
        calendar === "ad"
          ? new Date(year, month - 1, Math.min(day, getAdMonthLength(year, month)))
          : bsToAD(year, month, Math.min(day, getBSMonthLength(year, month))),
      ),
  });

  useEffect(() => {
    if (page.month?.limits) applyPatroApiLimits(page.month.limits);
  }, [page.month?.limits]);

  const wide = width >= 1024;

  return (
    <AppShell title={page.copy.shortTitle} showHeader={false}>
      <View className="gap-8">
        <PageHeader
          icon={<AppNavIcon name="orbit" size={28} color={colors.secondary} />}
          title={page.copy.title}
          subtitle={page.copy.subtitle}
        />

        <PanchangaDateNav
          date={date}
          onDateChange={setDate}
          todayAd={todayAd}
          clock={clock}
          onClockChange={setClock}
          location={location}
          onLocationChange={setLocation}
        />

        {page.gochar ? (
          <View className="gap-6">
            <GocharSkySection gochar={page.gochar} dateLabel={page.dateLabel} onSelectPlanet={page.setSelectedPlanet} />

            <View className={cn(gocharClasses.columns, wide && "flex-row items-start")}>
              <View className={wide ? "min-w-0 flex-1" : "w-full"}>
                <GocharIngressSection page={page} />
              </View>
              <View className={wide ? "min-w-0 flex-1" : "w-full"}>
                <GocharPlanetDeepDive gochar={page.gochar} selected={page.selectedPlanet} onSelect={page.setSelectedPlanet} />
              </View>
            </View>
          </View>
        ) : page.status === "error" ? (
          <Text className={gocharClasses.errorText} style={nepaliTextStyle()}>
            {page.copy.error}
          </Text>
        ) : (
          <LoadingState label={page.copy.loading} />
        )}

        <Text className={gocharClasses.mutedText} style={nepaliTextStyle()}>
          {page.copy.footnote}
        </Text>
      </View>
    </AppShell>
  );
}
