/**
 * The user's events and reminders (`/events`) — one record for both, shared by the website and the
 * app — and the day guidance the new-event form shows as tips.
 */
import { authFetch } from "./auth";

/** How often an event comes back, as Apple Calendar offers it. */
export const EVENT_REPEATS = ["never", "daily", "weekly", "fortnightly", "monthly", "yearly"] as const;
export type EventRepeat = (typeof EVENT_REPEATS)[number];

/** Alert choices, minutes before the start (Apple Calendar's list); null = none. */
export const EVENT_ALERTS = [null, 0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080] as const;

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
  /** Where it came from: `sait` + ceremony id, or `device` + the phone calendar's event id. */
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

/** A शुभ / अशुभ window of the day, local "HH:MM". */
export interface DayWindow {
  kind: "shubh" | "ashubh";
  key: string;
  name_ne: string | null;
  name_en: string | null;
  start: string;
  end: string | null;
}

/** One day of a profile's guidance: what the form's tips are made of. */
export interface DayGuidance {
  date: string;
  personal_tone: "best" | "good" | "neutral" | "bad" | "worst" | null;
  summary_ne: string;
  summary_en: string;
  do_ne: string[];
  do_en: string[];
  dont_ne: string[];
  dont_en: string[];
  careful_ne: string[];
  careful_en: string[];
  windows: DayWindow[];
}

export const fetchDayGuidance = (
  profileId: string,
  date: string,
  location: { lat?: number | null; lon?: number | null; timezone?: string | null; city_id?: number | null },
) => {
  const params = new URLSearchParams({ from: date, days: "1" });
  if (location.city_id != null) params.set("city_id", String(location.city_id));
  if (location.lat != null) params.set("lat", String(location.lat));
  if (location.lon != null) params.set("lon", String(location.lon));
  if (location.timezone) params.set("timezone", location.timezone);
  return authFetch<{ days: DayGuidance[] }>(`/profiles/${profileId}/daily-guidance?${params.toString()}`);
};
