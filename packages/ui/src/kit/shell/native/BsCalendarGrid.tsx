import { useCallback, useState } from "react";
import { Pressable as RNPressable, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";
import { useColorScheme } from "nativewind";
import { mobileRoles } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/design-tokens/cn";
import { calendarClasses as cal } from "@vedic-patro/design-tokens/classes/calendar-classes";
import { homeClasses as home } from "@vedic-patro/design-tokens/classes/home-classes";
import { softBreakTithi } from "@vedic-patro/domain/calendar/tithi-soft-break";
import { eventsOnDate } from "@vedic-patro/features/events";
import { useBsCalendarGrid } from "@vedic-patro/features/home";
import { haptics } from "@vedic-patro/ui/motion";
import { useLocale } from "@vedic-patro/i18n/react";
import { Box, Sheet, Text } from "@vedic-patro/ui";
import type { BsCalendarGridProps } from "../contract";
import { VerticalEdgeLabel } from "./VerticalEdgeLabel";
import { TodayCellPulse, useMonthTravel } from "./month-motion";

const TODAY_AD = new Date().toISOString().split("T")[0];
const COLS = 7;
const GAP = 1;
/* `cal.grid` draws a 1px border on both sides. onLayout reports the outer width, so without
   taking it off the seven columns ran 2px wider than the grid and the last column was clipped. */
const GRID_BORDER_X = 2;
function useGridWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    setWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  }, []);
  const col = width > 0 ? Math.floor(((width - GRID_BORDER_X - GAP * (COLS - 1)) / COLS) * 100) / 100 : 0;
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
  onLongPressDay,
  onOpenEvent,
  isEnriching = false,
  todayAd = TODAY_AD,
  todayPulse,
  primaryDate: primaryDateProp = "bs",
  saitSource,
  events,
  moon,
  className,
}: BsCalendarGridProps) {
  const { t, lang } = useLocale();
  const { colorScheme } = useColorScheme();
  const roles = mobileRoles(colorScheme === "dark" ? "dark" : "light");
  const { width } = useWindowDimensions();
  const grid = useBsCalendarGrid({ days, publicHolidayDates, selectedAdDate, todayAd, primaryDate: primaryDateProp, saitSource, events });
  const { onLayout, col } = useGridWidth();
  const isCompact = width < 768;
  const isTablet = !isCompact;
  // The website sets the date at text-3xl on a phone too; the app's 2xl read small beside it.
  const dayNumClass = "text-3xl";
  const tithiRowMinH = lang === "en" ? 14 : 18;
  /* English names are long ("Chaturdashi"): on a phone they get a smaller size, may wrap to a second
     line at a syllable, and start below the moon so the two never overlap. */
  const englishPhone = lang === "en" && isCompact;
  const moonSize = width >= 640 ? 16 : 14;
  const moonInset = isCompact ? 0 : 4;
  const cellMinH = isCompact ? 92 : 104;
  const travel = useMonthTravel(days);
  const incoming = useBsCalendarGrid({
    days: travel.to ?? days,
    publicHolidayDates,
    selectedAdDate,
    todayAd,
    primaryDate: primaryDateProp,
    events,
  });
  const ghost = useBsCalendarGrid({
    days: travel.from ?? days,
    publicHolidayDates,
    selectedAdDate,
    todayAd,
    primaryDate: primaryDateProp,
    events,
  });

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
              <View key={w.key} style={colStyle(col)} className={cn(cal.weekdayCell, isCompact ? "items-start px-1 py-1" : cal.weekdayCellWide)}>
                <Text
                  className={cn(
                    lang === "en" ? cal.weekdayEn : isCompact ? cn(cal.weekdayNeShort, "text-left") : cal.weekdayNe,
                    w.weekend && lang !== "en" && cal.weekdayWeekend,
                  )}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {(() => {
          const renderRows = (source: typeof grid, pulse: boolean) => source.rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap: GAP }}>
            {row.map((cell, colIndex) => {
              const cellIndex = rowIndex * 7 + colIndex;
              if (!cell) return <View key={`empty-${cellIndex}`} style={colStyle(col, { minHeight: cellMinH })} className={cal.emptyCell} />;

              const { isOutside, isToday, isSelected, isWeekend, isPublicHoliday, festivals, hasFestival, mainFest, leftFest, rightFest, hiddenFestCompact, tithi } = cell;
              /* The web mixes these tints into the card (`color-mix`); native has only the
                 translucent tint, so it is laid over the card instead of replacing it —
                 otherwise the grid lines' colour shows through. Holiday wins, as on the web. */
              const tintClass = isOutside ? undefined : isPublicHoliday ? cal.cellHoliday : isToday ? cal.cellToday : undefined;
              const dayColorClass = !isOutside && (isWeekend || isPublicHoliday) ? cal.dayNumberDanger : isOutside ? cal.cellTextOutside : cal.cellText;
              const openFestivals = () => source.openFestivals(cell);

              return (
                <RNPressable
                  key={cell.day.date_ad}
                  onPress={() => onSelectDay?.(cell.day)}
                  // A tap selects the day; holding it starts a new event there, as in Apple Calendar.
                  onLongPress={
                    onLongPressDay && !isOutside
                      ? () => {
                          haptics.tick();
                          onLongPressDay(cell.day);
                        }
                      : undefined
                  }
                  delayLongPress={400}
                  style={colStyle(col, { minHeight: cellMinH })}
                  className={cn(cal.cell, "active:opacity-90", isCompact ? cal.cellPhone : cal.cellWide, !isCompact && (leftFest || rightFest) && cal.cellWithEdgeLabels, isOutside && cal.cellOutside)}
                >
                  {tintClass ? <View pointerEvents="none" className={cn("absolute inset-0", tintClass)} /> : null}
                  {/* Today's ring is laid over the cell, not a border on it: a 2px border took 4px off an
                      already narrow phone cell and pushed the AD date onto its own line. */}
                  {isToday && isCompact ? <View pointerEvents="none" className="absolute inset-0 border-2 border-secondary" /> : null}

                  {isSelected ? (
                    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, borderWidth: 2, borderColor: roles.primary }} />
                  ) : null}
                  {pulse && isToday && !isOutside ? <TodayCellPulse todayAd={todayAd} store={todayPulse} ringClassName="border-2 border-secondary" /> : null}

                  {cell.tithiIndex != null && moon ? (
                    <View pointerEvents="none" style={{ position: "absolute", top: moonInset, right: moonInset, zIndex: 2, minWidth: moonSize, minHeight: moonSize }}>
                      {moon({ tithiIndex: cell.tithiIndex, title: cell.moonTitle })}
                    </View>
                  ) : null}

                  {!isCompact && leftFest ? <VerticalEdgeLabel text={leftFest} side="left" color={isPublicHoliday ? roles.danger : roles.foreground} /> : null}
                  {!isCompact && rightFest ? <VerticalEdgeLabel text={rightFest} side="right" color={isPublicHoliday ? roles.danger : roles.foreground} /> : null}

                  <View className="w-full flex-row items-start justify-start" style={{ minHeight: tithiRowMinH, paddingTop: englishPhone ? moonSize - 4 : 0 }}>
                    {tithi ? (
                      <Text
                        numberOfLines={englishPhone ? 2 : 1}
                        className={cn("flex-1", cal.tithi, "text-left", isTablet ? "text-sm" : englishPhone ? "text-diagram-xs leading-tight" : cal.tithiPhone)}
                      >
                        {englishPhone ? softBreakTithi(tithi) : tithi}
                      </Text>
                    ) : isEnriching && !isOutside ? (
                      <View className={cal.tithiPending} />
                    ) : (
                      <View className="min-w-0 flex-1" />
                    )}
                  </View>

                  {/* Phone: the date block takes its own height, right under the tithi, so every date in a
                      row sits on one line. As `flex-1` in a cell sized by its content it measured as zero:
                      a festival name or "+N" badge took its room and was drawn over the date. */}
                  <View className={isCompact ? "items-center py-0.5" : "flex-1 items-center justify-center gap-0.5 py-0.5"}>
                    {/* On a phone the cell is too short for the badge: it pushed the date down
                        over the tithi. The today fill and ring already mark the cell. */}
                    {isToday && !isCompact ? (
                      <View className={cal.todayBadge}>
                        <Text className={cal.todayBadgeText}>{source.todayBadge}</Text>
                      </View>
                    ) : null}
                    <View className={cn("flex-row items-baseline justify-center gap-x-1", isCompact ? "flex-nowrap" : "flex-wrap")}>
                      <Text className={cn(cal.dayNumber, lang === "en" ? "font-num-bold" : "font-num", dayNumClass, dayColorClass)}>{cell.primaryDay}</Text>
                      <Text
                        numberOfLines={isCompact ? 1 : undefined}
                        className={cn(isCompact && "shrink", cal.secondaryDate, lang === "en" && "font-num", cell.secondaryNamed ? cal.secondaryDateNamed : cal.secondaryDatePlain, isTablet && "text-sm")}
                      >
                        {isCompact ? cell.secondaryLabelShort : cell.secondaryLabel}
                      </Text>
                      {!isCompact && cell.moreWideChips > 0 && !isOutside ? (
                        // One "+N" for the festivals not on the edges and the events not drawn as chips.
                        <RNPressable
                          onPress={cell.eventTitles.length > 2 ? () => onSelectDay?.(cell.day) : openFestivals}
                          accessibilityLabel={cell.moreAria}
                          className={cal.countBadge}
                        >
                          <Text className={cal.countBadgeText}>{cell.moreWideChipsLabel}</Text>
                        </RNPressable>
                      ) : null}
                    </View>
                  </View>

                  {cell.eventTitles.length > 0 && !isOutside && !isCompact ? (
                      <View className="mt-1 w-full gap-px">
                        {/* Each chip opens its event's details, as an Apple Calendar month cell does. */}
                        {eventsOnDate(events ?? [], cell.day.date_ad).slice(0, 2).map((event) => (
                          <RNPressable
                            key={event.id}
                            accessibilityRole="button"
                            accessibilityLabel={event.title}
                            onPress={onOpenEvent ? () => onOpenEvent(event) : () => onSelectDay?.(cell.day)}
                            className={cn(cal.eventChipNative, "active:opacity-70")}
                          >
                            <Text numberOfLines={1} className={cal.eventChipText}>{event.title}</Text>
                          </RNPressable>
                        ))}
                      </View>
                  ) : null}

                  {/* A phone cell: one "+N" for festivals and the user's events together. A tap opens the day, or the
                      festival list when there are only festivals. */}
                  {/* Phone: the badge and festival lines sit together at the foot of the cell, so the
                      festivals of one row line up whether or not a cell carries a badge. */}
                  <View className={isCompact ? "mt-auto w-full min-w-0 gap-0.5" : "w-full min-w-0"}>
                  {isCompact && cell.moreCompact > 0 && !isOutside ? (
                    <RNPressable onPress={cell.eventTitles.length > 0 ? () => onSelectDay?.(cell.day) : openFestivals} accessibilityLabel={cell.moreAria} className={cn("self-start", cal.countBadgeCompact)}>
                      <Text className={cal.countBadgeText}>{cell.moreCompactLabel}</Text>
                    </RNPressable>
                  ) : null}

                  {mainFest && !isOutside ? (
                    <View className={cn("w-full min-w-0", cal.festivalExtraStack)}>
                      {/* Tablet: the festival's name opens its details. A phone cell is too small to
                          split, so a tap there selects the day. */}
                      <RNPressable disabled={isCompact} onPress={openFestivals} accessibilityRole={isCompact ? undefined : "button"}>
                        <Text numberOfLines={isCompact ? 2 : 1} className={cn(cal.festival, "text-left", isPublicHoliday ? cal.festivalHoliday : cal.festivalNormal)}>
                          {mainFest}
                        </Text>
                      </RNPressable>
                      {isCompact && festivals.length > 1 && hiddenFestCompact === 0
                        ? festivals.slice(1, 3).map((name, fi) => (
                            <Text key={`${name}-${fi}`} numberOfLines={1} className={cn("text-left", cal.festivalExtra, isPublicHoliday ? cal.festivalHoliday : cal.festivalNormal)}>
                              {name}
                            </Text>
                          ))
                        : null}
                    </View>
                  ) : null}
                  {hasFestival && !mainFest ? <View className="mt-0.5 h-1 w-1 rounded-full bg-accent" /> : null}
                  </View>
                </RNPressable>
              );
            })}
          </View>
          ));
          const rowGap = { gap: GAP };
          if (!travel.from) return <View style={rowGap}>{renderRows(grid, true)}</View>;
          return (
            <View style={{ position: "relative" }}>
              <View
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{ position: "absolute", left: 0, right: 0, top: 0 }}
              >
                <Animated.View style={travel.outgoingStyle}>
                  <View style={rowGap}>{renderRows(ghost, false)}</View>
                </Animated.View>
              </View>
              <Animated.View pointerEvents={travel.to ? "none" : "auto"} style={travel.incomingStyle}>
                <View style={rowGap}>{renderRows(travel.to ? incoming : grid, true)}</View>
              </Animated.View>
            </View>
          );
        })()}
      </View>

      <Sheet open={grid.festivalDialog != null} onClose={grid.closeFestivals} title={grid.festivalDialog?.title} closeLabel={t("common.close")} placement="center">
        {grid.festivalDialog ? (
          <>
            <Text className="mb-2 text-xs text-muted-foreground">{grid.festivalDialog.description}</Text>
            <Text className="text-lg font-bold text-foreground">{grid.festivalDialog.festivalLine}</Text>
            {grid.festivalDialog.saits.length ? (
              <Box className={home.highlightSait}>
                <Text className={home.highlightSaitHeading}>{grid.festivalDialog.saitHeading}</Text>
                {grid.festivalDialog.saits.map((sait) => (
                  <Box key={sait.key} className={home.highlightSaitItem}>
                    <Text className={home.highlightSaitLabel}>{sait.label}</Text>
                    {sait.times.map((slot) => (
                      <Box key={slot.key} className={home.highlightSaitRow}>
                        <Text className={home.highlightSaitTime}>{slot.time}</Text>
                        {slot.detail ? <Text className={home.highlightSaitDetail}>{slot.detail}</Text> : null}
                      </Box>
                    ))}
                    {sait.facing ? <Text className={home.highlightSaitFacing}>{sait.facing}</Text> : null}
                  </Box>
                ))}
                <Text className={home.highlightSaitNote}>{grid.festivalDialog.saitNote}</Text>
              </Box>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </>
  );
}
