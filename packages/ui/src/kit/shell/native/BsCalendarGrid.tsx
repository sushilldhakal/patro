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
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));

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

type Slot = "a" | "b";

type Travel<T> = {
  sig: string;
  a: T[];
  b: T[] | null;
  /** Slot that should finish visible. */
  top: Slot;
  /** Slot fading away, or null once the month has settled. */
  ghost: Slot | null;
  /** +1 next month, −1 previous. Kept on a reversal so the shift returns along the same path. */
  dir: number;
  kind: "idle" | "enter" | "reverse" | "retarget" | "run";
  token: number;
  /** Month asked for while a fade was already running. */
  pending: T[] | null;
};

/** Same travel as the panchanga grid: crossfade, SHIFT px, interruptible. */
function useMonthTravel<T extends DatedDay>(days: T[]) {
  const reduced = Boolean(useReducedMotionPref());
  const signature = monthSignature(days);
  const snapshotRef = useRef(days);
  const [travel, setTravel] = useState<Travel<T>>({
    sig: signature,
    a: days,
    b: null,
    top: "a",
    ghost: null,
    dir: 1,
    kind: "idle",
    token: 0,
    pending: null,
  });

  if (signature !== travel.sig) {
    if (signature === "" || travel.sig === "") {
      snapshotRef.current = days;
      setTravel({
        ...travel,
        sig: signature,
        a: days,
        top: "a",
        ghost: null,
        kind: "idle",
        pending: null,
      });
    } else if (travel.ghost) {
      const ghostDays = travel.ghost === "a" ? travel.a : travel.b;
      const ghostSig = ghostDays ? monthSignature(ghostDays) : "";
      if (ghostSig === signature && ghostDays) {
        const top: Slot = travel.ghost;
        setTravel({
          ...travel,
          sig: signature,
          top,
          ghost: travel.top,
          kind: "reverse",
          token: travel.token + 1,
          pending: null,
        });
      } else {
        setTravel({
          ...travel,
          sig: signature,
          dir: signature > travel.sig ? 1 : -1,
          kind: "retarget",
          token: travel.token + 1,
          pending: days,
        });
      }
    } else {
      const previous = snapshotRef.current.slice();
      const incoming: Slot = travel.top === "a" ? "b" : "a";
      setTravel({
        ...travel,
        sig: signature,
        a: incoming === "a" ? days : previous,
        b: incoming === "b" ? days : previous,
        top: incoming,
        ghost: travel.top,
        dir: signature > travel.sig ? 1 : -1,
        kind: "enter",
        token: travel.token + 1,
        pending: null,
      });
    }
  } else {
    snapshotRef.current = days;
  }

  const opA = useSharedValue(1);
  const opB = useSharedValue(0);
  const xA = useSharedValue(0);
  const xB = useSharedValue(0);
  const reducedSv = useSharedValue(reduced);
  const travelRef = useRef(travel);
  const tokenRef = useRef(travel.token);
  const settledToken = useRef(0);
  travelRef.current = travel;
  tokenRef.current = travel.token;

  const settle = useCallback((token: number) => {
    if (tokenRef.current !== token || settledToken.current === token) return;
    const current = travelRef.current;
    if (current.token !== token || current.ghost == null) return;
    settledToken.current = token;
    if (current.ghost === "a") {
      opA.set(0);
      xA.set(0);
    } else {
      opB.set(0);
      xB.set(0);
    }
    const next: Travel<T> = { ...current, ghost: null, kind: "idle", pending: null };
    travelRef.current = next;
    setTravel(next);
  }, [opA, opB, xA, xB]);

  useLayoutEffect(() => {
    reducedSv.set(reduced);
  }, [reduced, reducedSv]);

  useLayoutEffect(() => {
    const current = travelRef.current;
    if (current.kind === "idle" || current.kind === "run") return;
    const token = current.token;
    const shift = reducedSv.get() ? 0 : current.dir * SHIFT;
    const timing = { duration: DURATION.standard, easing: EASE_OUT };
    const op = { a: opA, b: opB };
    const x = { a: xA, b: xB };
    const playIn = (slot: Slot) => {
      op[slot].set(0);
      x[slot].set(shift);
      op[slot].set(withTiming(1, timing));
      x[slot].set(withTiming(0, timing));
    };
    const playOut = (slot: Slot, toX: number) => {
      op[slot].set(withTiming(0, timing));
      x[slot].set(withTiming(toX, timing));
    };

    if (current.kind === "reverse" && current.ghost) {
      playOut(current.ghost, shift === 0 ? 0 : current.dir * SHIFT);
      op[current.top].set(withTiming(1, timing));
      x[current.top].set(withTiming(0, timing));
    } else if (current.kind === "enter" && current.ghost) {
      playIn(current.top);
      playOut(current.ghost, shift === 0 ? 0 : -shift);
    } else if (current.kind === "retarget" && current.ghost && current.pending) {
      const destOp = op[current.top].get();
      const srcOp = op[current.ghost].get();
      const incoming: Slot = destOp >= srcOp ? current.ghost : current.top;
      const outgoing: Slot = incoming === "a" ? "b" : "a";
      const next: Travel<T> = {
        ...current,
        a: incoming === "a" ? current.pending : current.a,
        b: incoming === "b" ? current.pending : current.b,
        top: incoming,
        ghost: outgoing,
        kind: "run",
        pending: null,
      };
      playIn(incoming);
      playOut(outgoing, shift === 0 ? 0 : -shift);
      travelRef.current = next;
      setTravel(next);
    }

    const timer = setTimeout(() => settle(token), DURATION.standard + 80);
    return () => clearTimeout(timer);
  }, [travel.token, opA, opB, xA, xB, reducedSv, settle]);

  const styleA = useAnimatedStyle(() => ({
    opacity: opA.get(),
    transform: [{ translateX: xA.get() }],
  }));
  const styleB = useAnimatedStyle(() => ({
    opacity: opB.get(),
    transform: [{ translateX: xB.get() }],
  }));

  const incomingDays = travel.top === "a" ? travel.a : travel.b;
  const outgoingDays = travel.ghost === "a" ? travel.a : travel.ghost === "b" ? travel.b : null;
  const incomingLive = incomingDays && monthSignature(incomingDays) === signature ? days : incomingDays;
  return {
    from: outgoingDays,
    to: travel.ghost ? incomingLive : null,
    incomingStyle: travel.top === "a" ? styleA : styleB,
    outgoingStyle: travel.ghost === "b" ? styleB : styleA,
  };
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
