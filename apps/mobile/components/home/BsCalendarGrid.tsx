import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { CalendarDay } from "@/lib/api";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { FestivalListSheet } from "@/components/home/FestivalListSheet";
import { VerticalEdgeLabel } from "@/components/home/VerticalEdgeLabel";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useLocale } from "@/lib/i18n";
import { useBsCalendarGrid } from "@vedic-patro/features/home";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import {
  CALENDAR_GRID_GAP,
  calendarColStyle,
  selectionRingStyle,
  useCalendarGridWidth,
} from "./calendar-grid-layout";
import { calendarClasses } from "@vedic-patro/design-tokens/classes/calendar-classes";


type Props = {
  days: CalendarDay[];
  selectedAd?: string;
  todayAd: string;
  publicHolidayDates?: Set<string>;
  onSelectDay?: (day: CalendarDay) => void;
  isEnriching?: boolean;
  primaryDate?: "bs" | "ad";
};

export function BsCalendarGrid({
  days,
  selectedAd,
  todayAd,
  publicHolidayDates = new Set(),
  onSelectDay,
  isEnriching,
  primaryDate: primaryDateProp = "bs",
}: Props) {
  const theme = useThemeColors();
  const { lang } = useLocale();
  const grid = useBsCalendarGrid({
    days,
    publicHolidayDates,
    selectedAdDate: selectedAd,
    todayAd,
    primaryDate: primaryDateProp,
  });
  const { primaryDate } = grid;
  const { isCompact, isPhone, isTablet, width } = useBreakpoint();
  const { onLayout, colWidth } = useCalendarGridWidth();
  const col = (extra?: object) => calendarColStyle(colWidth, extra);
  /* Website: tithi is text-xs (10.8px), day number is text-2xl below md and text-3xl from md. */
  const dayNumClass = isTablet ? "text-3xl" : "text-2xl";
  const tithiRowMinH = lang === "en" ? 14 : 18;
  /* Web moon icon: size-3.5 sm:size-4; right/top 0 below md, 4px from md. */
  const moonSize = width >= 640 ? 16 : 14;
  const moonInset = isCompact ? 0 : 4;
  const cellMinH = isPhone ? 80 : isCompact ? 84 : isTablet ? 104 : 96;

  const weekdays = grid.weekdays;

  return (
    <>
      <View
        onLayout={onLayout}
        className={cn(
          calendarClasses.grid,
          isPhone ? calendarClasses.gridPhone : calendarClasses.gridWide,
        )}
        style={{ backgroundColor: theme.border, gap: CALENDAR_GRID_GAP }}
      >
        <View style={{ flexDirection: "row", gap: CALENDAR_GRID_GAP }}>
          {weekdays.map((w) => {
            const label = isCompact ? w.short : w.label;
            const weekend = w.weekend;
            return (
              <View
                key={label}
                style={col()}
                className={cn(calendarClasses.weekdayCell, isPhone ? calendarClasses.weekdayCellPhone : calendarClasses.weekdayCellWide)}
              >
                <Text
                  style={nepaliTextStyle()}
                  className={cn(
                    lang === "en"
                      ? calendarClasses.weekdayEn
                      : isCompact
                        ? calendarClasses.weekdayNeShort
                        : calendarClasses.weekdayNe,
                    weekend && lang !== "en" && calendarClasses.weekdayWeekend,
                  )}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {grid.rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap: CALENDAR_GRID_GAP }}>
            {row.map((cell, colIndex) => {
              const cellIndex = rowIndex * 7 + colIndex;

              if (!cell) {
                return (
                  <View
                    key={`empty-${cellIndex}`}
                    style={col({ minHeight: cellMinH })}
                    className={calendarClasses.emptyCell}
                  />
                );
              }

              const {
                day,
                isOutside,
                isToday,
                isSelected,
                isWeekend,
                isPublicHoliday,
                festivals,
                hasFestival,
                mainFest,
                leftFest,
                rightFest,
                extraFestCount,
                tithi,
              } = cell;
              const mobileBsFestCompact = cell.bsFestCompact && isCompact;

              const bgClass = isOutside
                ? calendarClasses.cellOutside
                : isToday
                  ? calendarClasses.cellToday
                  : isPublicHoliday
                    ? calendarClasses.cellHoliday
                    : undefined;

              const dayColorClass =
                !isOutside && (isWeekend || isPublicHoliday)
                  ? calendarClasses.dayNumberDanger
                  : isOutside
                    ? calendarClasses.cellTextOutside
                    : calendarClasses.cellText;

              const openFestivals = () => grid.openFestivals(cell);

              return (
                <Pressable
                  key={day.date_ad}
                  onPress={() => onSelectDay?.(day)}
                  style={col({ minHeight: cellMinH })}
                  className={cn(
                    calendarClasses.cell,
                    "active:opacity-90",
                    isPhone ? calendarClasses.cellPhone : calendarClasses.cellWide,
                    !isPhone && (leftFest || rightFest) && calendarClasses.cellWithEdgeLabels,
                    bgClass,
                  )}
                >
                  {isSelected ? <View style={selectionRingStyle(theme.primary)} /> : null}

                  {cell.tithiIndex != null ? (
                    <View
                      pointerEvents="none"
                      style={{ position: "absolute", top: moonInset, right: moonInset, zIndex: 2 }}
                    >
                      <CalendarMoonPhaseIcon tithiIndex={cell.tithiIndex} size={moonSize} title={cell.moonTitle} />
                    </View>
                  ) : null}

                  {!isCompact && leftFest ? (
                    <VerticalEdgeLabel text={leftFest} side="left" color={isPublicHoliday ? theme.danger : theme.text} />
                  ) : null}
                  {!isCompact && rightFest ? (
                    <VerticalEdgeLabel text={rightFest} side="right" color={isPublicHoliday ? theme.danger : theme.text} />
                  ) : null}

                  <View
                    className="w-full flex-row items-start justify-center"
                    style={{ minHeight: tithiRowMinH }}
                  >
                    {tithi ? (
                      <Text
                        numberOfLines={1}
                        className={cn("flex-1", calendarClasses.tithi, isTablet ? calendarClasses.tithiWide : calendarClasses.tithiPhone)}
                      >
                        {tithi}
                      </Text>
                    ) : isEnriching && !isOutside ? (
                      <View className={cn("mx-auto", calendarClasses.tithiPending)} />
                    ) : (
                      <View className="min-w-0 flex-1" />
                    )}
                  </View>

                  <View className="flex-1 items-center justify-center gap-0.5 py-0.5">
                    {isToday ? (
                      <View className={cn(calendarClasses.todayBadge, isCompact && calendarClasses.todayBadgePhone)}>
                        <Text className={calendarClasses.todayBadgeText}>
                          {grid.todayBadge}
                        </Text>
                      </View>
                    ) : null}
                    <View className="flex-row flex-wrap items-baseline justify-center gap-x-1">
                      <Text
                        className={cn(
                          calendarClasses.dayNumber,
                          lang === "en" ? "font-num-bold" : "font-num",
                          dayNumClass,
                          dayColorClass,
                        )}
                      >
                        {cell.primaryDay}
                      </Text>
                      <Text
                        className={cn(
                          calendarClasses.secondaryDate,
                          lang === "en" && "font-num",
                          cell.secondaryNamed ? calendarClasses.secondaryDateNamed : calendarClasses.secondaryDatePlain,
                          isTablet && calendarClasses.secondaryDateWide,
                        )}
                      >
                        {isPhone ? cell.secondaryLabelShort : cell.secondaryLabel}
                      </Text>
                      {extraFestCount > 0 && primaryDate !== "bs" ? (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation?.();
                            openFestivals();
                          }}
                          className={cn(calendarClasses.countBadge, isCompact && calendarClasses.countBadgePhone)}
                        >
                          <Text className={calendarClasses.countBadgeText}>
                            {cell.extraFestLabel}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  {mobileBsFestCompact ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        openFestivals();
                      }}
                      className={cn("mx-auto mt-auto", calendarClasses.countBadgeCompact)}
                    >
                      <Text className={calendarClasses.countBadgeText}>
                        {cell.festCountLabel}
                      </Text>
                    </Pressable>
                  ) : null}

                  {mainFest && !isOutside && !mobileBsFestCompact ? (
                    <View className={cn("w-full min-w-0", calendarClasses.festivalExtraStack)}>
                      <Text
                        numberOfLines={isCompact ? 2 : 1}
                        className={cn(
                          calendarClasses.festival,
                          isPublicHoliday ? calendarClasses.festivalHoliday : calendarClasses.festivalNormal,
                        )}
                      >
                        {mainFest}
                      </Text>
                      {isCompact && festivals.length > 1 && extraFestCount === 0
                        ? festivals.slice(1, 3).map((name, fi) => (
                            <Text
                              key={`${name}-${fi}`}
                              numberOfLines={1}
                              className={cn(
                                "text-center",
                                calendarClasses.festivalExtra,
                                isPublicHoliday ? calendarClasses.festivalHoliday : calendarClasses.festivalNormal,
                              )}
                            >
                              {name}
                            </Text>
                          ))
                        : null}
                    </View>
                  ) : null}
                  {hasFestival && !mainFest ? (
                    <View className="mx-auto mt-0.5 h-1 w-1 rounded-full bg-accent" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <FestivalListSheet
        visible={grid.festivalDialog !== null}
        dialog={grid.festivalDialog}
        onClose={grid.closeFestivals}
      />
    </>
  );
}
