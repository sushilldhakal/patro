import { Platform } from "react-native";
import * as DeviceCalendar from "expo-calendar/legacy";
import { deviceStore } from "@/lib/device-store";
import { createEvent, listEvents, updateEvent, type CalendarEvent, type CalendarEventInput, type EventRepeat } from "./api";

/**
 * The phone's own calendars — every account synced to it (iCloud, Google, Exchange, …) — read with
 * expo-calendar and saved as the user's events, so they show and alert like ones made here.
 * Imported events carry `source_kind: "device"` and the phone's event id, so a re-run updates
 * them instead of adding copies.
 */

const KEY_CHOSEN = "events:device-calendars";
/** Weeks of the phone calendar brought in, from a day ago. */
const WINDOW_DAYS = 90;

export type PhoneCalendar = { id: string; title: string; account: string; color: string | null };

export async function phoneCalendarPermission(ask: boolean): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const res = ask ? await DeviceCalendar.requestCalendarPermissionsAsync() : await DeviceCalendar.getCalendarPermissionsAsync();
  return res.granted;
}

export async function listPhoneCalendars(): Promise<PhoneCalendar[]> {
  const calendars = await DeviceCalendar.getCalendarsAsync(DeviceCalendar.EntityTypes.EVENT);
  return calendars
    .map((c) => ({ id: c.id, title: c.title, account: c.source?.name ?? "", color: c.color ?? null }))
    .sort((a, b) => a.account.localeCompare(b.account) || a.title.localeCompare(b.title));
}

export async function getChosenCalendars(): Promise<string[]> {
  return (await deviceStore.get<string[]>(KEY_CHOSEN)) ?? [];
}

export async function setChosenCalendars(ids: string[]): Promise<void> {
  await deviceStore.set(KEY_CHOSEN, ids);
}

function toIso(value: string | Date): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function repeatOf(rule: DeviceCalendar.RecurrenceRule | null | undefined): EventRepeat {
  if (!rule) return "never";
  const every = rule.interval ?? 1;
  switch (rule.frequency) {
    case DeviceCalendar.Frequency.DAILY:
      return every === 1 ? "daily" : "never";
    case DeviceCalendar.Frequency.WEEKLY:
      return every === 1 ? "weekly" : every === 2 ? "fortnightly" : "never";
    case DeviceCalendar.Frequency.MONTHLY:
      return every === 1 ? "monthly" : "never";
    case DeviceCalendar.Frequency.YEARLY:
      return every === 1 ? "yearly" : "never";
    default:
      return "never";
  }
}

function toInput(ev: DeviceCalendar.Event, profileId: string | null): CalendarEventInput {
  const alerts = (ev.alarms ?? [])
    .map((a) => (a.relativeOffset != null ? Math.max(0, -a.relativeOffset) : null))
    .filter((m): m is number => m != null)
    .slice(0, 2);
  return {
    title: (ev.title || "—").slice(0, 200),
    location: ev.location ? ev.location.slice(0, 200) : null,
    notes: ev.notes ? ev.notes.slice(0, 4000) : null,
    all_day: Boolean(ev.allDay),
    starts_at: toIso(ev.startDate),
    ends_at: toIso(ev.endDate),
    timezone: ev.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kathmandu",
    repeat: repeatOf(ev.recurrenceRule),
    alerts,
    source_kind: "device",
    source_key: ev.id,
    invitees: [],
    profile_id: profileId,
  };
}

/**
 * Bring the chosen phone calendars' events (from yesterday to 90 days on) into the app: new ones
 * are added, changed ones updated. A repeating event counts once (its first instance in range).
 * Returns how many were added or changed.
 */
export async function importPhoneCalendars(calendarIds?: string[]): Promise<number> {
  if (Platform.OS === "web") return 0;
  if (!(await phoneCalendarPermission(false))) return 0;
  const ids = calendarIds ?? (await getChosenCalendars());
  if (ids.length === 0) return 0;
  const from = new Date(Date.now() - 86_400_000);
  const to = new Date(Date.now() + WINDOW_DAYS * 86_400_000);
  const events = await DeviceCalendar.getEventsAsync(ids, from, to);
  const existing = new Map<string, CalendarEvent>();
  for (const e of await listEvents()) if (e.source_kind === "device" && e.source_key) existing.set(e.source_key, e);

  let changed = 0;
  const seen = new Set<string>();
  for (const ev of events) {
    if (seen.has(ev.id)) continue; // one entry per repeating series
    seen.add(ev.id);
    const input = toInput(ev, null);
    const have = existing.get(ev.id);
    try {
      if (!have) {
        await createEvent(input);
        changed += 1;
      } else if (
        have.title !== input.title ||
        have.starts_at !== input.starts_at ||
        have.ends_at !== input.ends_at ||
        have.location !== input.location ||
        have.repeat !== input.repeat
      ) {
        await updateEvent(have.id, { ...input, invitees: have.invitees, profile_id: have.profile_id });
        changed += 1;
      }
    } catch {
      /* one event the server rejects must not stop the rest */
    }
  }
  return changed;
}
