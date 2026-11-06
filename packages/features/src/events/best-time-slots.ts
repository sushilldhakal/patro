/**
 * Best-time placeholders for the day, multi-day and week grids.
 *
 * A material slot is a Tier 2 window for trade and travel, with every Tier 1
 * window cut out and a two-minute margin at each edge it touches. A spiritual
 * slot is a Tier 2 window for practice, left whole. Tier 3 never trims either.
 * Nothing here draws, and nothing here is React.
 */
import type { CalendarEvent } from "@vedic-patro/api-client";
import { isoToZoned, shiftDate } from "@vedic-patro/domain/calendar/event-time";
import type { DayTimePick } from "./day-time-picks";
import { eventOccursOn } from "./use-day-events";

export type SlotIntent = "material" | "spiritual";

export type SlotSource = { key: string; nameNe: string; nameEn: string };

/** One window on a panchanga day's clock. Minutes may pass 1440 after midnight. */
export type SlotWindow = SlotSource & { startMin: number; endMin: number };

export type BestSlot = {
  id: string;
  intent: SlotIntent;
  startMin: number;
  endMin: number;
  sources: SlotSource[];
};

/** One placeholder card, in a lane shared with the cards it overlaps. Never split. */
export type PlacedSlot = {
  slot: BestSlot;
  lane: number;
  lanes: number;
};

/** What tapping a placeholder tells the new-event form, beyond the start. */
export type PlannerSlotExtra = { end?: string; endDate?: string; title?: string };

export type PlannerSlot = { date: string; time: string } & PlannerSlotExtra;

const MIN_SLOT = 10;
/** A piece left on a calendar date shorter than this is a sliver, not a card. */
const MIN_CLIPPED = 15;
/** A Tier 2 window longer than this is a day-long yoga, not a timed slot. */
const MAX_SLOT = 180;
const BUFFER = 2;
const OPEN_TASK_MINUTES = 30;

/** Hard blockers. A material window loses whatever of itself they cover. */
const TIER1 = new Set(["rahu_kalam", "yamaganda", "dur_muhurtam", "varjyam"]);

const MATERIAL = ["abhijit", "vijaya_muhurta", "godhuli_muhurta", "amrit_kalam"] as const;
const SPIRITUAL = ["brahma_muhurta", "pratah_sandhya", "sayahna_sandhya", "amrit_kalam", "nishita_muhurta"] as const;

type Span = { start: number; end: number };

const spans = (list: Span[]): Span[] => list.filter((s) => s.end > s.start);

function subtract(span: Span, cuts: Span[]): Span[] {
  let parts: Span[] = [span];
  for (const cut of cuts) {
    const next: Span[] = [];
    for (const p of parts) {
      if (cut.end <= p.start || cut.start >= p.end) {
        next.push(p);
        continue;
      }
      if (cut.start > p.start) next.push({ start: p.start, end: cut.start });
      if (cut.end < p.end) next.push({ start: cut.end, end: p.end });
    }
    parts = next;
  }
  return spans(parts);
}

const sourceOf = (w: SlotWindow): SlotSource => ({ key: w.key, nameNe: w.nameNe, nameEn: w.nameEn });

const slotLength = (w: { startMin: number; endMin: number }) => w.endMin - w.startMin;

/** Pull a clean part two minutes off each Tier 1 edge it touches. */
function buffered(part: Span, blockers: Span[]): Span | null {
  let start = part.start;
  let end = part.end;
  if (blockers.some((b) => b.end === start)) start += BUFFER;
  if (blockers.some((b) => b.start === end)) end -= BUFFER;
  if (end - start < MIN_SLOT) return null;
  return { start, end };
}

function merge(intent: SlotIntent, pieces: { start: number; end: number; source: SlotSource }[]): BestSlot[] {
  const sorted = [...pieces].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: BestSlot[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last && p.start <= last.endMin) {
      last.endMin = Math.max(last.endMin, p.end);
      if (!last.sources.some((s) => s.key === p.source.key)) last.sources.push(p.source);
      last.id = `${intent}:${last.startMin}`;
    } else {
      out.push({ id: `${intent}:${p.start}`, intent, startMin: p.start, endMin: p.end, sources: [p.source] });
    }
  }
  return out;
}

/** The placeholders of one panchanga day. Wednesday sends no अभिजित् window. */
export function bestTimeSlots(windows: SlotWindow[]): BestSlot[] {
  const usable = windows.filter((w) => w.endMin > w.startMin);
  const blockers = usable.filter((w) => TIER1.has(w.key)).map((w) => ({ start: w.startMin, end: w.endMin }));
  const material: { start: number; end: number; source: SlotSource }[] = [];
  for (const w of usable) {
    if (!(MATERIAL as readonly string[]).includes(w.key)) continue;
    if (slotLength(w) > MAX_SLOT) continue;
    for (const part of subtract({ start: w.startMin, end: w.endMin }, blockers)) {
      const kept = buffered(part, blockers);
      if (kept) material.push({ ...kept, source: sourceOf(w) });
    }
  }
  const spiritual = usable
    .filter((w) => (SPIRITUAL as readonly string[]).includes(w.key) && slotLength(w) >= MIN_SLOT && slotLength(w) <= MAX_SLOT)
    .map((w) => ({ start: w.startMin, end: w.endMin, source: sourceOf(w) }));
  return [...merge("material", material), ...merge("spiritual", spiritual)].sort(
    (a, b) => a.startMin - b.startMin || a.intent.localeCompare(b.intent),
  );
}

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
};

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Picks onto the panchanga day's own clock, so a time after midnight is past 1440. */
export function slotWindowsFromPicks(picks: DayTimePick[], anchor: string): SlotWindow[] {
  return picks.map((pick) => {
    const startMin = (dayNumber(pick.startDate) - dayNumber(anchor)) * 1440 + minutesOf(pick.startTime);
    let endMin = (dayNumber(pick.endDate) - dayNumber(anchor)) * 1440 + minutesOf(pick.endTime);
    if (endMin <= startMin) endMin += 1440;
    return { key: pick.key, nameNe: pick.nameNe, nameEn: pick.nameEn, startMin, endMin };
  });
}

/**
 * The part of a slot, measured from `anchor`'s midnight, that falls on `date`.
 * A piece under 15 minutes is dropped; the longer piece stays on the date that holds most of the slot.
 */
export function clipBestSlot(slot: BestSlot, anchor: string, date: string): BestSlot | null {
  const offset = (dayNumber(date) - dayNumber(anchor)) * 1440;
  const startMin = Math.max(0, slot.startMin - offset);
  const endMin = Math.min(1440, slot.endMin - offset);
  if (endMin - startMin < MIN_CLIPPED) return null;
  return { ...slot, id: `${slot.id}@${date}:${startMin}`, startMin, endMin, sources: slot.sources.map((s) => ({ ...s })) };
}

/** सर्वार्थ सिद्धि is a day-long yoga. It is a chip on its panchanga date, never a timed slot. */
export function dayYogas(windows: SlotWindow[]): SlotSource[] {
  const out: SlotSource[] = [];
  for (const w of windows) {
    if (w.key !== "sarvartha_siddhi" || w.endMin <= w.startMin) continue;
    if (out.some((s) => s.key === w.key)) continue;
    out.push(sourceOf(w));
  }
  return out;
}

/** Overlapping cards share the column in lanes. Each slot is one card, for its whole span. */
export function placeBestSlots(slots: BestSlot[]): PlacedSlot[] {
  const placed: PlacedSlot[] = slots
    .map((slot) => ({ slot, lane: 0, lanes: 1 }))
    .sort((a, b) => a.slot.startMin - b.slot.startMin || b.slot.endMin - a.slot.endMin);
  let group: PlacedSlot[] = [];
  let groupEnd = -1;
  const flush = () => {
    const laneEnds: number[] = [];
    for (const b of group) {
      let lane = laneEnds.findIndex((end) => end <= b.slot.startMin);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = b.slot.endMin;
      b.lane = lane;
    }
    for (const b of group) b.lanes = Math.max(1, laneEnds.length);
    group = [];
  };
  for (const b of placed) {
    if (group.length > 0 && b.slot.startMin >= groupEnd) flush();
    group.push(b);
    groupEnd = Math.max(groupEnd, b.slot.endMin);
  }
  flush();
  return placed;
}

/**
 * A timed event, task or appointment hides a placeholder it overlaps.
 * An all-day item and a reminder do not. A task with no end of its own counts as 30 minutes.
 */
export function slotCovered(slot: { startMin: number; endMin: number }, events: CalendarEvent[], date: string): boolean {
  return events.some((event) => coveringSpans(event, date).some((span) => span.start < slot.endMin && slot.startMin < span.end));
}

function coveringSpans(event: CalendarEvent, date: string): Span[] {
  if (event.all_day || event.kind === "reminder") return [];
  const kind = event.kind ?? "event";
  if (kind !== "event" && kind !== "task" && kind !== "appointment") return [];
  const start = isoToZoned(event.starts_at, event.timezone);
  const end = isoToZoned(event.ends_at, event.timezone);
  const startMin = minutesOf(start.time);
  const openTask = kind === "task" && start.date === end.date && start.time === end.time;
  if (openTask) {
    const spans: Span[] = [];
    if (eventOccursOn(event, date)) spans.push({ start: startMin, end: Math.min(1440, startMin + OPEN_TASK_MINUTES) });
    const prev = shiftDate(date, -1);
    if (startMin + OPEN_TASK_MINUTES > 1440 && eventOccursOn(event, prev)) {
      spans.push({ start: 0, end: startMin + OPEN_TASK_MINUTES - 1440 });
    }
    return spans.filter((s) => s.end > s.start);
  }
  if (!eventOccursOn(event, date)) return [];
  const length = Math.max(0, (dayNumber(end.date) - dayNumber(start.date)) * 1440 + minutesOf(end.time) - startMin);
  const from = event.repeat === "never" && start.date < date ? 0 : startMin;
  const to = event.repeat === "never" ? (end.date > date ? 1440 : minutesOf(end.time)) : Math.min(1440, startMin + length);
  return to > from ? [{ start: from, end: to }] : [];
}
