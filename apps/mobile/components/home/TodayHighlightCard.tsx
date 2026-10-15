import { View } from "react-native";
import { LucideNative } from "@/components/icons/LucideNative";
import { __iconNode as SunriseNode } from "lucide-react/dist/esm/icons/sunrise";
import { __iconNode as SunsetNode } from "lucide-react/dist/esm/icons/sunset";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { Text } from "@/components/ui/Text";
import type { CalendarDay, PanchangaDay } from "@/lib/api";
import { useTodayHighlight } from "@vedic-patro/features/home";
import { useThemeColors } from "@/lib/theme-context";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

type Props = {
  selectedDay: CalendarDay | null;
  selectedAdDate: string;
  todayAd: string;
  isAdCalendar: boolean;
  /** Browsed month (BS month number, or AD month in Gregorian mode) and year. */
  year: number;
  month: number;
  p?: PanchangaDay;
};

/**
 * The selected day's date, festival, moon, sunrise and sunset. Rendered once,
 * inside today's panchanga card, on every screen size.
 */
export function TodayHighlightCard(props: Props) {
  const colors = useThemeColors();
  const h = useTodayHighlight(props);

  return (
    <View nativeID="home-today-highlight" className={homeClasses.highlight}>
      <View className={homeClasses.highlightTop}>
        <Text className={homeClasses.highlightDay}>{h.day}</Text>
        <View className={homeClasses.highlightDate}>
          <Text className={homeClasses.highlightMonth}>{h.month}</Text>
          <Text className={homeClasses.highlightWeekday}>{h.weekday}</Text>
          <Text className={homeClasses.highlightCrossEra}>{h.crossEra}</Text>
          {h.nepalSambat ? <Text className={homeClasses.highlightNs}>{h.nepalSambat}</Text> : null}
        </View>
      </View>

      <View className={homeClasses.highlightSpecial}>
        <Text className={homeClasses.highlightKicker}>{h.kicker}</Text>
        <Text className={homeClasses.highlightTitle}>{h.title}</Text>
        {h.subtitle ? <Text className={homeClasses.highlightSubtitle}>{h.subtitle}</Text> : null}

        {h.phase && h.tithiIndex != null ? (
          <View className={homeClasses.highlightMoon}>
            <CalendarMoonPhaseIcon tithiIndex={h.tithiIndex} size={24} title={h.phase} />
            <Text className={homeClasses.highlightMoonText}>{h.phase}</Text>
          </View>
        ) : null}

        {h.sunrise || h.sunset ? (
          <View className={homeClasses.highlightSun}>
            {h.sunrise ? (
              <View className={homeClasses.highlightSunItem}>
                <LucideNative node={SunriseNode} size={16} color={colors.warning} />
                <Text className={homeClasses.highlightSunText}>{h.sunrise}</Text>
              </View>
            ) : null}
            {h.sunset ? (
              <View className={homeClasses.highlightSunItem}>
                <LucideNative node={SunsetNode} size={16} color={colors.warning} />
                <Text className={homeClasses.highlightSunText}>{h.sunset}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
