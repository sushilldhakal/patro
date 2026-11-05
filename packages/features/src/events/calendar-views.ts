/**
 * The home calendar's views and the time maths behind the planner ones (week, day, year, list), shared
 * by the website and the app: which view is shown, a day's events laid out in columns, and what moving
 * or resizing an event does to its times. Nothing here draws.
 */
import type { CalendarEvent } from "@vedic-patro/api-client";
import { isoToZoned, shiftDate, zonedToIso } from "@vedic-patro/domain/calendar/event-time";
import { eventOccursOn } from "./use-day-events";

/** Month and Panchanga are the home grids; the rest are the planner views. */
export const HOME_VIEWS = ["calendar", "panchanga", "day", "multi", "week", "year", "list"] as const;
export type HomeView = (typeof HOME_VIEWS)[number];
export const PLANNER_VIEWS = ["day", "multi", "week", "year", "list"] as const;
export type PlannerViewKind = (typeof PLANNER_VIEWS)[number];

export const isPlannerView = (v: HomeView): v is PlannerViewKind => (PLANNER_VIEWS as readonly string[]).includes(v);
export const parseHomeView = (raw: string | null | undefined): HomeView =>
  (HOME_VIEWS as readonly string[]).includes(raw ?? "") ? (raw as HomeView) : "calendar";

/**
 * What a screen offers: seven columns of days only fit a wide screen, so a phone gets Multi Day (two
 * days, like Apple Calendar's) in place of Week. A saved choice that does not fit is swapped for its twin.
 */
export const homeViewsFor = (wide: boolean): HomeView[] => HOME_VIEWS.filter((v) => (wide ? v !== "multi" : v !== "week"));
export const adaptHomeView = (view: HomeView, wide: boolean): HomeView => (view === "week" && !wide ? "multi" : view === "multi" && wide ? "week" : view);

/** A day's grid is minutes 0–1440; this is how far an event may be nudged and what a drag snaps to. */
export const SNAP_MINUTES = 15;
export const MIN_EVENT_MINUTES = 15;
export const snap = (minutes: number, step = SNAP_MINUTES) => Math.round(minutes / step) * step;

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
};
export const daysBetween = (from: string, to: string) => dayNumber(to) - dayNumber(from);
export const weekdayOf = (iso: string) => new Date(dayNumber(iso) * 86_400_000).getUTCDay();

/** The Sunday that starts `iso`'s week (the grids start on Sunday). */
export const weekStart = (iso: string) => shiftDate(iso, -weekdayOf(iso));
export const weekDates = (iso: string) => Array.from({ length: 7 }, (_, i) => shiftDate(weekStart(iso), i));
/** The columns of a time-grid view: one day, two (Multi Day) or the week. */
export const plannerDays = (view: PlannerViewKind, anchor: string): string[] =>
  view === "week" ? weekDates(anchor) : view === "multi" ? [anchor, shiftDate(anchor, 1)] : [anchor];

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** One event on a day's time grid. */
export type DayBlock = {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  /** Side-by-side lane among the events it overlaps, and how many lanes that group has. */
  lane: number;
  lanes: number;
};

/** An event's part of `date` on its own wall clock; clipped to the day when it runs over midnight. */
export function eventSpanOn(e: CalendarEvent, date: string): { startMin: number; endMin: number } {
  const start = isoToZoned(e.starts_at, e.timezone);
  const end = isoToZoned(e.ends_at, e.timezone);
  // A repeat is the same clock time on another day.
  const startMin = minutesOf(start.time);
  const length = Math.max(0, daysBetween(start.date, end.date) * 1440 + minutesOf(end.time) - startMin);
  const from = e.repeat === "never" && start.date < date ? 0 : startMin;
  const to = e.repeat === "never" ? (end.date > date ? 1440 : minutesOf(end.time)) : Math.min(1440, startMin + length);
  return { startMin: from, endMin: Math.max(to, from + MIN_EVENT_MINUTES) };
}

/** The timed events of `date` as blocks with lanes, and the all-day ones apart. */
export function layoutDay(events: CalendarEvent[], date: string): { timed: DayBlock[]; allDay: CalendarEvent[] } {
  const today = events.filter((e) => eventOccursOn(e, date));
  const allDay = today.filter((e) => e.all_day);
  const timed = today
    .filter((e) => !e.all_day)
    .map((event) => ({ event, ...eventSpanOn(event, date), lane: 0, lanes: 1 }))
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  // Groups of events that overlap one another share the width, each in its own lane.
  let group: DayBlock[] = [];
  let groupEnd = -1;
  const flush = () => {
    const laneEnds: number[] = [];
    for (const b of group) {
      let lane = laneEnds.findIndex((end) => end <= b.startMin);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = b.endMin;
      b.lane = lane;
    }
    for (const b of group) b.lanes = Math.max(1, laneEnds.length);
    group = [];
  };
  for (const b of timed) {
    if (group.length > 0 && b.startMin >= groupEnd) flush();
    group.push(b);
    groupEnd = Math.max(groupEnd, b.endMin);
  }
  flush();
  return { timed, allDay };
}

/** The times an event gets when its (first) occurrence is dragged by days and minutes, on its own clock. */
export function movedTimes(e: CalendarEvent, dayDelta: number, minuteDelta: number): { starts_at: string; ends_at: string } {
  const start = isoToZoned(e.starts_at, e.timezone);
  const end = isoToZoned(e.ends_at, e.timezone);
  const shift = (zoned: { date: string; time: string }) => {
    const total = minutesOf(zoned.time) + minuteDelta;
    const extra = Math.floor(total / 1440);
    const t = ((total % 1440) + 1440) % 1440;
    const time = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    return zonedToIso(shiftDate(zoned.date, dayDelta + extra), time, e.timezone);
  };
  return { starts_at: shift(start), ends_at: shift(end) };
}

/** The end an event gets when its bottom edge is dragged by `minuteDelta` (never shorter than 15 minutes). */
export function resizedTimes(e: CalendarEvent, minuteDelta: number): { starts_at: string; ends_at: string } {
  const length = Math.max(MIN_EVENT_MINUTES, Math.round((Date.parse(e.ends_at) - Date.parse(e.starts_at)) / 60000) + minuteDelta);
  const end = Date.parse(e.starts_at) + length * 60000;
  return { starts_at: e.starts_at, ends_at: new Date(end).toISOString() };
}

/** `days` days from `from`, each with its events: the list view. Empty days are left out. */
export function agendaFrom(events: CalendarEvent[], from: string, days: number): { date: string; events: CalendarEvent[] }[] {
  const out: { date: string; events: CalendarEvent[] }[] = [];
  for (let i = 0; i < days; i++) {
    const date = shiftDate(from, i);
    const today = events.filter((e) => eventOccursOn(e, date)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    if (today.length > 0) out.push({ date, events: today });
  }
  return out;
}

/** The input to the event form for editing: the event's fields on its own wall clock. */
export function eventToDraft(e: CalendarEvent) {
  const start = isoToZoned(e.starts_at, e.timezone);
  const end = isoToZoned(e.ends_at, e.timezone);
  const kind = e.kind === "task" || e.kind === "reminder" ? "task" : e.kind === "appointment" ? "appointment" : "event";
  return {
    kind: kind as "event" | "task" | "appointment",
    title: e.title,
    place: e.location ?? "",
    notes: e.notes ?? "",
    timeOn: !e.all_day,
    endOn: e.ends_at !== e.starts_at && (kind !== "task" || end.date !== start.date || end.time !== start.time),
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    repeat: e.repeat,
    priority: e.priority ?? 0,
    alert1: e.alerts[0] ?? null,
    alert2: e.alerts[1] ?? null,
    invitees: e.invitees,
  };
}
export type EventDraft = ReturnType<typeof eventToDraft>;
export { shiftDate as shiftDateIso } from "@vedic-patro/domain/calendar/event-time";
