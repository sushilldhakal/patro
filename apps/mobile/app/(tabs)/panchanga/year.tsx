import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePanchangaYearPage } from "@vedic-patro/features/panchanga-year";
import { AppShell } from "@/components/AppShell";
import { PanchangaDateNav } from "@/components/panchanga/PanchangaDateNav";
import { PanchangaWheel } from "@/components/panchanga/PanchangaWheel";
import { Text } from "@/components/ui/Text";
import { usePanchangaClock } from "@/components/panchanga/use-panchanga-mode";
import { bsToAD, getBSMonthLength } from "@vedic-patro/domain/bs-calendar";
import { civilIsoFromDate } from "@vedic-patro/domain/patro-day";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { computeYearWheelStageHeight } from "@/lib/wheel-layout";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { resolveTimeZone } from "@vedic-patro/domain/zoned-time";
import { cn } from "@vedic-patro/domain/utils";
import { panchangaYearClasses } from "@vedic-patro/design-tokens/classes/panchanga-year-classes";

/**
 * Panchanga wheel over a moving window — the app's drawing of
 * `usePanchangaYearPage` (@vedic-patro/features). The date and clock live in
 * screen state here.
 */
export default function PanchangaYearScreen() {
  const { isCompact, isTablet, height: screenH } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [dateNavHeight, setDateNavHeight] = useState(88);
  const [bodyHeight, setBodyHeight] = useState(0);
  const { location, setLocation, ready } = usePanchangaLocation();
  const [date, setDate] = useState(() => new Date());
  const { clock, setClock } = usePanchangaClock(resolveTimeZone(undefined, location.params.timezone));

  const page = usePanchangaYearPage({ era: "bs", location, date, setDate, setClock, enabled: ready });

  const fallbackStageHeight = computeYearWheelStageHeight({ screenH, safeAreaTop: insets.top, dateNavHeight, isTablet });
  const stageHeight = Math.max(500, bodyHeight > 80 ? bodyHeight - 32 : fallbackStageHeight);

  return (
    <AppShell title="" showHeader={false} scroll={false}>
      <View onLayout={(e) => setDateNavHeight(e.nativeEvent.layout.height)}>
        <PanchangaDateNav
          date={date}
          onDateChange={page.changeDate}
          todayAd={page.todayAd}
          adDateStr={civilIsoFromDate(date)}
          wheelData={page.wheelData}
          clock={clock}
          onClockChange={page.changeClock}
          location={location}
          onLocationChange={setLocation}
        />
      </View>

      <View className={cn(panchangaYearClasses.body, "min-h-0 flex-1")} onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}>
        <PanchangaWheel
          p={page.wheelData}
          loading={page.wheelLoading}
          bsYear={page.bsYear}
          bsMonthNe={page.bsMonthNe}
          bsDay={page.bsDay}
          isToday={page.isToday}
          timezone={page.timeZone}
          locationLabel={page.locationLabel}
          clock={clock}
          stageHeight={stageHeight}
          calendarPick={{
            year: page.bsYear,
            month: page.bsMonth,
            day: page.bsDay,
            clock,
            todayAd: page.todayAd,
            onCommit: (year, month, day, nextClock) => {
              const land = page.startCalendarCommit(nextClock);
              land(bsToAD(year, month, Math.min(day, getBSMonthLength(year, month))));
            },
          }}
          yearScrub={page.scrub}
        />

        {page.statusLine?.kind === "error" ? (
          <View className={panchangaYearClasses.errorBox}>
            <Text className={panchangaYearClasses.errorText} style={nepaliTextStyle(13)}>
              {page.statusLine.text}
            </Text>
          </View>
        ) : page.statusLine ? (
          <Text className={panchangaYearClasses.status} style={nepaliTextStyle(11)}>
            {page.statusLine.text}
          </Text>
        ) : null}
      </View>
    </AppShell>
  );
}
