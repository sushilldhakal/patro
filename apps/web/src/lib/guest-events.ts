/**
 * A signed-out visitor's events are kept in this browser (same shape as the account's), and moved to
 * the account once they sign in — see `configureGuestEvents` in the shared client.
 */
import { configureGuestEvents, type CalendarEvent } from "@vedic-patro/api-client";

const KEY = "vp:guest-events";

configureGuestEvents({
  get() {
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as CalendarEvent[]) : null;
    } catch {
      return null;
    }
  },
  // Storage full or blocked throws, so the form says the save failed instead of losing the event.
  set(events) {
    if (events.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(events));
  },
});

export { uploadGuestEvents } from "@vedic-patro/api-client";
