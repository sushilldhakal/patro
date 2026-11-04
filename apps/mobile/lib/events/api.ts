import { authFetch } from "@/lib/auth/client";

/** How often an event comes back, as Apple Calendar offers it. */
export const EVENT_REPEATS = ["never", "daily", "weekly", "fortnightly", "monthly", "yearly"] as const;
export type EventRepeat = (typeof EVENT_REPEATS)[number];

/** Alert choices, minutes before the start (Apple Calendar's list); null = none. */
export const EVENT_ALERTS = [null, 0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080] as const;

/** One event or reminder — the same record either way (`/events`). */
export interface CalendarEvent {
  id: string;
  title: string;
  location: string | null;
  notes: string | null;
  all_day: boolean;
  starts_at: string;
  ends_at: string;
  timezone: string;
  repeat: EventRepeat;
  alerts: number[];
  /** The साइत it was picked from: `sait` + the category id. */
  source_kind: string | null;
  source_key: string | null;
  invitees: string[];
  profile_id: string | null;
}

export type CalendarEventInput = Omit<CalendarEvent, "id">;

export const listEvents = (since?: string) =>
  authFetch<CalendarEvent[]>(`/events${since ? `?since=${encodeURIComponent(since)}` : ""}`);

export const createEvent = (input: CalendarEventInput) =>
  authFetch<CalendarEvent>("/events", { method: "POST", body: JSON.stringify(input) });

export const updateEvent = (id: string, input: CalendarEventInput) =>
  authFetch<CalendarEvent>(`/events/${id}`, { method: "PUT", body: JSON.stringify(input) });

export const deleteEvent = (id: string) => authFetch<void>(`/events/${id}`, { method: "DELETE" });
