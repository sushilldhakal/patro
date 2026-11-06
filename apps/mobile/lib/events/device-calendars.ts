import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { brand } from "@vedic-patro/design-tokens";
import type * as DeviceCalendarModule from "expo-calendar/legacy";
import { deviceStore } from "@/lib/device-store";
import { createEvent, deleteEvent, listEvents, updateEvent, type CalendarEvent, type CalendarEventInput, type EventRepeat } from "./api";

/**
 * The phone's own calendars — every account synced to it (iCloud, Google, Exchange, …) — read with
 * expo-calendar and saved as the user's events, so they show and alert like ones made here.
 * Imported events carry `source_kind: "device"` and the phone's event id, so a re-run updates
 * them instead of adding copies.
 *
 * The other way: the user's own tasks, events and appointments are written into a "Vedic Patro"
 * calendar on the phone (iCloud when the phone uses it, so they reach the user's Mac and iPad too),
 * kept in step on every sync. That calendar is never read back in, so nothing loops.
 */

type Calendar = typeof DeviceCalendarModule;
let loaded: Calendar | null | undefined;

/**
 * expo-calendar, loaded only when this build has its native module. Importing it at the top would
 * throw in a build made before it was added (an app update reaches those too), taking down every
 * screen that imports the sync.
 */
function deviceCalendar(): Calendar | null {
  if (loaded !== undefined) return loaded;
  loaded = null;
  if (Platform.OS === "web" || !requireOptionalNativeModule("ExpoCalendar")) return loaded;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require("expo-calendar/legacy") as Calendar;
  } catch {
    loaded = null;
  }
  return loaded;
}

/** False on web and in builds without the calendar module: the card hides. */
export const phoneCalendarsAvailable = () => deviceCalendar() != null;

const KEY_CHOSEN = "events:device-calendars";
/** Weeks of the phone calendar brought in, from a day ago. */
const WINDOW_DAYS = 90;

export type PhoneCalendar = { id: string; title: string; account: string; color: string | null };

export async function phoneCalendarPermission(ask: boolean): Promise<boolean> {
  const DeviceCalendar = deviceCalendar();
  if (!DeviceCalendar) return false;
  const res = ask ? await DeviceCalendar.requestCalendarPermissionsAsync() : await DeviceCalendar.getCalendarPermissionsAsync();
  if (res.granted && ask) await deviceStore.set(KEY_EXPORT_ON, true);
  return res.granted;
}

/**
 * Where calendar access stands. iOS shows its own "Allow" popup once per install: after a "Don't
 * Allow" the app can only send the user to Settings ("settings"); Android can ask again until the
 * user ticks "don't ask again".
 */
export type PhoneCalendarAccess = "granted" | "ask" | "settings" | "unavailable";

export async function phoneCalendarAccess(): Promise<PhoneCalendarAccess> {
  const DeviceCalendar = deviceCalendar();
  if (!DeviceCalendar) return "unavailable";
  const res = await DeviceCalendar.getCalendarPermissionsAsync();
  if (res.granted) return "granted";
  return res.canAskAgain ? "ask" : "settings";
}

const KEY_ASKED_AT = "events:phone-asked-at";
/** After "Not now", saving an event asks again at most this often. */
const ASK_AGAIN_DAYS = 7;

/** True when the app may put its own "connect your calendar" question to the user now. */
export async function shouldAskForPhoneCalendar(): Promise<boolean> {
  if ((await phoneCalendarAccess()) === "granted" || !phoneCalendarsAvailable()) return false;
  const at = await deviceStore.get<number>(KEY_ASKED_AT);
  return at == null || Date.now() - at > ASK_AGAIN_DAYS * 86_400_000;
}

export async function markPhoneCalendarAsked(): Promise<void> {
  await deviceStore.set(KEY_ASKED_AT, Date.now());
}

export async function listPhoneCalendars(): Promise<PhoneCalendar[]> {
  const DeviceCalendar = deviceCalendar();
  if (!DeviceCalendar) return [];
  const calendars = await DeviceCalendar.getCalendarsAsync(DeviceCalendar.EntityTypes.EVENT);
  const own = await deviceStore.get<string>(KEY_EXPORT_CAL);
  return calendars
    .filter((c) => c.id !== own) // our own calendar is written, never imported
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

function repeatOf(rule: DeviceCalendarModule.RecurrenceRule | null | undefined): EventRepeat {
  if (!rule) return "never";
  const every = rule.interval ?? 1;
  switch (rule.frequency as string) {
    case "daily":
      return every === 1 ? "daily" : "never";
    case "weekly":
      return every === 1 ? "weekly" : every === 2 ? "fortnightly" : "never";
    case "monthly":
      return every === 1 ? "monthly" : every === 3 ? "quarterly" : every === 6 ? "half_yearly" : "never";
    case "yearly":
      return every === 1 ? "yearly" : "never";
    default:
      return "never";
  }
}

function toInput(ev: DeviceCalendarModule.Event, profileId: string | null): CalendarEventInput {
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
 * are added, changed ones updated, and ones gone from the phone (deleted there, or their calendar
 * no longer chosen) removed. A repeating event counts once (its first instance in range).
 * Returns how many were added, changed or removed.
 */
export async function importPhoneCalendars(calendarIds?: string[]): Promise<number> {
  const DeviceCalendar = deviceCalendar();
  if (!DeviceCalendar || !(await phoneCalendarPermission(false))) return 0;
  const own = await deviceStore.get<string>(KEY_EXPORT_CAL);
  const ids = (calendarIds ?? (await getChosenCalendars())).filter((id) => id !== own);
  const from = new Date(Date.now() - 86_400_000);
  const to = new Date(Date.now() + WINDOW_DAYS * 86_400_000);
  // No calendar chosen any more: nothing comes in, and what came before goes.
  const events = ids.length ? await DeviceCalendar.getEventsAsync(ids, from, to) : [];
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
  // Imported before, inside the window the phone was just asked about, and not there now.
  for (const [key, have] of existing) {
    if (seen.has(key)) continue;
    const at = Date.parse(have.starts_at);
    if (at < from.getTime() || at > to.getTime()) continue;
    try {
      await deleteEvent(have.id);
      changed += 1;
    } catch {
      /* try again next sync */
    }
  }
  return changed;
}

// ─── The user's events → the phone's calendar ────────────────────────────────

const KEY_EXPORT_ON = "events:phone-export";
const KEY_EXPORT_CAL = "events:phone-export-calendar";
const KEY_EXPORT_MAP = "events:phone-export-map";
const EXPORT_TITLE = "Vedic Patro";
const EXPORT_NAME = "vedicpatro";

/** One app event's copy on the phone: its device id, what it was written as, and when it ends. */
type Exported = { id: string; sig: string; end: number };

/** On unless the user turned it off; it only runs once calendar access is granted. */
export async function phoneExportEnabled(): Promise<boolean> {
  return (await deviceStore.get<boolean>(KEY_EXPORT_ON)) ?? true;
}

/** Turning it off removes the Vedic Patro calendar from the phone, and with it every copy. */
export async function setPhoneExportEnabled(on: boolean): Promise<void> {
  await deviceStore.set(KEY_EXPORT_ON, on);
  if (on) return;
  const DeviceCalendar = deviceCalendar();
  const id = await deviceStore.get<string>(KEY_EXPORT_CAL);
  if (DeviceCalendar && id && (await phoneCalendarPermission(false))) {
    await DeviceCalendar.deleteCalendarAsync(id).catch(() => {});
  }
  await deviceStore.set(KEY_EXPORT_CAL, null);
  await deviceStore.set(KEY_EXPORT_MAP, {});
}

/** The Vedic Patro calendar on this phone: the saved one, one found by name (after a reinstall), or a new one. */
async function exportCalendarId(DeviceCalendar: Calendar): Promise<string | null> {
  const calendars = await DeviceCalendar.getCalendarsAsync(DeviceCalendar.EntityTypes.EVENT);
  const saved = await deviceStore.get<string>(KEY_EXPORT_CAL);
  const found = calendars.find((c) => c.id === saved) ?? calendars.find((c) => c.title === EXPORT_TITLE && c.allowsModifications);
  if (found) {
    if (found.id !== saved) await deviceStore.set(KEY_EXPORT_CAL, found.id);
    return found.id;
  }
  const common = {
    title: EXPORT_TITLE,
    color: brand.saffron,
    entityType: DeviceCalendar.EntityTypes.EVENT,
    name: EXPORT_NAME,
    ownerAccount: "personal",
    accessLevel: DeviceCalendar.CalendarAccessLevel.OWNER,
  };
  let id: string;
  if (Platform.OS === "ios") {
    // The default calendar's account: iCloud when the phone uses it, so the copies reach the Mac too.
    const source = (await DeviceCalendar.getDefaultCalendarAsync()).source;
    id = await DeviceCalendar.createCalendarAsync({ ...common, sourceId: source.id, source });
  } else {
    id = await DeviceCalendar.createCalendarAsync({ ...common, source: { isLocalAccount: true, name: EXPORT_TITLE, type: DeviceCalendar.SourceType.LOCAL } });
  }
  await deviceStore.set(KEY_EXPORT_CAL, id);
  // A new calendar holds none of the old copies.
  await deviceStore.set(KEY_EXPORT_MAP, {});
  return id;
}

function recurrenceOf(DeviceCalendar: Calendar, repeat: EventRepeat): DeviceCalendarModule.RecurrenceRule | null {
  const F = DeviceCalendar.Frequency;
  const D = DeviceCalendar.DayOfTheWeek;
  const days = (list: DeviceCalendarModule.DayOfTheWeek[]) => list.map((dayOfTheWeek) => ({ dayOfTheWeek }));
  switch (repeat) {
    case "daily":
      return { frequency: F.DAILY };
    case "weekly":
      return { frequency: F.WEEKLY };
    case "fortnightly":
      return { frequency: F.WEEKLY, interval: 2 };
    case "monthly":
      return { frequency: F.MONTHLY };
    case "quarterly":
      return { frequency: F.MONTHLY, interval: 3 };
    case "half_yearly":
      return { frequency: F.MONTHLY, interval: 6 };
    case "yearly":
      return { frequency: F.YEARLY };
    // Only iOS takes weekdays in a rule; on Android these stay a single event rather than a wrong series.
    case "weekdays":
      return Platform.OS === "ios" ? { frequency: F.WEEKLY, daysOfTheWeek: days([D.Monday, D.Tuesday, D.Wednesday, D.Thursday, D.Friday]) } : null;
    case "weekends":
      return Platform.OS === "ios" ? { frequency: F.WEEKLY, daysOfTheWeek: days([D.Saturday, D.Sunday]) } : null;
    default:
      return null;
  }
}

function deviceDetails(DeviceCalendar: Calendar, e: CalendarEvent) {
  return {
    title: e.title,
    location: e.location ?? "",
    notes: e.notes ?? "",
    allDay: e.all_day,
    startDate: new Date(e.starts_at),
    endDate: new Date(e.ends_at),
    timeZone: e.timezone,
    recurrenceRule: recurrenceOf(DeviceCalendar, e.repeat),
    alarms: (e.alerts ?? []).map((minutes) => ({ relativeOffset: -minutes })),
  };
}

/**
 * Write the user's own events (not ones that came from the phone) into the Vedic Patro calendar:
 * new ones added, changed ones updated, deleted ones removed. A copy whose event has already ended
 * is left alone, so the past stays in the phone's calendar. Returns how many copies changed.
 */
export async function exportToPhoneCalendar(events?: CalendarEvent[]): Promise<number> {
  const DeviceCalendar = deviceCalendar();
  if (!DeviceCalendar || !(await phoneExportEnabled()) || !(await phoneCalendarPermission(false))) return 0;
  const calendarId = await exportCalendarId(DeviceCalendar);
  if (!calendarId) return 0;
  const from = Date.now() - 86_400_000;
  const list = events ?? (await listEvents(new Date(from).toISOString()));
  const before = (await deviceStore.get<Record<string, Exported>>(KEY_EXPORT_MAP)) ?? {};
  const after: Record<string, Exported> = {};
  let changed = 0;

  for (const e of list) {
    if (e.source_kind === "device") continue; // it is already on the phone
    const details = deviceDetails(DeviceCalendar, e);
    const sig = JSON.stringify([e.title, e.location, e.notes, e.all_day, e.starts_at, e.ends_at, e.timezone, e.repeat, e.alerts]);
    const end = Date.parse(e.ends_at);
    const have = before[e.id];
    try {
      if (have && have.sig === sig) {
        after[e.id] = have;
        continue;
      }
      let id: string;
      if (have) {
        // Deleted on the phone by hand: write it again.
        id = await DeviceCalendar.updateEventAsync(have.id, details).catch(() => DeviceCalendar.createEventAsync(calendarId, details));
      } else {
        id = await DeviceCalendar.createEventAsync(calendarId, details);
      }
      after[e.id] = { id: id || have?.id || "", sig, end };
      changed += 1;
    } catch {
      if (have) after[e.id] = have; // try again next sync
    }
  }
  for (const [appId, have] of Object.entries(before)) {
    if (after[appId]) continue;
    if (have.end < from) {
      after[appId] = have; // over, and out of the list's window: not deleted
      continue;
    }
    try {
      await DeviceCalendar.deleteEventAsync(have.id);
      changed += 1;
    } catch {
      /* already gone on the phone */
    }
  }
  await deviceStore.set(KEY_EXPORT_MAP, after);
  return changed;
}

/** Both ways: the chosen phone calendars in, the user's events out. Never throws. */
export async function syncPhoneCalendars(): Promise<void> {
  await importPhoneCalendars().catch(() => 0);
  await exportToPhoneCalendar().catch(() => 0);
}
