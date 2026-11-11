import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type TouchEvent as ReactTouchEvent } from "react";
import type { CalendarEvent } from "@vedic-patro/api-client";
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
  dashaNotes,
  strongestReason,
  resizedTimes,
  slotCovered,
  snap,
  usePlannerText,
  PlannerPrimaryDateContext,
  weekdayOf,
  weekDates,
  type BestSlot,
  type DayBlock,
  type PersonalColumn,
  type SlotMark,
  type SlotReason,
} from "@vedic-patro/features/events";
import { Icon } from "@vedic-patro/ui";
import type { PersonalDayChipProps, PlannerViewProps } from "../contract";
import { eventKindOf, eventTimeText } from "../event-text";
import { iconBriefcase, iconChevronLeft, iconChevronRight, iconPlus, iconStar, iconSun } from "../icons";

/**
 * The home calendar's planner views drawn the way Apple Calendar draws them: a week strip with the shown
 * day filled, hairline hours with "7 am" labels in a gutter, tinted event blocks with a colour bar, a red
 * now-line, a year of small months and a list grouped by day. The same layout as the app's.
 */

/** A public holiday's column, tinted as its month-grid cell is. */
const HOLIDAY_TINT = "bg-surface-tint-danger";
const HOUR_H = 56;
const GUTTER = 56;
/** Event colours: a soft fill, the bar and the title. */
const KIND = {
  event: { fill: "bg-primary/15", bar: "bg-primary", text: "text-primary" },
  task: { fill: "bg-success/15", bar: "bg-success", text: "text-success" },
  appointment: { fill: "bg-warning/20", bar: "bg-warning", text: "text-warning" },
} as const;

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function PlannerView(props: PlannerViewProps) {
  return (
    <PlannerPrimaryDateContext.Provider value={props.primaryDate ?? "bs"}>
      <PlannerViewBody {...props} />
    </PlannerPrimaryDateContext.Provider>
  );
}

function PlannerViewBody(props: PlannerViewProps) {
  const { view, anchor, onAnchorChange, todayAd } = props;
  const tx = usePlannerText();
  const timeGrid = view === "day" || view === "multi" || view === "week";
  const swipe = useSwipeStep((dir) => onAnchorChange(tx.step(view, anchor, dir)));

  return (
    // Edge to edge on a phone, like the month grid: the toolbar, year and list keep the page's inset.
    <section className="flex flex-col">
      {/* Toolbar: the month (or year) on the left, ‹ Today › in one capsule on the right. */}
      <div className="flex items-center justify-between gap-3 pb-3 max-md:px-3">
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

      {/* A left / right swipe steps forward / back a day, two days or a week, as the buttons do. */}
      <div {...swipe}>
        {view === "day" || view === "multi" ? <DayStrip {...props} /> : null}
        {timeGrid ? <TimeGrid {...props} days={plannerDays(view, anchor)} /> : null}
        {view === "year" ? (
          <div className="max-md:px-3">
            <YearGrid {...props} />
          </div>
        ) : null}
        {view === "list" ? (
          <div className="max-md:px-3">
            <AgendaList {...props} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** A mostly sideways finger swipe of 50px or more: left steps forward, right steps back. A drag on an event block is not one. */
function useSwipeStep(onStep: (dir: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: ReactTouchEvent) => {
      const t = e.touches[0];
      const target = e.target as HTMLElement;
      // Event blocks drag with the pointer (touch-none); a range input scrubs.
      start.current = e.touches.length === 1 && t && !target.closest(".touch-none, input, textarea") ? { x: t.clientX, y: t.clientY } : null;
    },
    onTouchEnd: (e: ReactTouchEvent) => {
      const from = start.current;
      start.current = null;
      const t = e.changedTouches[0];
      if (!from || !t) return;
      const dx = t.clientX - from.x;
      const dy = t.clientY - from.y;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      onStep(dx < 0 ? 1 : -1);
    },
    onTouchCancel: () => {
      start.current = null;
    },
  };
}

/** Apple's week strip: weekday letters over the dates; the shown day filled, the next one in a capsule (Multi Day). */
function DayStrip({ view, anchor, marks, todayAd, onAnchorChange }: PlannerViewProps) {
  const tx = usePlannerText();
  const week = weekDates(anchor);
  const shown = plannerDays(view, anchor);
  const first = week.indexOf(shown[0]!);
  const span = shown.filter((d) => week.includes(d)).length;
  return (
    // Each date is its own cell, ruled off from the next like the grid's columns below.
    <div className="border-y border-border">
      <div className="relative grid grid-cols-7">
        {/* The capsule behind the shown days. */}
        {span > 1 ? (
          // Slides to the new days, as Apple Calendar's capsule does.
          <span aria-hidden className="absolute bottom-2 h-10 rounded-full bg-muted transition-[left,width] duration-300 ease-out motion-reduce:transition-none" style={{ left: `calc(${(first / 7) * 100}% + 4px)`, width: `calc(${(span / 7) * 100}% - 8px)` }} />
        ) : null}
        {week.map((date, i) => {
          const isShown = shown.includes(date);
          const isFirst = date === shown[0];
          const isToday = date === todayAd;
          const holiday = marks.get(date)?.holiday;
          return (
            <button key={date} type="button" onClick={() => onAnchorChange(date)} aria-pressed={isShown} className={cn("relative flex flex-col items-center gap-1 border-0 bg-transparent py-2", i > 0 && "border-l border-solid border-border")}>
              <span className={cn("text-sm font-semibold", i === 0 || i === 6 ? "text-danger" : "text-foreground")}>{tx.weekdayShort(date)}</span>
              <span
                className={cn(
                  "relative inline-flex size-10 items-center justify-center rounded-full text-lg tabular-nums transition-colors",
                  isFirst ? "font-semibold text-background" : isToday ? "font-semibold text-danger" : holiday ? "text-danger" : "text-foreground",
                  !isShown && "hover:bg-muted",
                )}
              >
                {/* The filled circle grows in on the new day (Apple Calendar), keyed so each change replays it. */}
                {isFirst ? <span key={date} aria-hidden className={cn("absolute inset-0 rounded-full animate-in zoom-in-50 fade-in duration-300 motion-reduce:animate-none", isToday ? "bg-danger" : "bg-foreground")} /> : null}
                <span className="relative">{tx.day(date)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Drag = { id: string; mode: "move" | "resize"; dx: number; dy: number; moved: boolean };

function TimeGrid({ view, days, events, marks, slots, yogas, personal, todayAd, onOpenEvent, onOpenMark, onOpenPersonal, onMoveEvent, onCreateAt, onAnchorChange, onViewChange }: PlannerViewProps & { days: string[] }) {
  const tx = usePlannerText();
  const colRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const start = useRef<{ x: number; y: number; colWidth: number } | null>(null);
  const columns = useMemo(() => days.map((date) => ({ date, ...layoutDay(events, date) })), [days, events]);
  const now = useNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showsToday = days.includes(todayAd);
  const [openPersonal, setOpenPersonal] = useState<string | null>(null);
  const hasAllDay = columns.some((c) => c.allDay.length > 0 || (marks.get(c.date)?.names.length ?? 0) > 0 || (yogas.get(c.date)?.length ?? 0) > 0 || personal.has(c.date));

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
              <div key={date} className={cn("relative flex min-w-0 flex-col border-l border-border/60", holiday && HOLIDAY_TINT)}>
                <button
                  type="button"
                  onClick={() => {
                    onAnchorChange(date);
                    onViewChange("day");
                  }}
                  className="flex flex-col items-center border-0 bg-transparent py-2 hover:bg-muted/60"
                >
                  <span className="text-xs text-muted-foreground">{tx.weekdayShort(date)}</span>
                  <span
                    className={cn(
                      "mt-0.5 inline-flex size-10 items-center justify-center rounded-full text-xl font-semibold tabular-nums",
                      isToday ? "bg-primary text-primary-foreground" : weekdayOf(date) === 6 || holiday ? "text-danger" : "text-foreground",
                    )}
                  >
                    {tx.day(date)}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* All-day row: holidays and festivals, then the user's all-day events. */}
      {hasAllDay ? (
        <div className="grid border-b border-border" style={{ gridTemplateColumns: cols }}>
          <span className="pr-2 pt-2 text-right text-sm text-muted-foreground">{tx.t("events.all_day_short")}</span>
          {columns.map((c) => {
            const mark = marks.get(c.date);
            return (
              <div key={c.date} className={cn("relative flex min-w-0 flex-col gap-1 border-l border-border/60 p-1", mark?.holiday && HOLIDAY_TINT)}>
                <PersonalChip date={c.date} column={personal.get(c.date)} week={view === "week"} open={openPersonal === c.date} onToggle={() => setOpenPersonal(openPersonal === c.date ? null : c.date)} onOpen={onOpenPersonal} tx={tx} />
                {(yogas.get(c.date)?.length ?? 0) > 0 ? (
                  <span className="flex min-w-0 items-center gap-1.5 rounded-lg bg-success/10 px-2 py-1 text-sm font-medium text-success">
                    <span className="size-1.5 shrink-0 rounded-full bg-success" />
                    <span className="truncate">{tx.t("calendar.best_sarvartha")}</span>
                  </span>
                ) : null}
                {/* The day's festivals on one line, "तिहार, लक्ष्मी पूजा, काग तिहार, …": all of them in Day, up to
                    three lines in the narrower columns (a click there opens that day). */}
                {mark && mark.names.length > 0 ? (
                  <span
                    role={view === "day" ? undefined : "button"}
                    tabIndex={view === "day" ? undefined : 0}
                    onClick={
                      view === "day"
                        ? undefined
                        : () => {
                            onAnchorChange(c.date);
                            onViewChange("day");
                          }
                    }
                    className={cn(
                      "flex min-w-0 items-start gap-1.5 rounded-lg px-2 py-1 text-sm font-medium leading-snug",
                      mark.holiday ? "bg-danger/10 text-danger" : "bg-warning/15 text-foreground",
                      view !== "day" && "cursor-pointer",
                    )}
                  >
                    <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", mark.holiday ? "bg-danger" : "bg-warning")} />
                    <span className={cn("min-w-0", view !== "day" && "line-clamp-3")}>
                      {view === "day" && onOpenMark
                        ? mark.names.map((name, i) => (
                            <span key={name}>
                              {i > 0 ? ", " : ""}
                              {/* Each name opens its dialog, as in the app. */}
                              <button type="button" onClick={() => onOpenMark(c.date, name, mark.holiday)} className="inline cursor-pointer border-none bg-transparent p-0 text-left font-medium text-inherit hover:underline">
                                {name}
                              </button>
                            </span>
                          ))
                        : mark.names.join(", ")}
                    </span>
                  </span>
                ) : null}
                {c.allDay.map((e) => {
                  const k = KIND[eventKindOf(e)];
                  return (
                    <button key={e.id} type="button" onClick={() => onOpenEvent(e)} className={cn("truncate rounded-lg border-none px-2 py-1 text-left text-sm font-semibold", k.fill, k.text)}>
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
      {/* The whole day, in the page's own scroll (as in the app): a scroll box inside the page caught the
          wheel and the finger, so the page below could not be reached. */}
      <div className="relative">
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <div className="relative" style={{ height: HOUR_H * 24 }}>
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => {
              const near = showsToday && Math.abs(h * 60 - nowMin) < 20;
              if (near) return null;
              const { num, suffix } = tx.hourParts(h);
              return (
                <span key={h} className="absolute right-2 -translate-y-1/2 whitespace-nowrap text-right text-xs tabular-nums leading-none text-muted-foreground" style={{ top: h * HOUR_H }}>
                  {num ? <span>{num} </span> : null}
                  <span>{suffix}</span>
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
              className={cn("relative cursor-cell border-l border-border/60", marks.get(c.date)?.holiday && HOLIDAY_TINT)}
              style={{ height: HOUR_H * 24 }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const minutes = Math.min(23 * 60 + 45, Math.max(0, snap(((e.clientY - rect.top) / HOUR_H) * 60 - 7)));
                onCreateAt(c.date, hhmm(minutes));
              }}
            >
              {Array.from({ length: 47 }, (_, i) => i + 1).map((step) => (
                <span key={step} aria-hidden className={cn("pointer-events-none absolute inset-x-0 h-px", step % 2 === 0 ? "bg-border/60" : "bg-border/30")} style={{ top: (step / 2) * HOUR_H }} />
              ))}
              <BestPlaceholders date={c.date} slots={slots.get(c.date) ?? []} column={personal.get(c.date) ?? null} events={events} hourH={HOUR_H} week={view === "week"} tx={tx} onCreateAt={onCreateAt} />
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

type PlannerText = ReturnType<typeof usePlannerText>;

function rangeClock(tx: PlannerText, start: number, end: number): string {
  const endText = end >= 1440 ? tx.digits("24:00") : tx.clock(end);
  return `${tx.clock(start)}–${endText}`;
}

const TONE_KEY = {
  best: "calendar.personal_tone_best",
  good: "calendar.personal_tone_good",
  neutral: "calendar.personal_tone_neutral",
  bad: "calendar.personal_tone_bad",
  worst: "calendar.personal_tone_worst",
} as const;

function toneChip(tone: PersonalColumn["tone"]): string {
  if (tone === "best" || tone === "good") return "bg-success/10 text-success";
  if (tone === "bad") return "bg-warning/15 text-warning";
  if (tone === "worst") return "bg-danger/10 text-danger";
  return "bg-muted text-muted-foreground";
}

function reasonPhrase(reason: SlotReason, tx: PlannerText): string {
  const name = tx.lang === "en" ? reason.nameEn : reason.nameNe;
  const lord = tx.lang === "en" ? reason.lordEn : reason.lordNe;
  const body =
    reason.code === "ashtama" ? tx.t("calendar.personal_ashtama")
    : reason.code === "tara" ? tx.t("calendar.personal_tara", { name: name ?? "" })
    : reason.code === "asta" ? tx.t("calendar.personal_asta", { lord: lord ?? "" })
    : reason.code === "vakri" ? tx.t("calendar.personal_vakri", { lord: lord ?? "" })
    : reason.code === "chandra" ? tx.t("calendar.personal_chandra")
    : reason.code === "weak" ? tx.t("calendar.personal_chandra_weak")
    : reason.code === "janma" ? tx.t("calendar.personal_janma")
    : tx.t("calendar.personal_remedy");
  if (reason.fromMin == null) return body;
  return tx.t("calendar.personal_from", { time: tx.digits(hhmm(reason.fromMin)), reason: body });
}

function reasonText(mark: SlotMark, tx: PlannerText): string {
  if (mark.kind === "plain") return "";
  return mark.reasons.map((reason) => reasonPhrase(reason, tx)).join(" · ");
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
    const icon = <Icon node={spiritual && !amber ? iconSun : iconBriefcase} size={16} />;
    const star = mark.kind === "best" ? <Icon node={iconStar} size={16} /> : null;
    const endMin = slot.endMin;
    return (
      <button
        key={slot.id}
        type="button"
        title={copy.title}
        aria-label={copy.title}
        onClick={(e) => {
          e.stopPropagation();
          onCreateAt(date, hhmm(slot.startMin), {
            end: endMin >= 1440 ? "00:00" : hhmm(endMin),
            endDate: endMin >= 1440 ? shiftDate(date, 1) : date,
            title: copy.suggested,
          });
        }}
        className={cn(
          "group absolute z-0 flex min-w-0 cursor-pointer flex-col justify-center overflow-hidden rounded-lg py-0.5 pl-2 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          amber ? "bg-warning/8 text-warning hover:bg-warning/15 focus-visible:bg-warning/15" : spiritual ? "bg-slot-spiritual/8 text-slot-spiritual-foreground hover:bg-slot-spiritual/15 focus-visible:bg-slot-spiritual/15" : "bg-success/8 text-success hover:bg-success/15 focus-visible:bg-success/15",
        )}
        style={{
          left: `calc(${(lane / lanes) * 100}% + 1px)`,
          width: `calc(${100 / lanes}% - 2px)`,
          top: (slot.startMin / 60) * hourH,
          height: box,
        }}
      >
        <span aria-hidden className={cn("absolute inset-y-1 left-0 w-[3px] rounded-full", amber ? "bg-warning" : spiritual ? "bg-slot-spiritual" : "bg-success")} />
        <span className="pointer-events-none absolute right-1 top-0.5 hidden group-hover:block group-focus-visible:block">
          <Icon node={iconPlus} size={16} />
        </span>
        {week ? (
          <>
            <span className="flex min-w-0 items-center gap-1 text-sm font-semibold leading-tight">
              {star}
              {icon}
              <span className="truncate">{copy.short}</span>
            </span>
            {box >= 52 ? <span className="truncate text-sm tabular-nums leading-tight text-muted-foreground">{copy.clock}</span> : null}
          </>
        ) : box < 52 ? (
          <span className="flex min-w-0 items-center gap-1 text-sm font-semibold leading-tight">
            {star}
            {icon}
            <span className="truncate">{copy.intent} · {copy.clock}</span>
          </span>
        ) : (
          <>
            <span className="truncate text-sm tabular-nums leading-tight text-muted-foreground">{copy.clock}</span>
            <span className="flex min-w-0 items-center gap-1 text-sm font-semibold leading-tight">
              {star}
              {icon}
              <span className="truncate">{copy.intent}</span>
            </span>
            {box > 78 ? <span className="truncate text-sm leading-tight text-muted-foreground">{copy.reason || copy.names}</span> : null}
          </>
        )}
      </button>
    );
  });
}

/** "तपाईंको दिन · शुभ · …" on its own (the home day card), the planner's chip at full length; the reading unfolds under it. */
export function PersonalDayChip({ date, column, onOpen }: PersonalDayChipProps) {
  const tx = usePlannerText();
  const [open, setOpen] = useState(false);
  return <PersonalChip date={date} column={column} week={false} open={open} onToggle={() => setOpen((v) => !v)} onOpen={onOpen} tx={tx} />;
}

function PersonalChip({ date, column, week, open, onToggle, onOpen, tx }: { date: string; column: PersonalColumn | undefined; week: boolean; open: boolean; onToggle: () => void; onOpen?: (date: string, column: PersonalColumn) => void; tx: PlannerText }) {
  if (!column) return null;
  const tone = tx.t(TONE_KEY[column.tone ?? "neutral"]);
  const reason = strongestReason(column);
  const detail = reason ? reasonPhrase(reason, tx) : "";
  const label = week ? tone : [tx.t("calendar.personal_day"), tone, detail].filter(Boolean).join(" · ");
  const sections = [
    ["calendar.personal_do", tx.lang === "en" ? column.doEn : column.doNe],
    ["calendar.personal_dont", tx.lang === "en" ? column.dontEn : column.dontNe],
    ["calendar.personal_careful", tx.lang === "en" ? column.carefulEn : column.carefulNe],
  ] as const;
  return (
    <div className="relative">
      {/* With a dialog to open (the app's reading sheet) a click opens it; without one the reading unfolds here. */}
      <button type="button" aria-expanded={onOpen ? undefined : open} onClick={(e) => { e.stopPropagation(); if (onOpen) onOpen(date, column); else onToggle(); }} className={cn("flex w-full min-w-0 items-center gap-1.5 rounded-lg border-0 px-2 py-1 text-left text-sm font-medium", toneChip(column.tone))}>
        <span className="size-1.5 shrink-0 rounded-full bg-current" />
        <span className="truncate">{label}</span>
      </button>
      {open && !onOpen ? (
        <div role="dialog" aria-label={`${label} ${date}`} className="absolute left-0 z-30 mt-1 w-56 rounded-lg border border-border bg-card p-2 text-xs text-foreground shadow-md">
          <p className="m-0 font-semibold">{column.profileName}</p>
          {dashaNotes(column).map((note) => (
            <p key={`${note.code}:${note.lordEn}`} className="m-0 mt-1 text-muted-foreground">{reasonPhrase(note, tx)}</p>
          ))}
          {sections.map(([key, lines]) => lines.length === 0 ? null : (
            <div key={key} className="mt-1.5">
              <p className="m-0 text-muted-foreground">{tx.t(key)}</p>
              {lines.map((line) => <p key={line} className="m-0">{line}</p>)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Apple's year: small months, the month name in colour, today filled red, holidays in red, a dot under days with events. */
function YearGrid({ anchor, events, marks, todayAd, onAnchorChange, onViewChange }: PlannerViewProps) {
  const tx = usePlannerText();
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-6 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-4">
      {tx.yearMonths(anchor).map((m) => {
        const current = tx.sameMonth(m.first, todayAd);
        return (
          <div key={m.key} className="min-w-0">
            <button
              type="button"
              onClick={() => {
                onAnchorChange(m.first);
                onViewChange("calendar");
              }}
              className={cn("mb-1.5 border-none bg-transparent p-0 text-base font-bold", current ? "text-danger" : "text-foreground")}
            >
              {m.label}
            </button>
            <div className="grid grid-cols-7 gap-y-0.5 text-center">
              {Array.from({ length: m.lead }, (_, i) => <span key={`e-${i}`} />)}
              {m.days.map(({ iso, n }) => {
                const mark = marks.get(iso);
                const has = eventsOnDate(events, iso).length > 0;
                const isToday = iso === todayAd;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      onAnchorChange(iso);
                      onViewChange("calendar");
                    }}
                    className="relative flex h-6 items-center justify-center border-none bg-transparent p-0"
                  >
                    <span className={cn("inline-flex size-5 items-center justify-center rounded-full text-diagram-xs tabular-nums", isToday ? "bg-danger font-semibold text-white" : mark?.holiday ? "font-semibold text-danger" : "text-foreground hover:bg-muted")}>
                      {tx.digits(n)}
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
