import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { CalendarDay } from "@/lib/api";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { useLocale } from "@/lib/i18n";
import { useTheme, useThemeColors } from "@/lib/theme-context";
import { nepaliDayNumberStyle, nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { cn } from "@vedic-patro/design-tokens/cn";
import { brand } from "@vedic-patro/design-tokens";
import { usePanchangaMonthGrid } from "@vedic-patro/features/home";
import { VerticalEdgeLabel } from "@vedic-patro/ui/kit/shell";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import {
  CALENDAR_GRID_GAP,
  calendarColStyle,
  selectionRingStyle,
  useCalendarGridWidth,
} from "./calendar-grid-layout";

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
  const { lang } = useLocale();
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

  const grid = usePanchangaMonthGrid({ days, todayAd, selectedAd });

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
        {grid.weekdays.map((w) => {
          const weekend = w.weekend;
          return (
            <View
              key={w.key}
              style={col()}
              className="min-h-10 items-center justify-center bg-background px-1 py-1.5"
            >
              <Text
                numberOfLines={1}
                className={cn("text-center text-sm font-semibold leading-tight", weekend && "text-danger")}
                style={nepaliTextStyle()}
              >
                {isCompact ? w.short : w.label}
              </Text>
            </View>
          );
        })}
      </View>

      {grid.rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap: CALENDAR_GRID_GAP }}>
          {row.map((cell) => {
            const { day, isOutside, isToday, isSelected: isSel, isKrishna, hasSunTimes } = cell;
            const rashiLabel = cell.rashi;
            const yogaLabel = cell.yoga;
            const karanaLabel = cell.karana;
            const nakshatraLabel = isCompact ? cell.nakshatraShort : cell.nakshatra;
            const tithiLabel = cell.tithi;
            const sunTimesLabel = cell.sunTimesLabel;

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

                {cell.tithiIndex != null ? (
                  <View
                    pointerEvents="none"
                    style={{ position: "absolute", top: moonInset, right: moonInset, zIndex: 2 }}
                  >
                    <CalendarMoonPhaseIcon tithiIndex={cell.tithiIndex} size={moonSize} title={cell.moonTitle} />
                  </View>
                ) : null}

                {isCompact ? (
                  <View className="w-full items-start gap-px">
                    <View className="flex-row flex-wrap items-baseline gap-x-1">
                      <Text
                        className={cn("text-sm font-bold leading-none", numFont(true))}
                        style={isEn ? undefined : nepaliDayNumberStyle()}
                      >
                        {cell.primaryDay}
                      </Text>
                      <Text
                        className={cn(
                          "font-semibold text-muted-foreground",
                          cell.secondaryNamed ? "text-diagram-xs" : "text-xs",
                          numFont(false),
                        )}
                        style={isEn ? undefined : nepaliTextStyle()}
                      >
                        {cell.secondaryLabelShort}
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
                    {cell.sunrise ? (
                      <VerticalEdgeLabel text={cell.sunrise ?? ""} side="left" color={theme.textMuted} className="font-normal" />
                    ) : null}
                    {cell.sunset ? (
                      <VerticalEdgeLabel text={cell.sunset ?? ""} side="right" color={theme.textMuted} className="font-normal" />
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
                        {cell.primaryDay}
                      </Text>
                      <Text
                        className={cn(
                          "font-semibold leading-none text-muted-foreground",
                          cell.secondaryNamed ? "text-diagram-xs" : "text-xs",
                          numFont(false),
                        )}
                        style={isEn ? undefined : nepaliTextStyle()}
                      >
                        {cell.secondaryLabel}
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
