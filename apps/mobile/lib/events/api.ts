/**
 * The events API lives in the shared client, so the website and the app save the same records.
 * Signed out, events are kept in the phone's database instead (`configureGuestEvents`), so a guest's
 * alerts and widget work too; they move to the account on sign-in (`uploadGuestEvents`).
 */
import { configureGuestEvents, type CalendarEvent } from "@vedic-patro/api-client";
import { deviceStore } from "@/lib/device-store";

const KEY_GUEST = "events:guest";

configureGuestEvents({
  get: () => deviceStore.get<CalendarEvent[]>(KEY_GUEST),
  set: (events) => deviceStore.set(KEY_GUEST, events),
});

export {
  EVENT_ALERTS,
  EVENT_PRIORITIES,
  EVENT_REPEATS,
  createEvent,
  deleteEvent,
  isGuestEvent,
  listEvents,
  updateEvent,
  uploadGuestEvents,
  type CalendarEvent,
  type CalendarEventInput,
  type EventKind,
  type EventPriority,
  type EventRepeat,
} from "@vedic-patro/api-client";
