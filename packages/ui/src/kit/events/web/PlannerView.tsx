import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
import { Icon } from "@vedic-patro/ui";
import type { PlannerViewProps } from "../contract";
import { eventKindOf, eventTimeText } from "../event-text";
import { iconChevronLeft, iconChevronRight } from "../icons";

/**
 * The home calendar's planner views drawn the way Apple Calendar draws them: a week strip with the shown
 * day filled, hairline hours with "7 am" labels in a gutter, tinted event blocks with a colour bar, a red
 * now-line, a year of small months and a list grouped by day. The same layout as the app's.
 */

const HOUR_H = 56;
const GUTTER = 56;
/** Event colours: a soft fill, the bar and the title. */
const KIND = {
  event: { fill: "bg-primary/15", bar: "bg-primary", text: "text-primary" },
  task: { fill: "bg-success/15", bar: "bg-success", text: "text-success" },
  appointment: { fill: "bg-warning/20", bar: "bg-warning", text: "text-warning" },
} as const;

const isoOfDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function PlannerView(props: PlannerViewProps) {
  const { view, anchor, onAnchorChange, todayAd } = props;
  const tx = usePlannerText();
  const timeGrid = view === "day" || view === "multi" || view === "week";

  return (
    <section className="flex flex-col max-md:px-3">
      {/* Toolbar: the month (or year) on the left, ‹ Today › in one capsule on the right. */}
      <div className="flex items-center justify-between gap-3 pb-3">
        <h2 className="m-0 min-w-0 truncate text-2xl font-bold tracking-tight">{tx.title(view, anchor)}</h2>
        <div className="flex shrink-0 items-center rounded-full border border-border bg-card p-0.5 shadow-sm">
          <button type="button" aria-label={tx.t("calendar.planner_prev")} onClick={() => onAnchorChange(tx.step(view, anchor, -1))} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted">
            <Icon node={iconChevronLeft} size={18} />
          </button>
          <button type="button" onClick={() => onAnchorChange(todayAd)} className="rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-muted">
            {tx.t("today")}
          </button>
          <button type="button" aria-label={tx.t("calendar.planner_next")} onClick={() => onAnchorChange(tx.step(view, anchor, 1))} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted">
            <Icon node={iconChevronRight} size={18} />
          </button>
        </div>
      </div>

      {view === "day" || view === "multi" ? <DayStrip {...props} /> : null}
      {timeGrid ? <TimeGrid {...props} days={plannerDays(view, anchor)} /> : null}
      {view === "year" ? <YearGrid {...props} /> : null}
      {view === "list" ? <AgendaList {...props} /> : null}
    </section>
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
    <div className="border-b border-border pb-2">
      <div className="relative grid grid-cols-7">
        {/* The capsule behind the shown days. */}
        {span > 1 ? (
          <span aria-hidden className="absolute bottom-0 h-10 rounded-full bg-muted" style={{ left: `calc(${(first / 7) * 100}% + 4px)`, width: `calc(${(span / 7) * 100}% - 8px)` }} />
        ) : null}
        {week.map((date, i) => {
          const isShown = shown.includes(date);
          const isFirst = date === shown[0];
          const isToday = date === todayAd;
          const holiday = marks.get(date)?.holiday;
          return (
            <button key={date} type="button" onClick={() => onAnchorChange(date)} aria-pressed={isShown} className="relative flex flex-col items-center gap-1 border-none bg-transparent">
              <span className={cn("text-xs font-medium", i === 0 || i === 6 ? "text-muted-foreground" : "text-foreground")}>{tx.weekdayShort(date).slice(0, 2)}</span>
              <span
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-full text-lg tabular-nums transition-colors",
                  isFirst ? "bg-foreground font-semibold text-background" : isToday ? "font-semibold text-danger" : holiday ? "text-danger" : "text-foreground",
                  !isShown && "hover:bg-muted",
                )}
              >
                {tx.bsDay(date)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Drag = { id: string; mode: "move" | "resize"; dx: number; dy: number; moved: boolean };

function TimeGrid({ view, days, events, marks, windows, todayAd, onOpenEvent, onMoveEvent, onCreateAt, onAnchorChange, onViewChange }: PlannerViewProps & { days: string[] }) {
  const tx = usePlannerText();
  const scroller = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const start = useRef<{ x: number; y: number; colWidth: number } | null>(null);
  const columns = useMemo(() => days.map((date) => ({ date, ...layoutDay(events, date) })), [days, events]);
  const now = useNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showsToday = days.includes(todayAd);
  const hasAllDay = columns.some((c) => c.allDay.length > 0 || (marks.get(c.date)?.names.length ?? 0) > 0);

  useEffect(() => {
    scroller.current?.scrollTo({ top: Math.max(0, ((showsToday ? now.getHours() : 7) - 1) * HOUR_H) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.join(",")]);

  const begin = (e: ReactPointerEvent, id: string, mode: Drag["mode"]) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, colWidth: colRef.current?.getBoundingClientRect().width ?? 1 };
    setDrag({ id, mode, dx: 0, dy: 0, moved: false });
  };
  const move = (e: ReactPointerEvent) => {
    if (!drag || !start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    setDrag({ ...drag, dx, dy, moved: drag.moved || Math.abs(dx) > 4 || Math.abs(dy) > 4 });
  };
  const end = (event: CalendarEvent) => {
    if (!drag || !start.current) return;
    const { dx, dy, moved, mode } = drag;
    const colWidth = start.current.colWidth;
    setDrag(null);
    start.current = null;
    if (!moved) return onOpenEvent(event);
    const minuteDelta = snap((dy / HOUR_H) * 60);
    if (mode === "resize") return minuteDelta !== 0 ? onMoveEvent(event, resizedTimes(event, minuteDelta)) : undefined;
    const dayDelta = days.length > 1 ? Math.round(dx / colWidth) : 0;
    if (dayDelta !== 0 || minuteDelta !== 0) onMoveEvent(event, movedTimes(event, dayDelta, minuteDelta));
  };

  const cols = `${GUTTER}px repeat(${days.length}, minmax(0, 1fr))`;
  return (
    <div className="flex flex-col">
      {/* Heading: the full date (Day), "Wed – 5" per column (Multi Day), or weekday and date (Week). */}
      {view === "day" ? (
        <p className="m-0 py-2.5 text-center text-base font-semibold">
          {tx.dayHeading(days[0]!)} <span className="font-normal text-muted-foreground">· {tx.adShort(days[0]!)}</span>
        </p>
      ) : (
        <div className="grid border-b border-border" style={{ gridTemplateColumns: cols }}>
          <span />
          {days.map((date) => {
            const isToday = date === todayAd;
            const holiday = marks.get(date)?.holiday;
            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  onAnchorChange(date);
                  onViewChange("day");
                }}
                className="flex items-center justify-center gap-1.5 border-0 border-l border-border/60 bg-transparent py-2.5 hover:bg-muted/60"
              >
                {view === "multi" ? (
                  <span className={cn("text-sm font-semibold", isToday ? "text-danger" : holiday ? "text-danger" : "text-foreground")}>{tx.columnHeading(date)}</span>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">{tx.weekdayShort(date)}</span>
                    <span className={cn("inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums", isToday ? "bg-danger text-white" : holiday ? "text-danger" : "text-foreground")}>
                      {tx.bsDay(date)}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      {view === "day" ? <MuhurtaRow date={days[0]!} windows={windows} /> : null}

      {/* All-day row: holidays and festivals, then the user's all-day events. */}
      {hasAllDay ? (
        <div className="grid border-b border-border" style={{ gridTemplateColumns: cols }}>
          <span className="pr-2 pt-2 text-right text-xs text-muted-foreground">{tx.t("events.all_day_short")}</span>
          {columns.map((c) => {
            const mark = marks.get(c.date);
            return (
              <div key={c.date} className="flex min-w-0 flex-col gap-1 border-l border-border/60 p-1">
                {mark?.names.slice(0, view === "week" ? 2 : 3).map((name) => (
                  <span key={name} className={cn("flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium", mark.holiday ? "bg-danger/10 text-danger" : "bg-warning/15 text-foreground")}>
                    <span className={cn("size-1.5 shrink-0 rounded-full", mark.holiday ? "bg-danger" : "bg-warning")} />
                    <span className="truncate">{name}</span>
                  </span>
                ))}
                {c.allDay.map((e) => {
                  const k = KIND[eventKindOf(e)];
                  return (
                    <button key={e.id} type="button" onClick={() => onOpenEvent(e)} className={cn("truncate rounded-lg border-none px-2 py-1 text-left text-xs font-semibold", k.fill, k.text)}>
                      {e.title}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* The hours. */}
      <div ref={scroller} className="relative max-h-[70vh] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <div className="relative" style={{ height: HOUR_H * 24 }}>
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => {
              const near = showsToday && Math.abs(h * 60 - nowMin) < 20;
              if (near) return null;
              const { num, suffix } = tx.hourParts(h);
              return (
                <span key={h} className="absolute right-2 -translate-y-1/2 whitespace-nowrap text-right leading-none" style={{ top: h * HOUR_H }}>
                  {num ? <span className="text-sm text-foreground/70 tabular-nums">{num} </span> : null}
                  <span className={cn("text-diagram-xs", num ? "text-muted-foreground" : "font-semibold text-foreground/70")}>{suffix}</span>
                </span>
              );
            })}
            {showsToday ? (
              <span className="absolute right-1 z-10 -translate-y-1/2 rounded-full bg-danger px-1.5 py-0.5 text-diagram-xs font-semibold tabular-nums text-white" style={{ top: (nowMin / 60) * HOUR_H }}>
                {tx.clock(nowMin)}
              </span>
            ) : null}
          </div>

          {columns.map((c, ci) => (
            <div
              key={c.date}
              ref={ci === 0 ? colRef : undefined}
              className="relative cursor-cell border-l border-border/60"
              style={{ height: HOUR_H * 24 }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const minutes = Math.min(23 * 60 + 45, Math.max(0, snap(((e.clientY - rect.top) / HOUR_H) * 60 - 7)));
                onCreateAt(c.date, hhmm(minutes));
              }}
            >
              {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
                <span key={h} aria-hidden className="pointer-events-none absolute inset-x-0 h-px bg-border/70" style={{ top: h * HOUR_H }} />
              ))}
              {/* Two thin rails on the left edge: runs of शुभ (green) and of अशुभ (red) time. */}
              {(["shubh", "ashubh"] as const).map((source, lane) =>
                railOf(windows.get(c.date) ?? [], source).map((run) => (
                  <span
                    key={`${source}-${run.startMin}`}
                    aria-hidden
                    className={cn("pointer-events-none absolute z-[1] w-1 rounded-full", source === "ashubh" ? "bg-danger/60" : "bg-success/70")}
                    style={{ left: 3 + lane * 6, top: (run.startMin / 60) * HOUR_H + 1, height: ((run.endMin - run.startMin) / 60) * HOUR_H - 2 }}
                  />
                )),
              )}
              {c.date === todayAd ? (
                <span aria-hidden className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-danger" style={{ top: (nowMin / 60) * HOUR_H }}>
                  <span className="absolute -left-1 -top-[3px] size-2 rounded-full bg-danger" />
                </span>
              ) : null}
              <div className="pointer-events-none absolute inset-y-0 left-4 right-1">
                {c.timed.map((b) => (
                  <Block
                    key={b.event.id}
                    block={b}
                    drag={drag?.id === b.event.id ? drag : null}
                    onDown={(e, mode) => begin(e, b.event.id, mode)}
                    onMove={move}
                    onUp={() => end(b.event)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
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

function Block({ block, drag, onDown, onMove, onUp }: { block: DayBlock; drag: Drag | null; onDown: (e: ReactPointerEvent, mode: Drag["mode"]) => void; onMove: (e: ReactPointerEvent) => void; onUp: () => void }) {
  const { event, startMin, endMin, lane, lanes } = block;
  const tx = usePlannerText();
  const k = KIND[eventKindOf(event)];
  const dy = drag && drag.moved ? snap((drag.dy / HOUR_H) * 60) : 0;
  const moving = drag?.mode === "move";
  const from = startMin + (moving ? dy : 0);
  const to = endMin + (drag?.mode === "resize" || moving ? dy : 0);
  const height = Math.max(((to - from) / 60) * HOUR_H - 2, 22);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => onDown(e, "move")}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className={cn("pointer-events-auto absolute z-[5] cursor-grab touch-none select-none overflow-hidden rounded-md pl-2.5 pr-1.5 pt-1 text-left backdrop-blur-[1px]", k.fill, drag?.moved && "z-30 cursor-grabbing shadow-lg ring-1 ring-border")}
      style={{
        top: (from / 60) * HOUR_H + 1,
        height,
        left: `calc(${(lane / lanes) * 100}% + 1px)`,
        width: `calc(${100 / lanes}% - 2px)`,
        transform: moving && drag?.moved ? `translateX(${drag.dx}px)` : undefined,
      }}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1 rounded-l-md", k.bar)} />
      <span className={cn("block truncate text-xs font-semibold leading-tight", k.text)}>{event.title}</span>
      {height > 34 ? <span className="block truncate text-diagram-xs leading-tight text-muted-foreground tabular-nums">{tx.clock(from)} – {tx.clock(to)}</span> : null}
      {height > 52 && event.location ? <span className="block truncate text-diagram-xs leading-tight text-muted-foreground">{event.location}</span> : null}
      <span aria-hidden onPointerDown={(e) => onDown(e, "resize")} className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize" />
    </div>
  );
}

/** The day's शुभ and अशुभ muhurtas as one scrolling row of chips, in clock order: what the rails stand for. */
function MuhurtaRow({ date, windows }: { date: string; windows: PlannerViewProps["windows"] }) {
  const tx = usePlannerText();
  const list = [...(windows.get(date) ?? [])].sort((a, b) => a.startMin - b.startMin);
  if (list.length === 0) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto border-b border-border pb-2.5 [scrollbar-width:none]">
      {list.map((w) => (
        <span key={w.id} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs", w.source === "ashubh" ? "bg-danger/10" : "bg-success/10")}>
          <span className={cn("size-1.5 rounded-full", w.source === "ashubh" ? "bg-danger" : "bg-success")} />
          <span className={cn("font-medium", w.source === "ashubh" ? "text-danger" : "text-success")}>{tx.lang === "en" ? w.nameEn : w.nameNe}</span>
          <span className="tabular-nums text-muted-foreground">{tx.clock(w.startMin)}–{tx.clock(w.endMin)}</span>
        </span>
      ))}
    </div>
  );
}

/** Apple's year: small months, the month name in colour, today filled red, holidays in red, a dot under days with events. */
function YearGrid({ anchor, events, marks, todayAd, onAnchorChange, onViewChange }: PlannerViewProps) {
  const tx = usePlannerText();
  const year = adToBS(new Date(`${anchor}T12:00:00`)).year;
  const today = adToBS(new Date(`${todayAd}T12:00:00`));
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-6 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
        const first = bsToAD(year, month, 1);
        const length = getBSMonthLength(year, month);
        const cells: (number | null)[] = [...Array.from({ length: first.getDay() }, () => null), ...Array.from({ length }, (_, i) => i + 1)];
        const current = today.year === year && today.month === month;
        return (
          <div key={month} className="min-w-0">
            <button
              type="button"
              onClick={() => {
                onAnchorChange(isoOfDate(first));
                onViewChange("calendar");
              }}
              className={cn("mb-1.5 border-none bg-transparent p-0 text-base font-bold", current ? "text-danger" : "text-foreground")}
            >
              {tx.bsMonth(isoOfDate(first))}
            </button>
            <div className="grid grid-cols-7 gap-y-0.5 text-center">
              {cells.map((day, i) => {
                if (day == null) return <span key={`e-${i}`} />;
                const iso = isoOfDate(bsToAD(year, month, day));
                const mark = marks.get(iso);
                const has = eventsOnDate(events, iso).length > 0;
                const isToday = iso === todayAd;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      onAnchorChange(iso);
                      onViewChange("day");
                    }}
                    className="relative flex h-6 items-center justify-center border-none bg-transparent p-0"
                  >
                    <span className={cn("inline-flex size-5 items-center justify-center rounded-full text-diagram-xs tabular-nums", isToday ? "bg-danger font-semibold text-white" : mark?.holiday ? "font-semibold text-danger" : "text-foreground hover:bg-muted")}>
                      {tx.digits(day)}
                    </span>
                    {has && !isToday ? <span className="absolute -bottom-px size-1 rounded-full bg-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
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
  if (rows.length === 0) return <p className="border-t border-border py-10 text-center text-sm text-muted-foreground">{tx.t("calendar.planner_nothing")}</p>;
  return (
    <div className="flex flex-col border-t border-border">
      {rows.map(([date, list]) => {
        const mark = marks.get(date);
        return (
          <section key={date}>
            <button
              type="button"
              onClick={() => {
                onAnchorChange(date);
                onViewChange("day");
              }}
              className="sticky top-0 z-[1] flex w-full items-baseline justify-between border-none bg-muted/70 px-3 py-1.5 text-left backdrop-blur"
            >
              <span className={cn("text-sm font-semibold", mark?.holiday && "text-danger")}>{tx.dayHeading(date)}</span>
              <span className="text-xs text-muted-foreground">{tx.adShort(date)}</span>
            </button>
            <ul className="m-0 list-none p-0">
              {mark?.names.map((name) => (
                <li key={name} className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5">
                  <span className={cn("size-2.5 shrink-0 rounded-full", mark.holiday ? "bg-danger" : "bg-warning")} />
                  <span className={cn("min-w-0 flex-1 truncate text-sm", mark.holiday && "text-danger")}>{name}</span>
                  <span className="text-xs text-muted-foreground">{tx.t("events.all_day_short")}</span>
                </li>
              ))}
              {list.map((e) => {
                const k = KIND[eventKindOf(e)];
                return (
                  <li key={e.id}>
                    <button type="button" onClick={() => onOpenEvent(e)} className="flex w-full items-center gap-3 border-0 border-b border-border/60 bg-transparent px-3 py-2.5 text-left hover:bg-muted/50">
                      <span className={cn("size-2.5 shrink-0 rounded-full", k.bar)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{e.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {tx.t(`events.kind_${eventKindOf(e)}`)}
                          {e.location ? ` · ${e.location}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">{eventTimeText(e, tx.lang, tx.t("events.all_day_short"))}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
