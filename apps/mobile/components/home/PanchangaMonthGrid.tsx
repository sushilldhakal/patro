import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { CalendarDay } from "@/lib/api";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { useLocale } from "@/lib/i18n";
import {
  getMonthDayChandraRashi,
  getMonthDayKarana,
  getMonthDayNakshatra,
  getMonthDayNakshatraShort,
  getMonthDayYoga,
} from "@/lib/panchanga-month";
import { useTheme, useThemeColors } from "@/lib/theme-context";
import { nepaliDayNumberStyle, nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { tithiIndexFromCalendarDay } from "@vedic-patro/domain/tithi-wheel-data";
import { getSecondaryCellDate } from "@vedic-patro/domain/local-calendar";
import { cn } from "@vedic-patro/domain/utils";
import { brand } from "@vedic-patro/design-tokens";
import { VerticalEdgeLabel } from "@/components/home/VerticalEdgeLabel";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import {
  CALENDAR_GRID_GAP,
  calendarColStyle,
  selectionRingStyle,
  useCalendarGridWidth,
} from "./calendar-grid-layout";
import { getPakshaPhase, moonPhaseTitle } from "@vedic-patro/domain/month-grid-moon";

import { WEEKDAYS_NE, WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE } from "@vedic-patro/domain/bs-calendar";
const WEEKDAYS_EN = WEEKDAYS_SHORT;

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function formatTithiLabel(day: CalendarDay, isEn: boolean): string {
  return isEn ? (day.tithi ?? day.tithi_ne ?? "—") : (day.tithi_ne ?? day.tithi ?? "—");
}

function timeShort(v?: string): string {
  if (!v) return "—";
  return v.slice(0, 5);
}

type Props = {
  days: CalendarDay[];
  year: number;
  month: number;
  todayAd: string;
  selectedAd?: string;
  loading?: boolean;
  onPickDay: (day: CalendarDay) => void;
  /** Phone home: calendar spans full width like vedicpatro.com max-md. */
  edgeToEdge?: boolean;
};

export function PanchangaMonthGrid({
  days,
  todayAd,
  selectedAd,
  loading,
  onPickDay,
}: Props) {
  const theme = useThemeColors();
  const { isDark } = useTheme();
  const { pick, digits, lang } = useLocale();
  const { isCompact, width } = useBreakpoint();
  const { onLayout, colWidth } = useCalendarGridWidth();
  const col = (extra?: object) => calendarColStyle(colWidth, extra);
  const isEn = lang === "en";
  /* Web `text-panchang dark:text-accent`: brand green on light, gold on dark. */
  const panchangColor = isDark ? theme.accent : brand.green;
  /* Web moon icon: size-3.5 sm:size-4; right/top 0 below md, 4px from md. */
  const moonSize = width >= 640 ? 16 : 14;
  const moonInset = isCompact ? 0 : 4;
  const numFont = (bold: boolean) =>
    isEn ? (bold ? "font-num-bold" : "font-num") : undefined;

  const rows = chunk(days, 7);

  return (
    <View
      onLayout={onLayout}
      className="relative overflow-hidden rounded-xl border border-border shadow-sm"
      style={{ backgroundColor: theme.border, gap: CALENDAR_GRID_GAP }}
    >
      {loading ? (
        <View className="absolute inset-0 z-10 items-center justify-center bg-background/70">
          <VedicPatroLoader size={88} />
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: CALENDAR_GRID_GAP }} className="border-b border-border">
        {(isCompact ? WEEKDAYS_SHORT_NE : WEEKDAYS_NE).map((ne, i) => {
          const weekend = i === 0 || i === 6;
          return (
            <View
              key={`${ne}-${i}`}
              style={col()}
              className="min-h-10 items-center justify-center bg-background px-1 py-1.5"
            >
              <Text
                numberOfLines={1}
                className={cn("text-center text-sm font-semibold leading-tight", weekend && "text-danger")}
                style={nepaliTextStyle()}
              >
                {pick(ne, WEEKDAYS_EN[i])}
              </Text>
            </View>
          );
        })}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap: CALENDAR_GRID_GAP }}>
          {row.map((day, colIndex) => {
            const cellIndex = rowIndex * 7 + colIndex;
            const isOutside = day.outsideMonth === true;
            const phase = getPakshaPhase(day);
            const isKrishna = phase === "krishna";
            const isToday = day.date_ad === todayAd;
            const isSel = day.date_ad === selectedAd;
            const rashiLabel = getMonthDayChandraRashi(day, lang) ?? "—";
            const yogaLabel = getMonthDayYoga(day, lang);
            const karanaLabel = getMonthDayKarana(day, lang);
            const nakshatraFull = getMonthDayNakshatra(day, lang) ?? "—";
            const nakshatraLabel = isCompact ? (getMonthDayNakshatraShort(day, lang) ?? nakshatraFull) : nakshatraFull;
            const secondary = getSecondaryCellDate(day, "bs", lang, cellIndex === 0);
            const secondaryLabel = secondary.monthLabel
              ? `${secondary.monthLabel} ${digits(secondary.day)}`
              : digits(secondary.day);
            const secondaryLabelShort = secondary.monthLabelShort
              ? `${secondary.monthLabelShort} ${digits(secondary.day)}`
              : digits(secondary.day);
            const sunRise = digits(timeShort(day.sunrise));
            const sunSet = digits(timeShort(day.sunset));
            const hasSunTimes = Boolean(day.sunrise || day.sunset);
            const sunTimesLabel = [day.sunrise ? sunRise : "—", day.sunset ? sunSet : "—"].join(" ");
            const tithiLabel = formatTithiLabel(day, isEn);
            const tithiIdx = tithiIndexFromCalendarDay(day);
            const moonTitle = moonPhaseTitle(phase, isEn);

            /* Web cellClass: outside surface-muted/70, krishna background, shukla white. */
            let bg = "bg-white dark:bg-background";
            if (isOutside) bg = "bg-surface-muted/70";
            else if (isKrishna) bg = "bg-background";
            if (isToday && !isOutside) bg = "bg-surface-today";

            return (
              <Pressable
                key={day.date_ad}
                onPress={() => onPickDay(day)}
                style={col()}
                className={cn(
                  "relative active:opacity-90",
                  isCompact ? "p-1" : "min-h-[118px] p-1.5",
                  !isCompact && hasSunTimes && "px-3.5",
                  bg,
                )}
              >
                {isSel ? <View style={selectionRingStyle(theme.primary)} /> : null}
                {isToday && !isOutside && isKrishna && !isSel ? (
                  <View
                    pointerEvents="none"
                    className="absolute inset-0 border-2 border-danger/30"
                  />
                ) : null}

                {tithiIdx != null ? (
                  <View
                    pointerEvents="none"
                    style={{ position: "absolute", top: moonInset, right: moonInset, zIndex: 2 }}
                  >
                    <CalendarMoonPhaseIcon tithiIndex={tithiIdx} size={moonSize} title={moonTitle} />
                  </View>
                ) : null}

                {isCompact ? (
                  <View className="w-full items-start gap-px">
                    <View className="flex-row flex-wrap items-baseline gap-x-1">
                      <Text
                        className={cn("text-sm font-bold leading-none", numFont(true))}
                        style={isEn ? undefined : nepaliDayNumberStyle()}
                      >
                        {digits(day.day)}
                      </Text>
                      <Text
                        className={cn(
                          "font-semibold text-muted-foreground",
                          secondary.monthLabel ? "text-diagram-xs" : "text-xs",
                          numFont(false),
                        )}
                        style={isEn ? undefined : nepaliTextStyle()}
                      >
                        {secondaryLabelShort}
                      </Text>
                    </View>
                    <View className="w-full items-start gap-px">
                      <Text className="w-full text-xs font-semibold leading-tight" style={nepaliTextStyle()}>
                        {tithiLabel}
                      </Text>
                      <Text
                        className="w-full text-xs font-semibold leading-tight"
                        style={[nepaliTextStyle(), { color: panchangColor }]}
                      >
                        {nakshatraLabel}
                      </Text>
                      <Text
                        className="w-full text-xs font-semibold leading-tight"
                        style={[nepaliTextStyle(), { color: panchangColor }]}
                      >
                        {rashiLabel}
                      </Text>
                      <Text className="w-full text-xs font-semibold leading-tight" style={nepaliTextStyle()}>
                        {yogaLabel}
                      </Text>
                      <Text className="w-full text-xs font-semibold leading-tight" style={nepaliTextStyle()}>
                        {karanaLabel}
                      </Text>
                    </View>
                    <Text
                      className="text-diagram-xs font-num font-bold leading-none text-muted-foreground"
                      style={nepaliTextStyle()}
                    >
                      {sunTimesLabel}
                    </Text>
                  </View>
                ) : (
                  <View className="w-full gap-0.5">
                    {day.sunrise ? (
                      <VerticalEdgeLabel text={sunRise} side="left" color={theme.textMuted} className="font-normal" />
                    ) : null}
                    {day.sunset ? (
                      <VerticalEdgeLabel text={sunSet} side="right" color={theme.textMuted} className="font-normal" />
                    ) : null}

                    <Text className="w-full text-center text-xs font-semibold leading-snug" style={nepaliTextStyle()}>
                      {tithiLabel}
                    </Text>
                    <Text
                      className="w-full text-center text-xs font-semibold leading-tight"
                      style={[nepaliTextStyle(), { color: panchangColor }]}
                    >
                      {nakshatraLabel}
                    </Text>

                    <View className="flex-row flex-wrap items-baseline justify-center gap-x-1 px-0.5 py-0.5">
                      <Text
                        className={cn("text-lg font-bold leading-none", numFont(true))}
                        style={isEn ? undefined : nepaliDayNumberStyle()}
                      >
                        {digits(day.day)}
                      </Text>
                      <Text
                        className={cn(
                          "font-semibold leading-none text-muted-foreground",
                          secondary.monthLabel ? "text-diagram-xs" : "text-xs",
                          numFont(false),
                        )}
                        style={isEn ? undefined : nepaliTextStyle()}
                      >
                        {secondaryLabel}
                      </Text>
                    </View>

                    <View className="w-full gap-0.5">
                      <View className="w-full flex-row gap-0.5">
                        <Text
                          className="min-w-0 flex-1 text-center text-xs font-bold leading-tight"
                          style={[nepaliTextStyle(), { color: panchangColor }]}
                        >
                          {rashiLabel}
                        </Text>
                        <Text className="min-w-0 flex-1 text-center text-xs font-bold leading-tight" style={nepaliTextStyle()}>
                          {karanaLabel}
                        </Text>
                      </View>
                      <Text className="w-full text-center text-xs font-bold leading-tight" style={nepaliTextStyle()}>
                        {yogaLabel}
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
