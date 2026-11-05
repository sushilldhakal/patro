import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { PanResponder, Pressable, ScrollView, View, type LayoutChangeEvent } from "react-native";
import type { CalendarEvent } from "@vedic-patro/api-client";
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

const HOUR_H = 52;
const GUTTER = 36;
const KIND_STYLE = {
  event: "border-primary bg-saffron/15",
  task: "border-success bg-success/15",
  appointment: "border-warning bg-warning/15",
} as const;
const KIND_TEXT = { event: "text-primary", task: "text-success", appointment: "text-warning" } as const;

const isoOfDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Week, day, year and list views of the home calendar: the user's events beside the festivals and holidays. */
export function PlannerView(props: PlannerViewProps) {
  const { view, anchor, onAnchorChange } = props;
  const tx = usePlannerText();
  const { t } = tx;
  const arrow = "h-9 w-9 items-center justify-center active:opacity-50";

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="min-w-0 flex-1 text-title font-semibold text-foreground" numberOfLines={1}>{tx.title(view, anchor)}</Text>
        <View className="flex-row items-center gap-1">
          <Pressable onPress={() => { haptics.tick(); onAnchorChange(props.todayAd); }} accessibilityRole="button" className="rounded-full bg-muted px-3 py-1.5 active:opacity-70">
            <Text className="text-caption font-medium text-foreground">{t("today")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("calendar.planner_prev")} onPress={() => { haptics.tick(); onAnchorChange(tx.step(view, anchor, -1)); }} className={arrow}>
            <Icon node={iconChevronLeft} size={20} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("calendar.planner_next")} onPress={() => { haptics.tick(); onAnchorChange(tx.step(view, anchor, 1)); }} className={arrow}>
            <Icon node={iconChevronRight} size={20} />
          </Pressable>
        </View>
      </View>
      {view === "day" || view === "multi" ? <DayStrip {...props} /> : null}
      {view === "day" ? <MuhurtaList date={anchor} windows={props.windows} /> : null}
      {view === "day" || view === "multi" || view === "week" ? (
        <View className="flex-row items-center gap-4">
          <View className="flex-row items-center gap-1.5">
            <View className="h-2.5 w-2.5 rounded-sm bg-success/40" />
            <Text className="text-diagram-xs text-muted-foreground">{t("calendar.window_shubh")}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="h-2.5 w-2.5 rounded-sm bg-vermilion/40" />
            <Text className="text-diagram-xs text-muted-foreground">{t("calendar.window_ashubh")}</Text>
          </View>
        </View>
      ) : null}
      {view === "year" ? <YearGrid {...props} /> : view === "list" ? <AgendaList {...props} /> : <TimeGrid {...props} days={plannerDays(view, anchor)} />}
    </View>
  );
}

type Drag = { id: string; mode: "move" | "resize"; dx: number; dy: number };

function TimeGrid({ days, events, marks, windows, todayAd, onOpenEvent, onMoveEvent, onCreateAt, onAnchorChange, onViewChange }: PlannerViewProps & { days: string[] }) {
  const tx = usePlannerText();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const columns = useMemo(() => days.map((date) => ({ date, ...layoutDay(events, date) })), [days, events]);
  const colWidth = width > 0 ? (width - GUTTER) / days.length : 0;
  const latest = useRef({ columns, colWidth, days, onMoveEvent });
  latest.current = { columns, colWidth, days, onMoveEvent };

  useEffect(() => {
    const toToday = days.includes(todayAd);
    scroller.current?.scrollTo({ y: Math.max(0, ((toToday ? new Date().getHours() : 7) - 1) * HOUR_H), animated: false });
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
    const { columns: cols, colWidth: cw, days: ds, onMoveEvent: save } = latest.current;
    const event = cols.flatMap((c) => c.timed).find((b) => b.event.id === current.id)?.event;
    if (!event) return;
    const minuteDelta = snap((dy / HOUR_H) * 60);
    if (current.mode === "resize") return minuteDelta !== 0 ? save(event, resizedTimes(event, minuteDelta)) : undefined;
    const dayDelta = ds.length > 1 && cw > 0 ? Math.round(dx / cw) : 0;
    if (dayDelta !== 0 || minuteDelta !== 0) save(event, movedTimes(event, dayDelta, minuteDelta));
  }

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} className="overflow-hidden rounded-2xl border border-border bg-card">
      <ScrollView ref={scroller} style={{ maxHeight: 520 }} scrollEnabled={drag == null} stickyHeaderIndices={[0]} nestedScrollEnabled>
        <View className="border-b border-border bg-card">
          <View className="flex-row">
            <View style={{ width: GUTTER }} />
            {columns.map((c) => {
              const mark = marks.get(c.date);
              const today = c.date === todayAd;
              return (
                <Pressable
                  key={c.date}
                  accessibilityRole="button"
                  onPress={() => {
                    onAnchorChange(c.date);
                    onViewChange("day");
                  }}
                  style={{ width: colWidth || undefined, flex: colWidth ? undefined : 1 }}
                  className="items-center py-2 active:opacity-70"
                >
                  <Text className="text-diagram-xs text-muted-foreground">{tx.weekdayShort(c.date)}</Text>
                  <View className={cn("h-8 w-8 items-center justify-center rounded-full", today && "bg-secondary")}>
                    <Text className={cn("font-num text-body font-semibold", today ? "text-secondary-foreground" : mark?.holiday ? "text-danger" : "text-foreground")}>{tx.bsDay(c.date)}</Text>
                  </View>
                  <Text className="font-num text-diagram-xs text-muted-foreground">{tx.adDay(c.date)}</Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row border-t border-border">
            <View style={{ width: GUTTER }} className="items-end justify-center pr-1">
              <Text className="text-diagram-xs text-muted-foreground">{tx.t("events.all_day_short")}</Text>
            </View>
            {columns.map((c) => {
              const mark = marks.get(c.date);
              return (
                <View key={c.date} style={{ width: colWidth || undefined, flex: colWidth ? undefined : 1 }} className="gap-0.5 border-l border-border p-0.5">
                  {mark?.names.slice(0, 2).map((name) => (
                    <View key={name} className={cn("rounded px-1", mark.holiday ? "bg-vermilion/15" : "bg-muted")}>
                      <Text numberOfLines={1} className={cn("text-diagram-xs font-medium", mark.holiday ? "text-danger" : "text-foreground")}>{name}</Text>
                    </View>
                  ))}
                  {c.allDay.map((e) => (
                    <Pressable key={e.id} onPress={() => onOpenEvent(e)} className={cn("rounded border-l-4 px-1", KIND_STYLE[eventKindOf(e)])}>
                      <Text numberOfLines={1} className={cn("text-diagram-xs font-semibold", KIND_TEXT[eventKindOf(e)])}>{e.title}</Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </View>
        </View>

        <View className="flex-row" style={{ height: HOUR_H * 24 }} {...pan.panHandlers}>
          <View style={{ width: GUTTER }}>
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
              <View key={h} className="absolute right-1" style={{ top: h * HOUR_H - 7 }}>
                <Text className="text-diagram-xs text-muted-foreground">{tx.hour(h)}</Text>
              </View>
            ))}
          </View>
          {columns.map((c) => (
            <Pressable
              key={c.date}
              accessibilityLabel={tx.t("calendar.planner_new_here")}
              onPress={(e) => {
                const minutes = Math.min(23 * 60 + 45, Math.max(0, snap((e.nativeEvent.locationY / HOUR_H) * 60 - 7)));
                onCreateAt(c.date, `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
              }}
              style={{ width: colWidth || undefined, flex: colWidth ? undefined : 1, height: HOUR_H * 24 }}
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
                    className={cn("absolute w-1 rounded-full", source === "ashubh" ? "bg-vermilion/70" : "bg-success/70")}
                    style={{ left: 2 + lane * 6, top: (run.startMin / 60) * HOUR_H, height: ((run.endMin - run.startMin) / 60) * HOUR_H }}
                  />
                )),
              )}
              {c.date === todayAd ? <NowLine /> : null}
              <View pointerEvents="box-none" className="absolute inset-y-0 right-0" style={{ left: 14 }}>
              {c.timed.map((b) => (
                <Block
                  key={b.event.id}
                  block={b}
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

function NowLine() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return <View pointerEvents="none" className="absolute left-0 right-0 z-10 h-0.5 bg-danger" style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_H }} />;
}

function Block({ block, drag, onOpen, onGrab }: { block: DayBlock; drag: Drag | null; onOpen: () => void; onGrab: (mode: Drag["mode"]) => void }) {
  const { event, startMin, endMin, lane, lanes } = block;
  const tx = usePlannerText();
  const kind = eventKindOf(event);
  const dy = drag ? snap((drag.dy / HOUR_H) * 60) : 0;
  const moving = drag?.mode === "move";
  const top = ((startMin + (moving ? dy : 0)) / 60) * HOUR_H;
  const height = Math.max(((endMin - startMin + (drag?.mode === "resize" ? dy : 0)) / 60) * HOUR_H, 20);
  return (
    <Pressable
      onPress={onOpen}
      onLongPress={() => onGrab("move")}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={event.title}
      className={cn("absolute overflow-hidden rounded-md border-l-4 px-1 py-0.5", KIND_STYLE[kind], drag && "z-30 opacity-90")}
      style={{
        top,
        height,
        left: `${(lane / lanes) * 100}%`,
        width: `${100 / lanes}%`,
        transform: moving && drag ? [{ translateX: drag.dx }] : undefined,
      }}
    >
      <Text numberOfLines={2} className={cn("text-diagram-xs font-semibold leading-tight", KIND_TEXT[kind])}>{event.title}</Text>
      {height > 34 ? <Text numberOfLines={1} className="text-diagram-xs text-muted-foreground">{tx.clock(startMin + (moving ? dy : 0))}</Text> : null}
      <Pressable accessibilityLabel={tx.t("events.ends")} onLongPress={() => onGrab("resize")} delayLongPress={250} className="absolute inset-x-0 bottom-0 h-3" />
    </Pressable>
  );
}

function YearGrid({ anchor, events, marks, todayAd, onAnchorChange, onViewChange }: PlannerViewProps) {
  const tx = usePlannerText();
  const year = adToBS(new Date(`${anchor}T12:00:00`)).year;
  return (
    <View className="gap-3">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
        const first = bsToAD(year, month, 1);
        const length = getBSMonthLength(year, month);
        const cells: (number | null)[] = [...Array.from({ length: first.getDay() }, () => null), ...Array.from({ length }, (_, i) => i + 1)];
        while (cells.length % 7 !== 0) cells.push(null);
        const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
        return (
          <View key={month} className="rounded-2xl border border-border bg-card p-3">
            <Text className="mb-1 text-body font-semibold text-foreground">{tx.bsMonth(isoOfDate(first))}</Text>
            <View className="flex-row">
              {weekDates("2026-11-01").map((d) => (
                <Text key={d} className="flex-1 text-center text-diagram-xs text-muted-foreground">{tx.weekdayShort(d).slice(0, 1)}</Text>
              ))}
            </View>
            {rows.map((row, r) => (
              <View key={r} className="flex-row">
                {row.map((day, i) => {
                  if (day == null) return <View key={`e-${r}-${i}`} className="h-9 flex-1" />;
                  const iso = isoOfDate(bsToAD(year, month, day));
                  const mark = marks.get(iso);
                  const has = eventsOnDate(events, iso).length > 0;
                  return (
                    <Pressable
                      key={iso}
                      accessibilityRole="button"
                      onPress={() => {
                        haptics.tick();
                        onAnchorChange(iso);
                        onViewChange("day");
                      }}
                      className="h-9 flex-1 items-center justify-center"
                    >
                      <View className={cn("h-8 w-8 items-center justify-center rounded-full", mark?.holiday && "bg-vermilion/15", iso === todayAd && "border border-secondary")}>
                        <Text className={cn("font-num text-caption", mark?.holiday ? "font-semibold text-danger" : "text-foreground")}>{tx.digits(day)}</Text>
                      </View>
                      {has ? <View className="absolute bottom-0 h-1 w-1 rounded-full bg-primary" /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

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
      <View className="rounded-2xl border border-border bg-card p-4">
        <Text className="text-caption text-muted-foreground">{tx.t("calendar.planner_nothing")}</Text>
      </View>
    );
  }
  return (
    <View className="gap-2">
      {rows.map(([date, list]) => {
        const mark = marks.get(date);
        return (
          <View key={date} className="flex-row gap-3 rounded-2xl border border-border bg-card p-3">
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onAnchorChange(date);
                onViewChange("day");
              }}
              className="w-14 items-center"
            >
              <Text className="text-diagram-xs text-muted-foreground">{tx.weekdayShort(date)}</Text>
              <Text className={cn("font-num text-title font-semibold", mark?.holiday ? "text-danger" : "text-foreground")}>{tx.bsDay(date)}</Text>
              <Text className="text-diagram-xs text-muted-foreground">{tx.bsMonth(date)}</Text>
            </Pressable>
            <View className="min-w-0 flex-1 gap-1.5">
              {mark?.names.map((name) => (
                <View key={name} className={cn("self-start rounded px-1.5", mark.holiday ? "bg-vermilion/15" : "bg-muted")}>
                  <Text numberOfLines={1} className={cn("text-caption font-medium", mark.holiday ? "text-danger" : "text-foreground")}>{name}</Text>
                </View>
              ))}
              {list.map((e) => {
                const kind = eventKindOf(e);
                return (
                  <Pressable key={e.id} onPress={() => onOpenEvent(e)} className={cn("rounded-md border-l-4 px-2 py-1", KIND_STYLE[kind])}>
                    <Text numberOfLines={1} className={cn("text-body font-semibold", KIND_TEXT[kind])}>{e.title}</Text>
                    <Text className="text-caption text-muted-foreground">{tx.t(`events.kind_${kind}`)} · {eventTimeText(e, tx.lang, tx.t("events.all_day_short"))}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** The week as one row of day buttons, like Apple Calendar's: the shown day(s) lit, the rest a tap away. */
function DayStrip({ view, anchor, marks, todayAd, onAnchorChange }: PlannerViewProps) {
  const tx = usePlannerText();
  const shown = plannerDays(view, anchor);
  return (
    <View className="flex-row rounded-2xl bg-muted p-1">
      {weekDates(anchor).map((date) => {
        const index = shown.indexOf(date);
        const holiday = marks.get(date)?.holiday;
        return (
          <Pressable
            key={date}
            accessibilityRole="button"
            accessibilityState={{ selected: index >= 0 }}
            onPress={() => {
              haptics.tick();
              onAnchorChange(date);
            }}
            className="flex-1 items-center gap-0.5 py-1 active:opacity-70"
          >
            <Text className="text-diagram-xs text-muted-foreground">{tx.weekdayShort(date).slice(0, 2)}</Text>
            <View className={cn("h-9 w-9 items-center justify-center rounded-full", index === 0 && "bg-secondary", index > 0 && "bg-secondary/20", index < 0 && date === todayAd && "border border-secondary")}>
              <Text className={cn("font-num text-body font-semibold", index === 0 ? "text-secondary-foreground" : index < 0 && holiday ? "text-danger" : "text-foreground")}>{tx.bsDay(date)}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The day's शुभ and अशुभ muhurtas by name and time: what the rails on the grid stand for. */
function MuhurtaList({ date, windows }: { date: string; windows: PlannerViewProps["windows"] }) {
  const tx = usePlannerText();
  const list = [...(windows.get(date) ?? [])].sort((a, b) => a.startMin - b.startMin);
  if (list.length === 0) return null;
  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-3">
      {(["shubh", "ashubh"] as const).map((source) => {
        const rows = list.filter((w) => w.source === source);
        if (rows.length === 0) return null;
        return (
          <View key={source} className="gap-1.5">
            <Text className={cn("text-caption font-semibold", source === "ashubh" ? "text-danger" : "text-success")}>
              {tx.t(source === "ashubh" ? "calendar.window_ashubh" : "calendar.window_shubh")}
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {rows.map((w) => (
                <View key={w.id} className={cn("flex-row items-center gap-1.5 rounded-full px-2.5 py-1", source === "ashubh" ? "bg-vermilion/10" : "bg-success/10")}>
                  <Text className={cn("text-caption font-medium", source === "ashubh" ? "text-danger" : "text-success")}>{tx.lang === "en" ? w.nameEn : w.nameNe}</Text>
                  <Text className="font-num text-caption text-muted-foreground">{tx.clock(w.startMin)}–{tx.clock(w.endMin)}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
