import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { PanResponder, Pressable, ScrollView, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { adToBS, bsToAD, getBSMonthLength } from "@vedic-patro/domain/calendar/bs-calendar";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { cn } from "@vedic-patro/design-tokens/cn";
import {
  agendaFrom,
  eventsOnDate,
  layoutDay,
  movedTimes,
  plannerDays,
  railOf,
  resizedTimes,
  snap,
  usePlannerText,
  weekDates,
  type DayBlock,
} from "@vedic-patro/features/events";
import { Icon, Text } from "@vedic-patro/ui";
import { haptics } from "@vedic-patro/ui/motion";
import type { PlannerViewProps } from "../contract";
import { eventKindOf, eventTimeText } from "../event-text";
import { iconChevronLeft, iconChevronRight } from "../icons";

/**
 * The home calendar's planner views drawn the way Apple Calendar draws them, for iPhone, iPad and
 * Android: a week strip with the shown day filled, hairline hours with "7 am" labels in a gutter, tinted
 * event blocks with a colour bar, a red now-line, a year of small months and a list grouped by day. The
 * app takes alpha only on some colours, so the tints use `saffron` (primary), `vermilion` (danger),
 * `success` and `warning`.
 */

const GUTTER = 52;
const KIND = {
  event: { fill: "bg-saffron/15", bar: "bg-primary", text: "text-primary" },
  task: { fill: "bg-success/15", bar: "bg-success", text: "text-success" },
  appointment: { fill: "bg-warning/20", bar: "bg-warning", text: "text-warning" },
} as const;

const isoOfDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** iPad and wide Android tablets get taller hours and a four-column year. */
function useTablet() {
  const { width, height } = useWindowDimensions();
  return { tablet: width >= 768, height };
}

export function PlannerView(props: PlannerViewProps) {
  const { view, anchor, onAnchorChange, todayAd } = props;
  const tx = usePlannerText();
  const timeGrid = view === "day" || view === "multi" || view === "week";
  const step = (dir: 1 | -1) => {
    haptics.tick();
    onAnchorChange(tx.step(view, anchor, dir));
  };

  return (
    <View>
      {/* Toolbar: the month (or year) on the left, ‹ Today › in one capsule on the right. */}
      <View className="flex-row items-center justify-between gap-3 pb-3">
        <Text className="min-w-0 flex-1 text-2xl font-bold text-foreground" numberOfLines={1}>{tx.title(view, anchor)}</Text>
        <View className="flex-row items-center rounded-full border border-border bg-card p-0.5">
          <Pressable accessibilityRole="button" accessibilityLabel={tx.t("calendar.planner_prev")} onPress={() => step(-1)} hitSlop={4} className="h-9 w-9 items-center justify-center rounded-full active:bg-muted">
            <Icon node={iconChevronLeft} size={18} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.tick();
              onAnchorChange(todayAd);
            }}
            className="rounded-full px-3 py-1.5 active:bg-muted"
          >
            <Text className="text-body font-semibold text-foreground">{tx.t("today")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={tx.t("calendar.planner_next")} onPress={() => step(1)} hitSlop={4} className="h-9 w-9 items-center justify-center rounded-full active:bg-muted">
            <Icon node={iconChevronRight} size={18} />
          </Pressable>
        </View>
      </View>

      {view === "day" || view === "multi" ? <DayStrip {...props} /> : null}
      {timeGrid ? <TimeGrid {...props} days={plannerDays(view, anchor)} /> : null}
      {view === "year" ? <YearGrid {...props} /> : null}
      {view === "list" ? <AgendaList {...props} /> : null}
    </View>
  );
}

/** Apple's week strip: weekday letters over the dates; the shown day filled, the next one in a capsule (Multi Day). */
function DayStrip({ view, anchor, marks, todayAd, onAnchorChange }: PlannerViewProps) {
  const tx = usePlannerText();
  const week = weekDates(anchor);
  const shown = plannerDays(view, anchor);
  const first = week.indexOf(shown[0]!);
  const span = shown.filter((d) => week.includes(d)).length;
  return (
    <View className="border-b border-border pb-2">
      <View className="flex-row">
        {week.map((date, i) => (
          <Text key={date} className={cn("flex-1 text-center text-caption font-medium", i === 0 || i === 6 ? "text-muted-foreground" : "text-foreground")}>
            {tx.weekdayShort(date).slice(0, 2)}
          </Text>
        ))}
      </View>
      <View className="mt-1 flex-row">
        {span > 1 ? (
          <View pointerEvents="none" className="absolute bottom-0 top-0 rounded-full bg-muted" style={{ left: `${(first / 7) * 100}%`, width: `${(span / 7) * 100}%` }} />
        ) : null}
        {week.map((date) => {
          const isFirst = date === shown[0];
          const isToday = date === todayAd;
          const holiday = marks.get(date)?.holiday;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityState={{ selected: shown.includes(date) }}
              onPress={() => {
                haptics.tick();
                onAnchorChange(date);
              }}
              className="flex-1 items-center"
            >
              <View className={cn("h-10 w-10 items-center justify-center rounded-full", isFirst && "bg-foreground")}>
                <Text className={cn("font-num text-title", isFirst ? "font-semibold text-background" : isToday ? "font-semibold text-danger" : holiday ? "text-danger" : "text-foreground")}>
                  {tx.bsDay(date)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type Drag = { id: string; mode: "move" | "resize"; dx: number; dy: number };

function TimeGrid({ view, days, events, marks, windows, todayAd, onOpenEvent, onMoveEvent, onCreateAt, onAnchorChange, onViewChange }: PlannerViewProps & { days: string[] }) {
  const tx = usePlannerText();
  const { tablet, height: screenH } = useTablet();
  const HOUR_H = tablet ? 60 : 52;
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const columns = useMemo(() => days.map((date) => ({ date, ...layoutDay(events, date) })), [days, events]);
  const colWidth = width > 0 ? (width - GUTTER) / days.length : 0;
  const latest = useRef({ columns, colWidth, days, onMoveEvent, HOUR_H });
  latest.current = { columns, colWidth, days, onMoveEvent, HOUR_H };
  const now = useNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showsToday = days.includes(todayAd);
  const hasAllDay = columns.some((c) => c.allDay.length > 0 || (marks.get(c.date)?.names.length ?? 0) > 0);
  const colStyle = { width: colWidth || undefined, flex: colWidth ? undefined : 1 } as const;

  useEffect(() => {
    scroller.current?.scrollTo({ y: Math.max(0, ((showsToday ? new Date().getHours() : 7) - 1) * HOUR_H), animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.join(",")]);

  const setBoth = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };
  // A long press starts a drag; from then on this takes the touch from the scroll view.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: () => dragRef.current != null,
        onMoveShouldSetPanResponder: () => dragRef.current != null,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          if (dragRef.current) setBoth({ ...dragRef.current, dx: g.dx, dy: g.dy });
        },
        onPanResponderRelease: (_, g) => finish(g.dx, g.dy),
        onPanResponderTerminate: () => setBoth(null),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  function finish(dx: number, dy: number) {
    const current = dragRef.current;
    setBoth(null);
    if (!current) return;
    const { columns: cols, colWidth: cw, days: ds, onMoveEvent: save, HOUR_H: hourH } = latest.current;
    const event = cols.flatMap((c) => c.timed).find((b) => b.event.id === current.id)?.event;
    if (!event) return;
    const minuteDelta = snap((dy / hourH) * 60);
    if (current.mode === "resize") return minuteDelta !== 0 ? save(event, resizedTimes(event, minuteDelta)) : undefined;
    const dayDelta = ds.length > 1 && cw > 0 ? Math.round(dx / cw) : 0;
    if (dayDelta !== 0 || minuteDelta !== 0) save(event, movedTimes(event, dayDelta, minuteDelta));
  }

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {/* Heading: the full date (Day), "Wed – 5" per column (Multi Day), or weekday and date (Week). */}
      {view === "day" ? (
        <View className="flex-row flex-wrap items-baseline justify-center gap-x-1.5 py-2.5">
          <Text className="text-body font-semibold text-foreground">{tx.dayHeading(days[0]!)}</Text>
          <Text className="text-caption text-muted-foreground">· {tx.adShort(days[0]!)}</Text>
        </View>
      ) : (
        <View className="flex-row border-b border-border">
          <View style={{ width: GUTTER }} />
          {days.map((date) => {
            const isToday = date === todayAd;
            const holiday = marks.get(date)?.holiday;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                onPress={() => {
                  onAnchorChange(date);
                  onViewChange("day");
                }}
                style={colStyle}
                className="flex-row items-center justify-center gap-1 border-l border-border py-2.5 active:bg-muted"
              >
                {view === "multi" ? (
                  <Text className={cn("text-body font-semibold", isToday || holiday ? "text-danger" : "text-foreground")}>{tx.columnHeading(date)}</Text>
                ) : (
                  <>
                    <Text className="text-diagram-xs text-muted-foreground">{tx.weekdayShort(date).slice(0, 2)}</Text>
                    <View className={cn("h-6 w-6 items-center justify-center rounded-full", isToday && "bg-danger")}>
                      <Text className={cn("font-num text-caption font-semibold", isToday ? "text-white" : holiday ? "text-danger" : "text-foreground")}>{tx.bsDay(date)}</Text>
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {view === "day" ? <MuhurtaRow date={days[0]!} windows={windows} /> : null}

      {/* All-day row: holidays and festivals, then the user's all-day events. */}
      {hasAllDay ? (
        <View className="flex-row border-b border-border">
          <View style={{ width: GUTTER }} className="items-end pr-2 pt-2">
            <Text className="text-diagram-xs text-muted-foreground">{tx.t("events.all_day_short")}</Text>
          </View>
          {columns.map((c) => {
            const mark = marks.get(c.date);
            return (
              <View key={c.date} style={colStyle} className="gap-1 border-l border-border p-1">
                {mark?.names.slice(0, view === "week" ? 2 : 3).map((name) => (
                  <View key={name} className={cn("flex-row items-center gap-1.5 rounded-lg px-2 py-1", mark.holiday ? "bg-vermilion/10" : "bg-warning/15")}>
                    <View className={cn("h-1.5 w-1.5 rounded-full", mark.holiday ? "bg-danger" : "bg-warning")} />
                    <Text numberOfLines={1} className={cn("min-w-0 flex-1 text-caption font-medium", mark.holiday ? "text-danger" : "text-foreground")}>{name}</Text>
                  </View>
                ))}
                {c.allDay.map((e) => {
                  const k = KIND[eventKindOf(e)];
                  return (
                    <Pressable key={e.id} onPress={() => onOpenEvent(e)} className={cn("rounded-lg px-2 py-1", k.fill)}>
                      <Text numberOfLines={1} className={cn("text-caption font-semibold", k.text)}>{e.title}</Text>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
      ) : null}

      {/* The hours. */}
      <ScrollView ref={scroller} style={{ maxHeight: Math.round(screenH * (tablet ? 0.7 : 0.62)) }} scrollEnabled={drag == null} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        <View className="flex-row" style={{ height: HOUR_H * 24 }} {...pan.panHandlers}>
          <View style={{ width: GUTTER }}>
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => {
              if (showsToday && Math.abs(h * 60 - nowMin) < 20) return null;
              const { num, suffix } = tx.hourParts(h);
              return (
                <View key={h} className="absolute right-2 flex-row items-baseline gap-0.5" style={{ top: h * HOUR_H - 8 }}>
                  {num ? <Text className="font-num text-caption text-muted-foreground">{num}</Text> : null}
                  <Text className={cn("text-diagram-xs", num ? "text-muted-foreground" : "font-semibold text-muted-foreground")}>{suffix}</Text>
                </View>
              );
            })}
            {showsToday ? (
              <View className="absolute right-1 z-10 rounded-full bg-danger px-1.5 py-0.5" style={{ top: (nowMin / 60) * HOUR_H - 9 }}>
                <Text className="font-num text-diagram-xs font-semibold text-white">{tx.clock(nowMin)}</Text>
              </View>
            ) : null}
          </View>

          {columns.map((c) => (
            <Pressable
              key={c.date}
              accessibilityLabel={tx.t("calendar.planner_new_here")}
              onPress={(e) => {
                const minutes = Math.min(23 * 60 + 45, Math.max(0, snap((e.nativeEvent.locationY / HOUR_H) * 60 - 7)));
                onCreateAt(c.date, hhmm(minutes));
              }}
              style={{ ...colStyle, height: HOUR_H * 24 }}
              className="border-l border-border"
            >
              {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
                <View key={h} pointerEvents="none" className="absolute left-0 right-0 h-px bg-border" style={{ top: h * HOUR_H }} />
              ))}
              {/* Two thin rails on the left edge: runs of शुभ (green) and of अशुभ (red) time. */}
              {(["shubh", "ashubh"] as const).map((source, lane) =>
                railOf(windows.get(c.date) ?? [], source).map((run) => (
                  <View
                    key={`${source}-${run.startMin}`}
                    pointerEvents="none"
                    className={cn("absolute w-1 rounded-full", source === "ashubh" ? "bg-vermilion/60" : "bg-success/70")}
                    style={{ left: 3 + lane * 6, top: (run.startMin / 60) * HOUR_H + 1, height: ((run.endMin - run.startMin) / 60) * HOUR_H - 2 }}
                  />
                )),
              )}
              {c.date === todayAd ? (
                <View pointerEvents="none" className="absolute left-0 right-0 z-20 h-0.5 bg-danger" style={{ top: (nowMin / 60) * HOUR_H }}>
                  <View className="absolute h-2 w-2 rounded-full bg-danger" style={{ left: -4, top: -3 }} />
                </View>
              ) : null}
              <View pointerEvents="box-none" className="absolute bottom-0 right-1 top-0" style={{ left: 16 }}>
                {c.timed.map((b) => (
                  <Block
                    key={b.event.id}
                    block={b}
                    hourH={HOUR_H}
                    drag={drag?.id === b.event.id ? drag : null}
                    onOpen={() => onOpenEvent(b.event)}
                    onGrab={(mode) => {
                      haptics.tick();
                      setBoth({ id: b.event.id, mode, dx: 0, dy: 0 });
                    }}
                  />
                ))}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Block({ block, hourH, drag, onOpen, onGrab }: { block: DayBlock; hourH: number; drag: Drag | null; onOpen: () => void; onGrab: (mode: Drag["mode"]) => void }) {
  const { event, startMin, endMin, lane, lanes } = block;
  const tx = usePlannerText();
  const k = KIND[eventKindOf(event)];
  const dy = drag ? snap((drag.dy / hourH) * 60) : 0;
  const moving = drag?.mode === "move";
  const from = startMin + (moving ? dy : 0);
  const to = endMin + (drag ? dy : 0);
  const height = Math.max(((to - from) / 60) * hourH - 2, 22);
  return (
    <Pressable
      onPress={onOpen}
      onLongPress={() => onGrab("move")}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={event.title}
      className={cn("absolute overflow-hidden rounded-md pl-2.5 pr-1.5 pt-1", k.fill, drag && "z-30 opacity-90")}
      style={{
        top: (from / 60) * hourH + 1,
        height,
        left: `${(lane / lanes) * 100}%`,
        width: `${100 / lanes}%`,
        transform: moving && drag ? [{ translateX: drag.dx }] : undefined,
      }}
    >
      <View className={cn("absolute bottom-0 left-0 top-0 w-1", k.bar)} />
      <Text numberOfLines={height > 44 ? 2 : 1} className={cn("text-caption font-semibold leading-tight", k.text)}>{event.title}</Text>
      {height > 34 ? <Text numberOfLines={1} className="font-num text-diagram-xs text-muted-foreground">{tx.clock(from)} – {tx.clock(to)}</Text> : null}
      {height > 56 && event.location ? <Text numberOfLines={1} className="text-diagram-xs text-muted-foreground">{event.location}</Text> : null}
      <Pressable accessibilityLabel={tx.t("events.ends")} onLongPress={() => onGrab("resize")} delayLongPress={250} className="absolute bottom-0 left-0 right-0 h-3" />
    </Pressable>
  );
}

/** The day's शुभ and अशुभ muhurtas as one scrolling row of chips, in clock order: what the rails stand for. */
function MuhurtaRow({ date, windows }: { date: string; windows: PlannerViewProps["windows"] }) {
  const tx = usePlannerText();
  const list = [...(windows.get(date) ?? [])].sort((a, b) => a.startMin - b.startMin);
  if (list.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-border" contentContainerClassName="gap-1.5 pb-2.5">
      {list.map((w) => (
        <View key={w.id} className={cn("flex-row items-center gap-1.5 rounded-full px-2.5 py-1", w.source === "ashubh" ? "bg-vermilion/10" : "bg-success/10")}>
          <View className={cn("h-1.5 w-1.5 rounded-full", w.source === "ashubh" ? "bg-danger" : "bg-success")} />
          <Text className={cn("text-caption font-medium", w.source === "ashubh" ? "text-danger" : "text-success")}>{tx.lang === "en" ? w.nameEn : w.nameNe}</Text>
          <Text className="font-num text-caption text-muted-foreground">{tx.clock(w.startMin)}–{tx.clock(w.endMin)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

/** Apple's year: small months, the month name in colour, today filled red, holidays in red, a dot under days with events. */
function YearGrid({ anchor, events, marks, todayAd, onAnchorChange, onViewChange }: PlannerViewProps) {
  const tx = usePlannerText();
  const { tablet } = useTablet();
  const perRow = tablet ? 4 : 3;
  const year = adToBS(new Date(`${anchor}T12:00:00`)).year;
  const today = adToBS(new Date(`${todayAd}T12:00:00`));
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const rows = Array.from({ length: Math.ceil(12 / perRow) }, (_, r) => months.slice(r * perRow, r * perRow + perRow));
  return (
    <View className="gap-6 border-t border-border pt-4">
      {rows.map((row, r) => (
        <View key={r} className="flex-row gap-3">
          {row.map((month) => {
            const first = bsToAD(year, month, 1);
            const length = getBSMonthLength(year, month);
            const cells: (number | null)[] = [...Array.from({ length: first.getDay() }, () => null), ...Array.from({ length }, (_, i) => i + 1)];
            while (cells.length % 7 !== 0) cells.push(null);
            const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
            const current = today.year === year && today.month === month;
            return (
              <View key={month} className="min-w-0 flex-1">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onAnchorChange(isoOfDate(first));
                    onViewChange("calendar");
                  }}
                >
                  <Text className={cn("mb-1 text-body font-bold", current ? "text-danger" : "text-foreground")}>{tx.bsMonth(isoOfDate(first))}</Text>
                </Pressable>
                {weeks.map((week, w) => (
                  <View key={w} className="flex-row">
                    {week.map((day, i) => {
                      if (day == null) return <View key={`e-${w}-${i}`} className="h-5 flex-1" />;
                      const iso = isoOfDate(bsToAD(year, month, day));
                      const holiday = marks.get(iso)?.holiday;
                      const has = eventsOnDate(events, iso).length > 0;
                      const isToday = iso === todayAd;
                      return (
                        <Pressable
                          key={iso}
                          accessibilityRole="button"
                          onPress={() => {
                            haptics.tick();
                            onAnchorChange(iso);
                            onViewChange("day");
                          }}
                          className="h-5 flex-1 items-center justify-center"
                        >
                          <View className={cn("h-4 w-4 items-center justify-center rounded-full", isToday && "bg-danger")}>
                            <Text className={cn("font-num text-diagram-xs", isToday ? "font-semibold text-white" : holiday ? "font-semibold text-danger" : "text-foreground")}>{tx.digits(day)}</Text>
                          </View>
                          {has && !isToday ? <View className="absolute bottom-0 h-1 w-1 rounded-full bg-primary" /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Apple's list: a header per day, then rows with a colour dot, the title and the times on the right. */
function AgendaList({ anchor, events, marks, onOpenEvent, onAnchorChange, onViewChange }: PlannerViewProps) {
  const tx = usePlannerText();
  const rows = useMemo(() => {
    const days = agendaFrom(events, anchor, 60);
    const byDate = new Map(days.map((d) => [d.date, d.events] as const));
    for (let i = 0; i < 60; i++) {
      const date = shiftDate(anchor, i);
      if (marks.get(date)?.holiday && !byDate.has(date)) byDate.set(date, []);
    }
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [anchor, events, marks]);
  if (rows.length === 0) {
    return (
      <View className="border-t border-border py-10">
        <Text className="text-center text-caption text-muted-foreground">{tx.t("calendar.planner_nothing")}</Text>
      </View>
    );
  }
  return (
    <View className="border-t border-border">
      {rows.map(([date, list]) => {
        const mark = marks.get(date);
        return (
          <View key={date}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onAnchorChange(date);
                onViewChange("day");
              }}
              className="flex-row items-baseline justify-between bg-muted px-3 py-1.5"
            >
              <Text className={cn("text-caption font-semibold", mark?.holiday ? "text-danger" : "text-foreground")}>{tx.dayHeading(date)}</Text>
              <Text className="text-diagram-xs text-muted-foreground">{tx.adShort(date)}</Text>
            </Pressable>
            {mark?.names.map((name) => (
              <View key={name} className="flex-row items-center gap-3 border-b border-border px-3 py-2.5">
                <View className={cn("h-2.5 w-2.5 rounded-full", mark.holiday ? "bg-danger" : "bg-warning")} />
                <Text numberOfLines={1} className={cn("min-w-0 flex-1 text-body", mark.holiday ? "text-danger" : "text-foreground")}>{name}</Text>
                <Text className="text-caption text-muted-foreground">{tx.t("events.all_day_short")}</Text>
              </View>
            ))}
            {list.map((e) => {
              const k = KIND[eventKindOf(e)];
              return (
                <Pressable key={e.id} onPress={() => onOpenEvent(e)} className="flex-row items-center gap-3 border-b border-border px-3 py-2.5 active:bg-muted">
                  <View className={cn("h-2.5 w-2.5 rounded-full", k.bar)} />
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-body font-medium text-foreground">{e.title}</Text>
                    <Text numberOfLines={1} className="text-caption text-muted-foreground">
                      {tx.t(`events.kind_${eventKindOf(e)}`)}
                      {e.location ? ` · ${e.location}` : ""}
                    </Text>
                  </View>
                  <Text className="font-num text-caption text-muted-foreground">{eventTimeText(e, tx.lang, tx.t("events.all_day_short"))}</Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
