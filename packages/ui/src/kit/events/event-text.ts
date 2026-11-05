import type { CalendarEvent } from "@vedic-patro/api-client";

/** The three kinds the app shows; the older "reminder" reads as a task. */
export function eventKindOf(e: Pick<CalendarEvent, "kind">): "event" | "task" | "appointment" {
  return e.kind === "task" || e.kind === "reminder" ? "task" : e.kind === "appointment" ? "appointment" : "event";
}

/** "3:30 PM – 4:30 PM", "3:30 PM" for a moment, or `allDay`, on the event's own wall clock. */
export function eventTimeText(e: CalendarEvent, lang: string, allDay: string): string {
  if (e.all_day) return allDay;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString(lang === "en" ? "en-US" : "ne-NP", { hour: "numeric", minute: "2-digit", timeZone: e.timezone });
  return e.ends_at && e.ends_at !== e.starts_at ? `${fmt(e.starts_at)} – ${fmt(e.ends_at)}` : fmt(e.starts_at);
}
