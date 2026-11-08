import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CalendarEvent } from "@vedic-patro/api-client";
import { AccessibilityInfo, PanResponder, Pressable, Text as RNText, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import Animated, { LinearTransition, ZoomIn, ZoomOut } from "react-native-reanimated";
import { adToBS, bsToAD, getBSMonthLength } from "@vedic-patro/domain/calendar/bs-calendar";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { cn } from "@vedic-patro/design-tokens/cn";
import {
  agendaFrom,
  eventsOnDate,
  layoutDay,
  movedTimes,
  personalizeSlots,
  placeBestSlots,
  plannerDays,
  personalDayCopy,
  personalReasonPhrase,
  resizedTimes,
  slotCovered,
  snap,
  usePlannerText,
  weekdayOf,
  weekDates,
  type BestSlot,
  type DayBlock,
  type PersonalColumn,
  type SlotMark,
} from "@vedic-patro/features/events";
import { Icon, Text } from "@vedic-patro/ui";
import { haptics } from "@vedic-patro/ui/motion";
import type { PlannerViewProps } from "../contract";
import { eventKindOf, eventTimeText } from "../event-text";
import { iconBriefcase, iconChevronLeft, iconChevronRight, iconStar, iconSun } from "../icons";

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

/** A held day starts its new event at the next whole hour today, 9:00 on any other day. */
function heldDayTime(date: string, todayAd: string): string {
  if (date !== todayAd) return "09:00";
  const now = new Date();
  return hhmm(Math.min(23, now.getHours() + 1) * 60);
}

/** iPad and wide Android tablets get taller hours and a four-column year. */
function useTablet() {
  const { width, height } = useWindowDimensions();
  return { tablet: width >= 768, height };
}

export function PlannerView(props: PlannerViewProps) {
  const { view, anchor, onAnchorChange, todayAd, wrapBody } = props;
  const tx = usePlannerText();
  const { tablet } = useTablet();
  // A phone runs the grid edge to edge; the toolbar, year and list keep the page's inset.
  const inset = tablet ? undefined : "px-4";
  const timeGrid = view === "day" || view === "multi" || view === "week";
  const step = (dir: 1 | -1) => {
    haptics.tick();
    onAnchorChange(tx.step(view, anchor, dir));
  };

  return (
    <View>
      {/* Toolbar: the month (or year) on the left, ‹ Today › in one capsule on the right. */}
      <View className={cn("flex-row items-center justify-between gap-3 pb-3", inset)}>
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

      {/* Day and Multi Day: the week strip is the top of the bordered grid, as Week's date row is. */}
      {/* The time grid swipes only its days (the strip and headings stay put); a year or the list swipes whole. */}
      {timeGrid ? <TimeGrid {...props} days={plannerDays(view, anchor)} strip={view === "day" || view === "multi" ? <DayStrip {...props} /> : null} /> : null}
      {view === "year" || view === "list"
        ? (wrapBody ?? ((body: ReactNode) => body))(<View className={inset}>{view === "year" ? <YearGrid {...props} /> : <AgendaList {...props} />}</View>)
        : null}
    </View>
  );
}

/** Apple's week strip: weekday letters over the dates; the shown day filled, the next one in a capsule (Multi Day). */
function DayStrip({ view, anchor, marks, todayAd, onAnchorChange, onCreateAt }: PlannerViewProps) {
  const tx = usePlannerText();
  const week = weekDates(anchor);
  const shown = plannerDays(view, anchor);
  const first = week.indexOf(shown[0]!);
  const span = shown.filter((d) => week.includes(d)).length;
  return (
    // Each date is its own cell, ruled off from the next like the grid's columns below.
    <View className="border-b border-border">
      <View className="flex-row">
        {week.map((date, i) => (
          <Text key={date} className={cn("flex-1 pt-2 text-center text-caption font-medium", i > 0 && "border-l border-border", i === 0 || i === 6 ? "text-muted-foreground" : "text-foreground")}>
            {tx.weekdayShort(date).slice(0, 2)}
          </Text>
        ))}
      </View>
      <View className="flex-row">
        {/* The capsule behind the shown days slides to the new ones, as Apple Calendar's does. Animated views
            take a style only; the colour is on the plain view inside. */}
        {span > 1 ? (
          <Animated.View
            pointerEvents="none"
            layout={LinearTransition.springify().damping(18)}
            style={{ position: "absolute", top: 4, bottom: 8, left: `${(first / 7) * 100}%`, width: `${(span / 7) * 100}%` }}
          >
            <View className="flex-1 rounded-full bg-muted" />
          </Animated.View>
        ) : null}
        {week.map((date, i) => {
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
              onLongPress={() => {
                haptics.tick();
                onCreateAt(date, heldDayTime(date, todayAd));
              }}
              delayLongPress={400}
              className={cn("flex-1 items-center pb-2 pt-1", i > 0 && "border-l border-border")}
            >
              {/* Apple: the shown day is filled black, or red when it is today. */}
              <View className="h-10 w-10 items-center justify-center">
                {/* The filled circle shrinks away from the old day and grows on the new one. */}
                {isFirst ? (
                  <Animated.View
                    key={date}
                    entering={ZoomIn.springify().damping(14)}
                    exiting={ZoomOut.duration(140)}
                    style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                  >
                    <View className={cn("flex-1 rounded-full", isToday ? "bg-danger" : "bg-foreground")} />
                  </Animated.View>
                ) : null}
                <Text className={cn("font-num text-title", isFirst ? (isToday ? "font-semibold text-white" : "font-semibold text-background") : isToday ? "font-semibold text-danger" : holiday ? "text-danger" : "text-foreground")}>
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

function TimeGrid({ view, days, strip, events, marks, slots, yogas, personal, todayAd, onOpenEvent, onOpenMark, onOpenPersonal, onMoveEvent, onCreateAt, onAnchorChange, onViewChange, onDragChange, wrapBody }: PlannerViewProps & { days: string[]; strip?: ReactNode }) {
  const tx = usePlannerText();
  const wrap = wrapBody ?? ((body: ReactNode) => body);
  const { tablet } = useTablet();
  const HOUR_H = tablet ? 60 : 52;
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
  const [openPersonal, setOpenPersonal] = useState<string | null>(null);
  const hasAllDay = columns.some((c) => c.allDay.length > 0 || (marks.get(c.date)?.names.length ?? 0) > 0 || (yogas.get(c.date)?.length ?? 0) > 0 || personal.has(c.date));
  const colStyle = { width: colWidth || undefined, flex: colWidth ? undefined : 1 } as const;

  const dragChange = useRef(onDragChange);
  dragChange.current = onDragChange;
  const setBoth = (next: Drag | null) => {
    if ((dragRef.current == null) !== (next == null)) dragChange.current?.(next != null);
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
    // Bordered like the month grid: a rounded card on a tablet, edge to edge (top and bottom lines) on a phone.
    // The border sits on this outer box so the measured width below is the columns' own.
    <View className={cn("overflow-hidden border border-border bg-card", tablet ? "rounded-xl" : "border-x-0")}>
    {strip}
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {/* Heading: the full date (Day), "Wed – 5" per column (Multi Day), or weekday and date (Week). */}
      {view === "day" ? (
        <View className="flex-row flex-wrap items-baseline justify-center gap-x-1.5 border-b border-border py-2.5">
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
              <View key={date} style={colStyle} className="relative border-l border-border">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onAnchorChange(date);
                    onViewChange("day");
                  }}
                  onLongPress={() => {
                    haptics.tick();
                    onCreateAt(date, heldDayTime(date, todayAd));
                  }}
                  delayLongPress={400}
                  className="flex-row items-center justify-center gap-1.5 py-2 active:bg-muted"
                >
                  {/* Apple's week heading: "Sun 5" on one line, today's date in a red circle. */}
                  <Text className={cn("text-body", isToday ? "font-semibold text-danger" : "text-muted-foreground")}>{tx.weekdayShort(date)}</Text>
                  <View className={cn("h-8 min-w-8 items-center justify-center rounded-full px-1", isToday && "bg-danger")}>
                    <Text className={cn("font-num text-title font-semibold", isToday ? "text-white" : weekdayOf(date) === 6 || holiday ? "text-danger" : "text-foreground")}>{tx.bsDay(date)}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* Only the days below the headings move with a swipe: the strip and headings stay put and show the new days once it lands. */}
      {wrap(<View>
      {/* All-day row: holidays and festivals, then the user's all-day events. */}
      {hasAllDay ? (
        <View className="flex-row border-b border-border">
          <View style={{ width: GUTTER }} className="items-end pr-2 pt-2">
            <Text className="text-caption text-muted-foreground">{tx.t("events.all_day_short")}</Text>
          </View>
          {columns.map((c) => {
            const mark = marks.get(c.date);
            return (
              <View key={c.date} style={colStyle} className="gap-1 border-l border-border p-1">
                <PersonalChip date={c.date} column={personal.get(c.date)} week={view === "week"} open={openPersonal === c.date} onToggle={() => setOpenPersonal(openPersonal === c.date ? null : c.date)} onOpen={onOpenPersonal} tx={tx} />
                {(yogas.get(c.date)?.length ?? 0) > 0 ? (
                  <View className="flex-row items-center gap-1.5 rounded-lg bg-success/10 px-2 py-1">
                    <View className="h-1.5 w-1.5 rounded-full bg-success" />
                    <Text numberOfLines={1} className="min-w-0 flex-1 text-body leading-snug font-medium text-success">{tx.t("calendar.best_sarvartha")}</Text>
                  </View>
                ) : null}
                {/* The day's festivals on one line, "तिहार, लक्ष्मी पूजा, काग तिहार, …": all of them in Day (each
                    name opens its details), up to three lines in the narrower columns (a tap opens that day). */}
                {mark && mark.names.length > 0 ? (
                  <Pressable
                    disabled={view === "day"}
                    accessibilityRole={view === "day" ? undefined : "button"}
                    onPress={() => {
                      haptics.tick();
                      onAnchorChange(c.date);
                      onViewChange("day");
                    }}
                    className={cn("flex-row items-start gap-1.5 rounded-md px-2 py-1 active:opacity-70", mark.holiday ? "bg-vermilion/10" : "bg-warning/15")}
                  >
                    <View className={cn("mt-2 h-1.5 w-1.5 rounded-full", mark.holiday ? "bg-danger" : "bg-warning")} />
                    <Text numberOfLines={view === "day" ? undefined : 3} className={cn("min-w-0 flex-1 text-body leading-snug font-medium", mark.holiday ? "text-danger" : "text-foreground")}>
                      {mark.names.map((name, i) => (
                        <Fragment key={name}>
                          {i > 0 ? ", " : ""}
                          <RNText onPress={view === "day" && onOpenMark ? () => onOpenMark(c.date, name, mark.holiday) : undefined}>{name}</RNText>
                        </Fragment>
                      ))}
                    </Text>
                  </Pressable>
                ) : null}
                {c.allDay.map((e) => {
                  const k = KIND[eventKindOf(e)];
                  return (
                    <Pressable key={e.id} accessibilityRole="button" onPress={() => onOpenEvent(e)} className={cn("flex-row items-center gap-1.5 overflow-hidden rounded-md px-2 py-1 active:opacity-70", k.fill)}>
                      <View className={cn("absolute bottom-0 left-0 top-0 w-1", k.bar)} />
                      <Text numberOfLines={1} className={cn("min-w-0 flex-1 text-body leading-snug font-semibold", k.text)}>{e.title}</Text>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
      ) : null}

      {/* The hours. */}
      {/* The whole day, in the page's own scroll: a scroll box inside the page traps the swipe on iOS. */}
      <View>
        <View className="flex-row" style={{ height: HOUR_H * 24 }} {...pan.panHandlers}>
          <View style={{ width: GUTTER }}>
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => {
              if (showsToday && Math.abs(h * 60 - nowMin) < 20) return null;
              const { num, suffix } = tx.hourParts(h);
              return (
                <View key={h} className="absolute right-2 flex-row items-baseline gap-0.5" style={{ top: h * HOUR_H - 7 }}>
                  {num ? <Text className="font-num text-xs text-muted-foreground">{num}</Text> : null}
                  <Text className="text-xs text-muted-foreground">{suffix}</Text>
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
              // Apple Calendar: a tap on an empty slot does nothing, holding it starts a new event there.
              accessibilityLabel={tx.t("calendar.planner_new_here")}
              accessibilityHint={tx.t("events.hold_to_add")}
              delayLongPress={400}
              onLongPress={(e) => {
                haptics.tick();
                const minutes = Math.min(23 * 60 + 45, Math.max(0, snap((e.nativeEvent.locationY / HOUR_H) * 60 - 7)));
                onCreateAt(c.date, hhmm(minutes));
              }}
              style={{ ...colStyle, height: HOUR_H * 24 }}
              className="border-l border-border"
            >
              {/* Hour lines only, as Apple draws them: half-hour lines made the grid look ruled. */}
              {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
                <View key={h} pointerEvents="none" className="absolute left-0 right-0 h-px bg-border" style={{ top: h * HOUR_H }} />
              ))}
              <BestPlaceholders date={c.date} slots={slots.get(c.date) ?? []} column={personal.get(c.date) ?? null} events={events} hourH={HOUR_H} week={view === "week"} tx={tx} onCreateAt={onCreateAt} />
              {c.date === todayAd ? (
                <View pointerEvents="none" className="absolute left-0 right-0 z-20 h-0.5 bg-danger" style={{ top: (nowMin / 60) * HOUR_H }}>
                  <View className="absolute h-2 w-2 rounded-full bg-danger" style={{ left: -4, top: -3 }} />
                </View>
              ) : showsToday ? (
                // The other days of a week that holds today get a faint line at the same time, as in Apple's week.
                <View pointerEvents="none" className="absolute left-0 right-0 z-20 h-px bg-vermilion/40" style={{ top: (nowMin / 60) * HOUR_H }} />
              ) : null}
              <View pointerEvents="box-none" className="absolute bottom-0 top-0" style={{ left: 2, right: 2 }}>
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
      </View>
      </View>)}
    </View>
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
      className={cn("absolute overflow-hidden rounded-md pl-2 pr-1.5 pt-1", k.fill, drag && "z-30 opacity-90")}
      style={{
        top: (from / 60) * hourH + 1,
        height,
        left: `${(lane / lanes) * 100}%`,
        width: `${100 / lanes}%`,
        // Always an array: switching between an array and undefined crashes the native style diff.
        transform: [{ translateX: moving && drag ? drag.dx : 0 }],
      }}
    >
      <View className={cn("absolute bottom-0 left-0 top-0 w-1", k.bar)} />
      <Text numberOfLines={height > 44 ? 2 : 1} className={cn("text-caption font-semibold leading-tight", k.text)}>{event.title}</Text>
      {height > 34 ? <Text numberOfLines={1} className={cn("font-num text-diagram-xs opacity-80", k.text)}>{tx.clock(from)} – {tx.clock(to)}</Text> : null}
      {height > 56 && event.location ? <Text numberOfLines={1} className="text-diagram-xs text-muted-foreground">{event.location}</Text> : null}
      <Pressable accessibilityLabel={tx.t("events.ends")} onLongPress={() => onGrab("resize")} delayLongPress={250} className="absolute bottom-0 left-0 right-0 h-3" />
    </Pressable>
  );
}

type PlannerText = ReturnType<typeof usePlannerText>;

function rangeClock(tx: PlannerText, start: number, end: number): string {
  const endText = end >= 1440 ? tx.digits("24:00") : tx.clock(end);
  return `${tx.clock(start)}–${endText}`;
}

function toneChip(tone: PersonalColumn["tone"]): string {
  if (tone === "best" || tone === "good") return "bg-success/10";
  if (tone === "bad") return "bg-warning/15";
  if (tone === "worst") return "bg-vermilion/10";
  return "bg-muted";
}

function toneInk(tone: PersonalColumn["tone"]): string {
  if (tone === "best" || tone === "good") return "text-success";
  if (tone === "bad") return "text-warning";
  if (tone === "worst") return "text-danger";
  return "text-muted-foreground";
}

function toneDot(tone: PersonalColumn["tone"]): string {
  if (tone === "best" || tone === "good") return "bg-success";
  if (tone === "bad") return "bg-warning";
  if (tone === "worst") return "bg-danger";
  return "bg-muted-foreground";
}

function reasonText(mark: SlotMark, tx: PlannerText): string {
  if (mark.kind === "plain") return "";
  return mark.reasons.map((reason) => personalReasonPhrase(reason, tx)).join(" · ");
}

function slotCopy(slot: BestSlot, mark: SlotMark, tx: PlannerText): { intent: string; short: string; names: string; clock: string; title: string; suggested: string; reason: string } {
  const names = slot.sources.map((s) => (tx.lang === "en" ? s.nameEn : s.nameNe)).join(" · ");
  const clock = rangeClock(tx, slot.startMin, slot.endMin);
  const base = tx.t(slot.intent === "material" ? "calendar.best_material" : "calendar.best_spiritual");
  const baseShort = tx.t(slot.intent === "material" ? "calendar.best_material_short" : "calendar.best_spiritual_short");
  const intent = mark.kind === "routine" ? tx.t("calendar.personal_routine") : mark.kind === "review" ? tx.t("calendar.personal_review") : base;
  const short = mark.kind === "routine" ? tx.t("calendar.personal_routine_short") : mark.kind === "review" ? tx.t("calendar.personal_review_short") : baseShort;
  const reason = reasonText(mark, tx);
  const badge = mark.kind === "best" ? tx.t("calendar.personal_best") : "";
  const suggested = mark.kind === "routine" || mark.kind === "review" ? intent : names;
  return { intent, short, names, clock, reason, suggested, title: [badge, intent, reason, clock].filter(Boolean).join(" · ") };
}

/** A suggestion in the grid. A timed event, task or appointment that overlaps it hides it. */
function BestPlaceholders({ date, slots, column, events, hourH, week, tx, onCreateAt }: { date: string; slots: BestSlot[]; column: PersonalColumn | null; events: CalendarEvent[]; hourH: number; week: boolean; tx: PlannerText; onCreateAt: PlannerViewProps["onCreateAt"] }) {
  const visible = slots.filter((s) => !slotCovered(s, events, date));
  const marked = personalizeSlots(visible, column);
  const markOf = new Map(marked.map((item) => [item.slot.id, item.mark]));
  return placeBestSlots(marked.map((item) => item.slot)).map(({ slot, lane, lanes }) => {
    const mark = markOf.get(slot.id) ?? { kind: "plain" as const };
    const copy = slotCopy(slot, mark, tx);
    const box = Math.max(((slot.endMin - slot.startMin) / 60) * hourH, 32);
    const amber = mark.kind === "routine" || mark.kind === "review";
    const spiritual = slot.intent === "spiritual";
    const ink = amber ? "text-warning" : spiritual ? "text-slot-spiritual-foreground" : "text-success";
    const endMin = slot.endMin;
    const icon = <Icon node={spiritual && !amber ? iconSun : iconBriefcase} size={16} />;
    const star = mark.kind === "best" ? <Icon node={iconStar} size={16} /> : null;
    const label = (
      <View className="flex-row items-center gap-1">
        {star}
        {icon}
        <Text numberOfLines={1} className={cn("min-w-0 flex-1 text-sm font-semibold leading-tight", ink)}>{week ? copy.short : box < 52 ? `${copy.intent} · ${copy.clock}` : copy.intent}</Text>
      </View>
    );
    return (
      <View
        key={slot.id}
        pointerEvents="box-none"
        className="absolute px-px"
        style={{ left: `${(lane / lanes) * 100}%`, width: `${100 / lanes}%`, top: (slot.startMin / 60) * hourH, height: box }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.title}
          delayLongPress={400}
          onLongPress={() => AccessibilityInfo.announceForAccessibility(copy.title)}
          onPress={() => {
            onCreateAt(date, hhmm(slot.startMin), {
              end: endMin >= 1440 ? "00:00" : hhmm(endMin),
              endDate: endMin >= 1440 ? shiftDate(date, 1) : date,
              title: copy.suggested,
            });
          }}
          className={cn("h-full justify-center overflow-hidden rounded-lg py-0.5 pl-2 pr-1", amber ? "bg-warning/8" : spiritual ? "bg-slot-spiritual/8" : "bg-success/8")}
        >
          <View className={cn("absolute bottom-1 left-0 top-1 w-[3px] rounded-full", amber ? "bg-warning" : spiritual ? "bg-slot-spiritual" : "bg-success")} />
          {week ? (
            <>
              {label}
              {box >= 52 ? <Text numberOfLines={1} className="font-num text-sm leading-tight text-muted-foreground">{copy.clock}</Text> : null}
            </>
          ) : box < 52 ? (
            label
          ) : (
            <>
              <Text numberOfLines={1} className="font-num text-sm leading-tight text-muted-foreground">{copy.clock}</Text>
              {label}
              {box > 78 ? <Text numberOfLines={1} className="text-sm leading-tight text-muted-foreground">{copy.reason || copy.names}</Text> : null}
            </>
          )}
        </Pressable>
      </View>
    );
  });
}

function PersonalChip({ date, column, week, open, onToggle, onOpen, tx }: { date: string; column: PersonalColumn | undefined; week: boolean; open: boolean; onToggle: () => void; onOpen?: (date: string, column: PersonalColumn) => void; tx: PlannerText }) {
  if (!column) return null;
  const copy = personalDayCopy(column, tx);
  const label = week ? copy.toneLabel : [copy.heading, copy.toneLabel, copy.reason].filter(Boolean).join(" · ");
  return (
    <View>
      {/* The app opens the day's reading in a dialog (too much text for a column); without one it unfolds here. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${date}`}
        accessibilityState={onOpen ? undefined : { expanded: open }}
        onPress={onOpen ? () => onOpen(date, column) : onToggle}
        className={cn("flex-row items-center gap-1.5 rounded-md px-2 py-1 active:opacity-70", toneChip(column.tone))}
      >
        <View className={cn("h-1.5 w-1.5 rounded-full", toneDot(column.tone))} />
        <Text numberOfLines={1} className={cn("min-w-0 flex-1 text-body leading-snug font-medium", toneInk(column.tone))}>{label}</Text>
      </Pressable>
      {open && !onOpen ? (
        <View className="mt-1 rounded-lg border border-border bg-card p-2">
          <Text className="text-caption font-semibold text-foreground">{copy.profileName}</Text>
          {copy.notes.map((note) => (
            <Text key={note} className="mt-1 text-caption text-muted-foreground">{note}</Text>
          ))}
          {copy.sections.map((section) => (
            <View key={section.label} className="mt-1.5">
              <Text className="text-caption text-muted-foreground">{section.label}</Text>
              {section.lines.map((line) => <Text key={line} className="text-caption text-foreground">{line}</Text>)}
            </View>
          ))}
        </View>
      ) : null}
    </View>
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
