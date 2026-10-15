import { useCallback, useState } from "react";
import { Pressable as RNPressable, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { useColorScheme } from "nativewind";
import { mobileRoles } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/domain/utils";
import { calendarClasses as cal } from "@vedic-patro/design-tokens/classes/calendar-classes";
import { useBsCalendarGrid } from "@vedic-patro/features/home";
import { useLocale } from "@vedic-patro/i18n/react";
import { Box, Sheet, Text } from "@vedic-patro/ui";
import type { BsCalendarGridProps } from "../contract";
import { VerticalEdgeLabel } from "./VerticalEdgeLabel";

const TODAY_AD = new Date().toISOString().split("T")[0];
const COLS = 7;
const GAP = 1;

/** The grid is measured once so the header and every row share one exact column width (percent widths wrap a column on some phones). */
function useGridWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    setWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  }, []);
  const col = width > 0 ? Math.floor(((width - GAP * (COLS - 1)) / COLS) * 100) / 100 : 0;
  return { onLayout, col };
}

function colStyle(col: number, extra?: object) {
  return col > 0 ? { width: col, maxWidth: col, minWidth: 0, ...extra } : { flex: 1, flexBasis: 0, minWidth: 0, ...extra };
}

/** Month grid for the app: rows of seven columns, drawn with React Native (no CSS grid). The moon glyph is supplied by each app. */
export function BsCalendarGrid({
  days,
  publicHolidayDates,
  selectedAdDate,
  onSelectDay,
  isEnriching = false,
  todayAd = TODAY_AD,
  primaryDate: primaryDateProp = "bs",
  moon,
  className,
}: BsCalendarGridProps) {
  const { t, lang } = useLocale();
  const { colorScheme } = useColorScheme();
  const roles = mobileRoles(colorScheme === "dark" ? "dark" : "light");
  const { width } = useWindowDimensions();
  const grid = useBsCalendarGrid({ days, publicHolidayDates, selectedAdDate, todayAd, primaryDate: primaryDateProp });
  const { primaryDate } = grid;
  const { onLayout, col } = useGridWidth();
  const isCompact = width < 768;
  const isTablet = !isCompact;
  const dayNumClass = isTablet ? "text-3xl" : "text-2xl";
  const tithiRowMinH = lang === "en" ? 14 : 18;
  const moonSize = width >= 640 ? 16 : 14;
  const moonInset = isCompact ? 0 : 4;
  const cellMinH = isCompact ? 80 : 104;

  return (
    <>
      <View
        onLayout={onLayout}
        className={cn(cal.grid, isCompact ? "rounded-none" : cal.gridWide, className)}
        style={{ backgroundColor: roles.border, gap: GAP }}
      >
        <View style={{ flexDirection: "row", gap: GAP }}>
          {grid.weekdays.map((w) => {
            const label = isCompact ? w.short : w.label;
            return (
              <View key={w.key} style={colStyle(col)} className={cn(cal.weekdayCell, isCompact ? cal.weekdayCellPhone : cal.weekdayCellWide)}>
                <Text
                  className={cn(
                    lang === "en" ? cal.weekdayEn : isCompact ? cal.weekdayNeShort : cal.weekdayNe,
                    w.weekend && lang !== "en" && cal.weekdayWeekend,
                  )}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {grid.rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap: GAP }}>
            {row.map((cell, colIndex) => {
              const cellIndex = rowIndex * 7 + colIndex;
              if (!cell) return <View key={`empty-${cellIndex}`} style={colStyle(col, { minHeight: cellMinH })} className={cal.emptyCell} />;

              const { isOutside, isToday, isSelected, isWeekend, isPublicHoliday, festivals, hasFestival, mainFest, leftFest, rightFest, extraFestCount, tithi } = cell;
              const compactBsFest = cell.bsFestCompact && isCompact;
              const bgClass = isOutside ? cal.cellOutside : isToday ? cal.cellToday : isPublicHoliday ? cal.cellHoliday : undefined;
              const dayColorClass = !isOutside && (isWeekend || isPublicHoliday) ? cal.dayNumberDanger : isOutside ? cal.cellTextOutside : cal.cellText;
              const openFestivals = () => grid.openFestivals(cell);

              return (
                <RNPressable
                  key={cell.day.date_ad}
                  onPress={() => onSelectDay?.(cell.day)}
                  style={colStyle(col, { minHeight: cellMinH })}
                  className={cn(cal.cell, "active:opacity-90", isCompact ? cal.cellPhone : cal.cellWide, !isCompact && (leftFest || rightFest) && cal.cellWithEdgeLabels, bgClass)}
                >
                  {isSelected ? (
                    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, borderWidth: 2, borderColor: roles.primary }} />
                  ) : null}

                  {cell.tithiIndex != null && moon ? (
                    <View pointerEvents="none" style={{ position: "absolute", top: moonInset, right: moonInset, zIndex: 2, width: moonSize, height: moonSize }}>
                      {moon({ tithiIndex: cell.tithiIndex, title: cell.moonTitle })}
                    </View>
                  ) : null}

                  {!isCompact && leftFest ? <VerticalEdgeLabel text={leftFest} side="left" color={isPublicHoliday ? roles.danger : roles.foreground} /> : null}
                  {!isCompact && rightFest ? <VerticalEdgeLabel text={rightFest} side="right" color={isPublicHoliday ? roles.danger : roles.foreground} /> : null}

                  <View className="w-full flex-row items-start justify-center" style={{ minHeight: tithiRowMinH }}>
                    {tithi ? (
                      <Text numberOfLines={1} className={cn("flex-1", cal.tithi, isTablet ? "text-sm" : cal.tithiPhone)}>
                        {tithi}
                      </Text>
                    ) : isEnriching && !isOutside ? (
                      <View className={cn("mx-auto", cal.tithiPending)} />
                    ) : (
                      <View className="min-w-0 flex-1" />
                    )}
                  </View>

                  <View className="flex-1 items-center justify-center gap-0.5 py-0.5">
                    {isToday ? (
                      <View className={cn(cal.todayBadge, isCompact && cal.todayBadgePhone)}>
                        <Text className={cal.todayBadgeText}>{grid.todayBadge}</Text>
                      </View>
                    ) : null}
                    <View className="flex-row flex-wrap items-baseline justify-center gap-x-1">
                      <Text className={cn(cal.dayNumber, lang === "en" ? "font-num-bold" : "font-num", dayNumClass, dayColorClass)}>{cell.primaryDay}</Text>
                      <Text className={cn(cal.secondaryDate, lang === "en" && "font-num", cell.secondaryNamed ? cal.secondaryDateNamed : cal.secondaryDatePlain, isTablet && "text-sm")}>
                        {isCompact ? cell.secondaryLabelShort : cell.secondaryLabel}
                      </Text>
                      {extraFestCount > 0 && primaryDate !== "bs" ? (
                        <RNPressable onPress={openFestivals} className={cn(cal.countBadge, isCompact && cal.countBadgePhone)}>
                          <Text className={cal.countBadgeText}>{cell.extraFestLabel}</Text>
                        </RNPressable>
                      ) : null}
                    </View>
                  </View>

                  {compactBsFest ? (
                    <RNPressable onPress={openFestivals} className={cn("mx-auto mt-auto", cal.countBadgeCompact)}>
                      <Text className={cal.countBadgeText}>{cell.festCountLabel}</Text>
                    </RNPressable>
                  ) : null}

                  {mainFest && !isOutside && !compactBsFest ? (
                    <View className={cn("w-full min-w-0", cal.festivalExtraStack)}>
                      <Text numberOfLines={isCompact ? 2 : 1} className={cn(cal.festival, isPublicHoliday ? cal.festivalHoliday : cal.festivalNormal)}>
                        {mainFest}
                      </Text>
                      {isCompact && festivals.length > 1 && extraFestCount === 0
                        ? festivals.slice(1, 3).map((name, fi) => (
                            <Text key={`${name}-${fi}`} numberOfLines={1} className={cn("text-center", cal.festivalExtra, isPublicHoliday ? cal.festivalHoliday : cal.festivalNormal)}>
                              {name}
                            </Text>
                          ))
                        : null}
                    </View>
                  ) : null}
                  {hasFestival && !mainFest ? <View className="mx-auto mt-0.5 h-1 w-1 rounded-full bg-accent" /> : null}
                </RNPressable>
              );
            })}
          </View>
        ))}
      </View>

      <Sheet open={grid.festivalDialog != null} onClose={grid.closeFestivals} title={grid.festivalDialog?.title} closeLabel={t("common.close")}>
        {grid.festivalDialog ? (
          <>
            <Text className="mb-3 text-sm text-muted-foreground">{grid.festivalDialog.description}</Text>
            <Box className="gap-2">
              {grid.festivalDialog.festivals.map((name, i) => (
                <Text key={`${name}-${i}`} className={cn(cal.festivalItem, cal.festivalItemText)}>
                  {name}
                </Text>
              ))}
            </Box>
          </>
        ) : null}
      </Sheet>
    </>
  );
}
