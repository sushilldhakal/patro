/** The events API lives in the shared client, so the website and the app save the same records. */
export {
  EVENT_ALERTS,
  EVENT_REPEATS,
  createEvent,
  deleteEvent,
  listEvents,
  updateEvent,
  type CalendarEvent,
  type CalendarEventInput,
  type EventRepeat,
} from "@vedic-patro/api-client";
