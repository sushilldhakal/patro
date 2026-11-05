/**
 * The user's events and reminders (`/events`) — one record for both, shared by the website and the
 * app — and the day guidance the new-event form shows as tips.
 */
import { authFetch, hasStoredSession } from "./auth";
import { apiBaseUrl } from "./client";

/**
 * How often an event comes back, in Apple Calendar's order. Weekdays are Monday–Friday and
 * weekends Saturday–Sunday (iCalendar's BYDAY, so an invitation repeats the same way).
 */
export const EVENT_REPEATS = [
  "never",
  "daily",
  "weekdays",
  "weekends",
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly",
] as const;
export type EventRepeat = (typeof EVENT_REPEATS)[number];

/** The form's two tabs: an event has a start and an end; a reminder is one moment (or a whole day). */
export type EventKind = "event" | "reminder";

/** A reminder's priority, as Apple Reminders: 0 none, 1 low, 2 medium, 3 high. */
export const EVENT_PRIORITIES = [0, 1, 2, 3] as const;
export type EventPriority = (typeof EVENT_PRIORITIES)[number];

/** Alert choices, minutes before the start (Apple Calendar's list); null = none. */
export const EVENT_ALERTS = [null, 0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080] as const;

export interface CalendarEvent {
  id: string;
  /** Missing on records saved before reminders had their own tab: an event. */
  kind?: EventKind;
  priority?: EventPriority;
  title: string;
  location: string | null;
  notes: string | null;
  all_day: boolean;
  starts_at: string;
  ends_at: string;
  timezone: string;
  repeat: EventRepeat;
  alerts: number[];
  /**
   * Where it came from: `sait` + ceremony id; `shubh` / `ashubh` + the day's window key
   * (`abhijit`, `rahu_kalam` …); `pushkara` + the lagna; or `device` + the phone calendar's event id.
   */
  source_kind: string | null;
  source_key: string | null;
  invitees: string[];
  profile_id: string | null;
}

export type CalendarEventInput = Omit<CalendarEvent, "id">;

// ─── Guests ───────────────────────────────────────────────────────────────────
// Signed out, events are kept on this device (the phone's database, the browser's storage) with
// the same shape, so alerts and the widget work without an account. Invitations need an account:
// a guest's invitees are dropped. On sign-in `uploadGuestEvents` moves them to the account once.

/** Where a guest's events are kept on this device. */
export interface GuestEventStore {
  get(): Promise<CalendarEvent[] | null> | CalendarEvent[] | null;
  set(events: CalendarEvent[]): Promise<void> | void;
}

let guestStore: GuestEventStore | null = null;

/** Call once at start-up with this device's storage; without it, signed-out saves fail as before. */
export function configureGuestEvents(store: GuestEventStore): void {
  guestStore = store;
}

const isGuest = () => !hasStoredSession() && guestStore != null;

/** Ids of events kept on this device start with this. */
export const GUEST_EVENT_PREFIX = "local:";

export const isGuestEvent = (event: Pick<CalendarEvent, "id">) => event.id.startsWith(GUEST_EVENT_PREFIX);

async function readGuest(): Promise<CalendarEvent[]> {
  return (await guestStore?.get()) ?? [];
}

function guestRecord(id: string, input: CalendarEventInput): CalendarEvent {
  return { ...input, id, invitees: [], alerts: [...new Set(input.alerts)].sort((a, b) => a - b).slice(0, 2) };
}

function newGuestId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${GUEST_EVENT_PREFIX}${Date.now().toString(36)}${rand}`;
}

export async function listEvents(since?: string): Promise<CalendarEvent[]> {
  if (isGuest()) {
    const all = await readGuest();
    const list = since ? all.filter((e) => e.ends_at >= since || e.repeat !== "never") : all;
    return [...list].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }
  return authFetch<CalendarEvent[]>(`/events${since ? `?since=${encodeURIComponent(since)}` : ""}`);
}

export async function createEvent(input: CalendarEventInput): Promise<CalendarEvent> {
  if (isGuest()) {
    const row = guestRecord(newGuestId(), input);
    await guestStore!.set([...(await readGuest()), row]);
    return row;
  }
  return authFetch<CalendarEvent>("/events", { method: "POST", body: JSON.stringify(input) });
}

export async function updateEvent(id: string, input: CalendarEventInput): Promise<CalendarEvent> {
  if (isGuest()) {
    const row = guestRecord(id, input);
    await guestStore!.set((await readGuest()).map((e) => (e.id === id ? row : e)));
    return row;
  }
  return authFetch<CalendarEvent>(`/events/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteEvent(id: string): Promise<void> {
  if (isGuest()) {
    await guestStore!.set((await readGuest()).filter((e) => e.id !== id));
    return;
  }
  return authFetch<void>(`/events/${id}`, { method: "DELETE" });
}

/**
 * Signed in now: move the events saved as a guest to the account. Each one is removed from the
 * device as soon as the server has it, so a failure part-way leaves the rest for the next try and
 * nothing is sent twice. Profiles are per account, so the guest's profile link is dropped.
 * Returns how many moved.
 */
export async function uploadGuestEvents(): Promise<number> {
  if (!guestStore || !hasStoredSession()) return 0;
  let left = await readGuest();
  let moved = 0;
  for (const event of [...left]) {
    const { id, ...input } = event;
    try {
      await authFetch<CalendarEvent>("/events", { method: "POST", body: JSON.stringify({ ...input, profile_id: null }) });
    } catch {
      continue;
    }
    left = left.filter((e) => e.id !== id);
    await guestStore.set(left);
    moved += 1;
  }
  return moved;
}

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

// ─── Subscription link ────────────────────────────────────────────────────────
// A private calendar URL the user adds once in Google Calendar or Apple Calendar; those apps fetch
// it again on their own schedule, so new, changed and deleted events follow.

export interface CalendarFeed {
  token: string;
  /** On the API base: `/calendar/<token>.ics`. */
  path: string;
}

export const fetchCalendarFeed = () => authFetch<CalendarFeed>("/events/feed");

/** A new link; calendars subscribed to the old one stop getting updates. */
export const resetCalendarFeed = () => authFetch<CalendarFeed>("/events/feed/reset", { method: "POST" });

export interface CalendarFeedLinks {
  /** https://…/calendar/<token>.ics — for "From URL" in Google Calendar, or any app. */
  https: string;
  /** webcal://… — opens Apple Calendar's Subscribe on iPhone, iPad and Mac. */
  webcal: string;
  /** Google Calendar's "add this calendar" page for the link. */
  google: string;
}

/**
 * The feed's links. `origin` resolves a relative API base (the website's `/api`); the app's base is
 * already absolute.
 */
export function calendarFeedLinks(path: string, origin?: string): CalendarFeedLinks {
  const https = new URL(`${apiBaseUrl().replace(/\/+$/, "")}${path}`, origin).toString();
  const webcal = https.replace(/^https?:/, "webcal:");
  return { https, webcal, google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}` };
}
