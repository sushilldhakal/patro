import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { CalendarEvent } from "@vedic-patro/api-client";
import { bsToAD, getBSMonthLength, adToBS } from "@vedic-patro/domain/calendar/bs-calendar";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { cn } from "@vedic-patro/design-tokens/cn";
import {
  agendaFrom,
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
import { eventsOnDate } from "@vedic-patro/features/events";
import { Icon } from "@vedic-patro/ui";
import type { PlannerViewProps } from "../contract";
import { eventKindOf, eventTimeText } from "../event-text";
import { iconChevronLeft, iconChevronRight } from "../icons";

const HOUR_H = 52;
const GUTTER = "3rem";
const KIND_STYLE = {
  event: "border-primary bg-primary/15 text-primary",
  task: "border-success bg-success/15 text-success",
  appointment: "border-warning bg-warning/15 text-warning",
} as const;

const isoOfDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Week, day, year and list views of the home calendar: the user's events beside the festivals and holidays. */
export function PlannerView(props: PlannerViewProps) {
  const { view, anchor, onAnchorChange } = props;
  const tx = usePlannerText();
  const { t } = tx;
  const arrow = "inline-flex size-9 items-center justify-center rounded-full hover:bg-muted";

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 min-w-0 truncate text-lg font-semibold">{tx.title(view, anchor)}</h2>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onAnchorChange(props.todayAd)} className="rounded-full bg-muted px-3 py-1.5 text-sm font-medium hover:opacity-80">
            {t("today")}
          </button>
          <button type="button" aria-label={t("calendar.planner_prev")} onClick={() => onAnchorChange(tx.step(view, anchor, -1))} className={arrow}>
            <Icon node={iconChevronLeft} size={20} />
          </button>
          <button type="button" aria-label={t("calendar.planner_next")} onClick={() => onAnchorChange(tx.step(view, anchor, 1))} className={arrow}>
            <Icon node={iconChevronRight} size={20} />
          </button>
        </div>
      </div>
      {view === "day" || view === "multi" ? <DayStrip {...props} /> : null}
      {view === "day" ? <MuhurtaList date={anchor} windows={props.windows} /> : null}
      {view === "day" || view === "multi" || view === "week" ? (
        <p className="m-0 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-success/40" />{t("calendar.window_shubh")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-danger/40" />{t("calendar.window_ashubh")}</span>
        </p>
      ) : null}
      {view === "year" ? <YearGrid {...props} /> : view === "list" ? <AgendaList {...props} /> : <TimeGrid {...props} days={plannerDays(view, anchor)} />}
    </section>
  );
}

type Drag = { id: string; mode: "move" | "resize"; dx: number; dy: number; moved: boolean };

function TimeGrid({ days, events, marks, windows, todayAd, onOpenEvent, onMoveEvent, onCreateAt, onAnchorChange, onViewChange }: PlannerViewProps & { days: string[] }) {
  const tx = usePlannerText();
  const scroller = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const start = useRef<{ x: number; y: number; colWidth: number } | null>(null);
  const columns = useMemo(() => days.map((date) => ({ date, ...layoutDay(events, date) })), [days, events]);

  // Open at the morning, or at now when today is on screen.
  useEffect(() => {
    const now = new Date();
    const toToday = days.includes(todayAd);
    scroller.current?.scrollTo({ top: Math.max(0, ((toToday ? now.getHours() : 7) - 1) * HOUR_H) });
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

  const cols = `${GUTTER} repeat(${days.length}, minmax(0, 1fr))`;
  return (
    <div ref={scroller} className="relative max-h-[68vh] overflow-y-auto rounded-2xl border border-border bg-card">
      {/* Day headings and the all-day strip stay put while the hours scroll. */}
      <div className="sticky top-0 z-20 border-b border-border bg-card">
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <span />
          {columns.map((c) => {
            const mark = marks.get(c.date);
            const today = c.date === todayAd;
            return (
              <button
                key={c.date}
                type="button"
                onClick={() => {
                  onAnchorChange(c.date);
                  onViewChange("day");
                }}
                className="flex flex-col items-center gap-0.5 border-none bg-transparent py-2 hover:bg-muted"
              >
                <span className="text-xs text-muted-foreground">{tx.weekdayShort(c.date)}</span>
                <span className={cn("inline-flex size-9 items-center justify-center rounded-full text-lg font-semibold tabular-nums", today && "bg-secondary text-secondary-foreground", !today && mark?.holiday && "text-danger")}>
                  {tx.bsDay(c.date)}
                </span>
                <span className="text-diagram-xs text-muted-foreground">{tx.adDay(c.date)}</span>
              </button>
            );
          })}
        </div>
        <div className="grid border-t border-border" style={{ gridTemplateColumns: cols }}>
          <span className="py-1 pr-1 text-right text-diagram-xs text-muted-foreground">{tx.t("events.all_day_short")}</span>
          {columns.map((c) => {
            const mark = marks.get(c.date);
            return (
              <div key={c.date} className="flex min-w-0 flex-col gap-0.5 border-l border-border p-0.5">
                {mark?.names.slice(0, 2).map((name) => (
                  <span key={name} className={cn("truncate rounded px-1 text-diagram-xs font-medium", mark.holiday ? "bg-danger/15 text-danger" : "bg-muted text-foreground")}>
                    {name}
                  </span>
                ))}
                {c.allDay.map((e) => (
                  <button key={e.id} type="button" onClick={() => onOpenEvent(e)} className={cn("truncate rounded border-l-4 px-1 text-left text-diagram-xs font-semibold", KIND_STYLE[eventKindOf(e)])}>
                    {e.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: cols }}>
        <div className="relative" style={{ height: HOUR_H * 24 }}>
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="absolute right-1 -translate-y-1/2 text-diagram-xs text-muted-foreground" style={{ top: h * HOUR_H, display: h === 0 ? "none" : undefined }}>
              {tx.hour(h)}
            </span>
          ))}
        </div>
        {columns.map((c, ci) => (
          <div
            key={c.date}
            ref={ci === 0 ? colRef : undefined}
            className="relative border-l border-border"
            style={{ height: HOUR_H * 24 }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const minutes = Math.min(23 * 60 + 45, Math.max(0, snap(((e.clientY - rect.top) / HOUR_H) * 60 - 7)));
              onCreateAt(c.date, `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
            }}
          >
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
              <span key={h} aria-hidden className="pointer-events-none absolute inset-x-0 h-px bg-border" style={{ top: h * HOUR_H }} />
            ))}
            {/* Two thin rails on the left edge: runs of शुभ (green) and of अशुभ (red) time. */}
            {(["shubh", "ashubh"] as const).map((source, lane) =>
              railOf(windows.get(c.date) ?? [], source).map((run) => (
                <span
                  key={`${source}-${run.startMin}`}
                  aria-hidden
                  className={cn("pointer-events-none absolute z-[1] w-1 rounded-full", source === "ashubh" ? "bg-danger/70" : "bg-success/70")}
                  style={{ left: 2 + lane * 6, top: (run.startMin / 60) * HOUR_H, height: ((run.endMin - run.startMin) / 60) * HOUR_H }}
                />
              )),
            )}
            {c.date === todayAd ? <NowLine /> : null}
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
        ))}
      </div>
    </div>
  );
}

function NowLine() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const top = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_H;
  return <span className="pointer-events-none absolute left-0 right-0 z-10 h-0.5 bg-danger" style={{ top }} />;
}

function Block({ block, drag, onDown, onMove, onUp }: { block: DayBlock; drag: Drag | null; onDown: (e: ReactPointerEvent, mode: Drag["mode"]) => void; onMove: (e: ReactPointerEvent) => void; onUp: () => void }) {
  const { event, startMin, endMin, lane, lanes } = block;
  const tx = usePlannerText();
  const dy = drag && drag.moved ? snap((drag.dy / HOUR_H) * 60) : 0;
  const moving = drag?.mode === "move";
  const top = ((startMin + (moving ? dy : 0)) / 60) * HOUR_H;
  const height = Math.max(((endMin - startMin + (drag?.mode === "resize" ? dy : 0)) / 60) * HOUR_H, 20);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => onDown(e, "move")}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className={cn("absolute z-[5] cursor-grab touch-none select-none overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-left shadow-sm", KIND_STYLE[eventKindOf(event)], drag?.moved && "z-30 cursor-grabbing opacity-90 shadow-lg")}
      style={{
        top,
        height,
        left: `calc(${(lane / lanes) * 100}% + 14px)`,
        width: `calc(${100 / lanes}% - 18px)`,
        transform: moving && drag?.moved ? `translateX(${drag.dx}px)` : undefined,
      }}
    >
      <span className="block truncate text-xs font-semibold leading-tight">{event.title}</span>
      <span className="block truncate text-diagram-xs leading-tight opacity-80">{tx.clock(startMin + (moving ? dy : 0))} – {tx.clock(endMin + (drag?.mode === "resize" ? dy : 0))}</span>
      <span
        aria-hidden
        onPointerDown={(e) => onDown(e, "resize")}
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
      />
    </div>
  );
}

function YearGrid({ anchor, events, marks, todayAd, onAnchorChange, onViewChange }: PlannerViewProps) {
  const tx = usePlannerText();
  const year = adToBS(new Date(`${anchor}T12:00:00`)).year;
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {months.map((month) => {
        const first = bsToAD(year, month, 1);
        const length = getBSMonthLength(year, month);
        const cells: (number | null)[] = [...Array.from({ length: first.getDay() }, () => null), ...Array.from({ length }, (_, i) => i + 1)];
        return (
          <div key={month} className="rounded-2xl border border-border bg-card p-3">
            <h3 className="m-0 mb-1 text-sm font-semibold">{tx.bsMonth(isoOfDate(first))}</h3>
            <div className="grid grid-cols-7 text-center text-diagram-xs text-muted-foreground">
              {weekDates("2026-11-01").map((d) => (
                <span key={d}>{tx.weekdayShort(d).slice(0, 1)}</span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (day == null) return <span key={`e-${i}`} />;
                const iso = isoOfDate(bsToAD(year, month, day));
                const mark = marks.get(iso);
                const has = eventsOnDate(events, iso).length > 0;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      onAnchorChange(iso);
                      onViewChange("day");
                    }}
                    className={cn("relative flex h-8 items-center justify-center rounded-full border-none bg-transparent text-xs tabular-nums hover:bg-muted", mark?.holiday && "bg-danger/15 font-semibold text-danger", iso === todayAd && "ring-1 ring-secondary")}
                  >
                    {tx.digits(day)}
                    {has ? <span className="absolute bottom-0.5 size-1 rounded-full bg-primary" /> : null}
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
  if (rows.length === 0) return <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{tx.t("calendar.planner_nothing")}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.map(([date, list]) => {
        const mark = marks.get(date);
        return (
          <li key={date} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
            <button
              type="button"
              onClick={() => {
                onAnchorChange(date);
                onViewChange("day");
              }}
              className="flex w-14 shrink-0 flex-col items-center border-none bg-transparent"
            >
              <span className="text-xs text-muted-foreground">{tx.weekdayShort(date)}</span>
              <span className={cn("text-2xl font-semibold tabular-nums", mark?.holiday && "text-danger")}>{tx.bsDay(date)}</span>
              <span className="text-diagram-xs text-muted-foreground">{tx.bsMonth(date)}</span>
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {mark?.names.map((name) => (
                <span key={name} className={cn("w-fit max-w-full truncate rounded px-1.5 text-xs font-medium", mark.holiday ? "bg-danger/15 text-danger" : "bg-muted")}>
                  {name}
                </span>
              ))}
              {list.map((e) => (
                <button key={e.id} type="button" onClick={() => onOpenEvent(e)} className={cn("flex flex-col items-start rounded-md border-l-4 px-2 py-1 text-left", KIND_STYLE[eventKindOf(e)])}>
                  <span className="max-w-full truncate text-sm font-semibold">{e.title}</span>
                  <span className="text-xs opacity-80">{tx.t(`events.kind_${eventKindOf(e)}`)} · {eventTimeText(e, tx.lang, tx.t("events.all_day_short"))}</span>
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The week as one row of day buttons, like Apple Calendar's: the shown day(s) lit, the rest a tap away. */
function DayStrip({ view, anchor, marks, todayAd, onAnchorChange }: PlannerViewProps) {
  const tx = usePlannerText();
  const shown = plannerDays(view, anchor);
  return (
    <div className="grid grid-cols-7 rounded-2xl bg-muted/60 p-1">
      {weekDates(anchor).map((date) => {
        const index = shown.indexOf(date);
        const holiday = marks.get(date)?.holiday;
        return (
          <button
            key={date}
            type="button"
            onClick={() => onAnchorChange(date)}
            aria-pressed={index >= 0}
            className="flex flex-col items-center gap-0.5 rounded-xl border-none bg-transparent py-1 hover:bg-muted"
          >
            <span className="text-diagram-xs text-muted-foreground">{tx.weekdayShort(date).slice(0, 2)}</span>
            <span
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full text-base font-semibold tabular-nums",
                index === 0 && "bg-secondary text-secondary-foreground",
                index > 0 && "bg-secondary/20",
                index < 0 && holiday && "text-danger",
                index < 0 && date === todayAd && "ring-1 ring-secondary",
              )}
            >
              {tx.bsDay(date)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The day's शुभ and अशुभ muhurtas by name and time: what the rails on the grid stand for. */
function MuhurtaList({ date, windows }: { date: string; windows: PlannerViewProps["windows"] }) {
  const tx = usePlannerText();
  const list = [...(windows.get(date) ?? [])].sort((a, b) => a.startMin - b.startMin);
  if (list.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      {(["shubh", "ashubh"] as const).map((source) => {
        const rows = list.filter((w) => w.source === source);
        if (rows.length === 0) return null;
        return (
          <div key={source} className="flex flex-col gap-1.5">
            <span className={cn("text-xs font-semibold", source === "ashubh" ? "text-danger" : "text-success")}>
              {tx.t(source === "ashubh" ? "calendar.window_ashubh" : "calendar.window_shubh")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {rows.map((w) => (
                <span key={w.id} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs", source === "ashubh" ? "bg-danger/10 text-danger" : "bg-success/10 text-success")}>
                  <span className="font-medium">{tx.lang === "en" ? w.nameEn : w.nameNe}</span>
                  <span className="tabular-nums opacity-80">{tx.clock(w.startMin)}–{tx.clock(w.endMin)}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
