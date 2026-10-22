import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pressable as RNPressable, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { DURATION, EASE_OUT, ENTER_SCALE, SHIFT, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { useColorScheme } from "nativewind";
import { mobileRoles } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/design-tokens/cn";
import { calendarClasses as cal } from "@vedic-patro/design-tokens/classes/calendar-classes";
import { useBsCalendarGrid } from "@vedic-patro/features/home";
import { useLocale } from "@vedic-patro/i18n/react";
import { Box, Sheet, Text } from "@vedic-patro/ui";
import type { BsCalendarGridProps } from "../contract";
import { VerticalEdgeLabel } from "./VerticalEdgeLabel";

const TODAY_AD = new Date().toISOString().split("T")[0];
const COLS = 7;
const GAP = 1;
const TODAY_PULSE_MS = 600;

type PulseApi = {
  seen: (todayAd: string) => boolean;
  mark: (todayAd: string) => void;
  subscribe: (listener: () => void) => () => void;
};

function readTodayPulse(): PulseApi | null {
  try {
    return (globalThis as { __vpTodayPulseApi?: PulseApi }).__vpTodayPulseApi ?? null;
  } catch {
    return null;
  }
}

function TodayCellPulse({ todayAd }: { todayAd: string }) {
  const reduced = Boolean(useReducedMotionPref());
  const [on, setOn] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => {
    const shown = scale.get();
    return {
      opacity: opacity.get(),
      transform: shown === 1 ? undefined : [{ scale: shown }],
    };
  });

  useEffect(() => {
    const api = readTodayPulse();
    if (!api) return;
    let cancel = false;
    return api.subscribe(() => {
      if (cancel || api.seen(todayAd)) return;
      api.mark(todayAd);
      if (!cancel) setOn(true);
    });
  }, [todayAd]);

  useLayoutEffect(() => {
    if (!on) return;
    opacity.set(0);
    scale.set(reduced ? 1 : ENTER_SCALE);
    opacity.set(
      withSequence(
        withTiming(1, { duration: TODAY_PULSE_MS / 2, easing: EASE_OUT }),
        withTiming(0, { duration: TODAY_PULSE_MS / 2, easing: EASE_OUT }),
      ),
    );
    if (!reduced) scale.set(withTiming(1, { duration: TODAY_PULSE_MS, easing: EASE_OUT }));
    const timer = setTimeout(() => setOn(false), TODAY_PULSE_MS + 40);
    return () => clearTimeout(timer);
  }, [on, opacity, reduced, scale]);

  if (!on) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }, style]}>
      <View pointerEvents="none" className="absolute inset-0 border-2 border-secondary" />
    </Animated.View>
  );
}

type DatedDay = { date_ad: string; outsideMonth?: boolean };

function monthSignature(days: DatedDay[]): string {
  const inside = days.filter((day) => !day.outsideMonth);
  const span = inside.length ? inside : days;
  if (!span.length) return "";
  return `${span[0].date_ad}:${span[span.length - 1].date_ad}:${span.length}`;
}

type Travel<T> = {
  sig: string;
  from: T[] | null;
  /** Month the fade was heading toward, frozen while that fade reverses. */
  to: T[] | null;
  dir: number;
  fresh: boolean;
  reverse: boolean;
  token: number;
};

function useMonthTravel<T extends DatedDay>(days: T[]) {
  const reduced = useReducedMotionPref();
  const signature = monthSignature(days);
  const daysRef = useRef(days);
  const [travel, setTravel] = useState<Travel<T>>({
    sig: signature,
    from: null,
    to: null,
    dir: 1,
    fresh: false,
    reverse: false,
    token: 0,
  });

  if (signature !== travel.sig && signature !== "" && travel.sig !== "") {
    const nextDir = signature > travel.sig ? 1 : -1;
    const inFlight = travel.from !== null;
    const fromSig = travel.from ? monthSignature(travel.from) : "";
    if (!inFlight) {
      setTravel({
        sig: signature,
        from: daysRef.current,
        to: null,
        dir: nextDir,
        fresh: true,
        reverse: false,
        token: travel.token + 1,
      });
    } else if (fromSig === signature) {
      setTravel({
        sig: signature,
        from: travel.from,
        to: travel.to ?? daysRef.current,
        dir: travel.dir,
        fresh: false,
        reverse: true,
        token: travel.token + 1,
      });
    } else {
      setTravel({
        sig: signature,
        from: travel.from,
        to: null,
        dir: travel.dir,
        fresh: false,
        reverse: false,
        token: travel.token + 1,
      });
    }
  } else {
    daysRef.current = days;
  }

  const progress = useSharedValue(1);
  const dirSv = useSharedValue(1);
  const reducedSv = useSharedValue(Boolean(reduced));
  const tokenRef = useRef(travel.token);
  const travelRef = useRef(travel);
  tokenRef.current = travel.token;
  travelRef.current = travel;

  useLayoutEffect(() => {
    reducedSv.set(Boolean(reduced));
  }, [reduced, reducedSv]);

  useLayoutEffect(() => {
    const current = travelRef.current;
    if (!current.from) return;
    if (current.fresh) {
      progress.set(0);
      dirSv.set(current.dir);
    }
    const token = current.token;
    const reverse = current.reverse;
    progress.set(withTiming(reverse ? 0 : 1, { duration: DURATION.standard, easing: EASE_OUT }));
    const timer = setTimeout(() => {
      if (tokenRef.current !== token) return;
      setTravel((latest) =>
        latest.token === token ? { ...latest, from: null, to: null, fresh: false, reverse: false } : latest,
      );
    }, DURATION.standard + 40);
    return () => clearTimeout(timer);
  }, [travel.token, progress, dirSv]);

  const incomingStyle = useAnimatedStyle(() => {
    const p = progress.get();
    const shift = reducedSv.get() ? 0 : dirSv.get() * SHIFT;
    return { opacity: p, transform: [{ translateX: (1 - p) * shift }] };
  });
  const outgoingStyle = useAnimatedStyle(() => {
    const p = progress.get();
    const shift = reducedSv.get() ? 0 : dirSv.get() * SHIFT;
    return { opacity: 1 - p, transform: [{ translateX: -p * shift }] };
  });

  return { from: travel.from, to: travel.to, incomingStyle, outgoingStyle };
}

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
  const travel = useMonthTravel(days);
  const incoming = useBsCalendarGrid({
    days: travel.to ?? days,
    publicHolidayDates,
    selectedAdDate,
    todayAd,
    primaryDate: primaryDateProp,
  });
  const ghost = useBsCalendarGrid({
    days: travel.from ?? days,
    publicHolidayDates,
    selectedAdDate,
    todayAd,
    primaryDate: primaryDateProp,
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

              const { isOutside, isToday, isSelected, isWeekend, isPublicHoliday, festivals, hasFestival, mainFest, leftFest, rightFest, extraFestCount, tithi } = cell;
              const compactBsFest = cell.bsFestCompact && isCompact;
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
                  style={colStyle(col, { minHeight: cellMinH })}
                  className={cn(cal.cell, "active:opacity-90", isCompact ? cal.cellPhone : cal.cellWide, !isCompact && (leftFest || rightFest) && cal.cellWithEdgeLabels, isOutside && cal.cellOutside, isToday && isCompact && "border-2 border-secondary")}
                >
                  {tintClass ? <View pointerEvents="none" className={cn("absolute inset-0", tintClass)} /> : null}

                  {isSelected ? (
                    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, borderWidth: 2, borderColor: roles.primary }} />
                  ) : null}
                  {pulse && isToday && !isOutside ? <TodayCellPulse todayAd={todayAd} /> : null}

                  {cell.tithiIndex != null && moon ? (
                    <View pointerEvents="none" style={{ position: "absolute", top: moonInset, right: moonInset, zIndex: 2, width: moonSize, height: moonSize }}>
                      {moon({ tithiIndex: cell.tithiIndex, title: cell.moonTitle })}
                    </View>
                  ) : null}

                  {!isCompact && leftFest ? <VerticalEdgeLabel text={leftFest} side="left" color={isPublicHoliday ? roles.danger : roles.foreground} /> : null}
                  {!isCompact && rightFest ? <VerticalEdgeLabel text={rightFest} side="right" color={isPublicHoliday ? roles.danger : roles.foreground} /> : null}

                  <View className="w-full flex-row items-start justify-start" style={{ minHeight: tithiRowMinH }}>
                    {tithi ? (
                      <Text numberOfLines={1} className={cn("flex-1", cal.tithi, "text-left", isTablet ? "text-sm" : cal.tithiPhone)}>
                        {tithi}
                      </Text>
                    ) : isEnriching && !isOutside ? (
                      <View className={cal.tithiPending} />
                    ) : (
                      <View className="min-w-0 flex-1" />
                    )}
                  </View>

                  <View className="flex-1 items-center justify-center gap-0.5 py-0.5">
                    {/* On a phone the cell is too short for the badge: it pushed the date down
                        over the tithi. The today fill and ring already mark the cell. */}
                    {isToday && !isCompact ? (
                      <View className={cal.todayBadge}>
                        <Text className={cal.todayBadgeText}>{source.todayBadge}</Text>
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
                    <RNPressable onPress={openFestivals} className={cn("mt-auto self-start", cal.countBadgeCompact)}>
                      <Text className={cal.countBadgeText}>{cell.festCountLabel}</Text>
                    </RNPressable>
                  ) : null}

                  {mainFest && !isOutside && !compactBsFest ? (
                    <View className={cn("w-full min-w-0", cal.festivalExtraStack)}>
                      <Text numberOfLines={isCompact ? 2 : 1} className={cn(cal.festival, "text-left", isPublicHoliday ? cal.festivalHoliday : cal.festivalNormal)}>
                        {mainFest}
                      </Text>
                      {isCompact && festivals.length > 1 && extraFestCount === 0
                        ? festivals.slice(1, 3).map((name, fi) => (
                            <Text key={`${name}-${fi}`} numberOfLines={1} className={cn("text-left", cal.festivalExtra, isPublicHoliday ? cal.festivalHoliday : cal.festivalNormal)}>
                              {name}
                            </Text>
                          ))
                        : null}
                    </View>
                  ) : null}
                  {hasFestival && !mainFest ? <View className="mt-0.5 h-1 w-1 rounded-full bg-accent" /> : null}
                </RNPressable>
              );
            })}
          </View>
          ));
          const rowGap = { gap: GAP };
          if (!travel.from) return <View style={rowGap}>{renderRows(grid, true)}</View>;
          return (
            <View style={{ position: "relative" }}>
              <Animated.View
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[travel.outgoingStyle, { position: "absolute", left: 0, right: 0, top: 0 }]}
              >
                <View style={rowGap}>{renderRows(ghost, false)}</View>
              </Animated.View>
              <Animated.View pointerEvents={travel.to ? "none" : "auto"} style={travel.incomingStyle}>
                <View style={rowGap}>{renderRows(travel.to ? incoming : grid, true)}</View>
              </Animated.View>
            </View>
          );
        })()}
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
