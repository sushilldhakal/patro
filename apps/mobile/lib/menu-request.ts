import { useEffect } from "react";

type Listener = () => void;
const listeners = new Set<Listener>();

/** Asks the header to open its side menu (swipe-back on home has no page to go back to). */
export function requestOpenMenu() {
  listeners.forEach((open) => open());
}

/** The header's side of {@link requestOpenMenu}. `onOpen` should be stable. */
export function useOpenMenuRequest(onOpen: () => void) {
  useEffect(() => {
    listeners.add(onOpen);
    return () => {
      listeners.delete(onOpen);
    };
  }, [onOpen]);
}

const signInListeners = new Set<Listener>();

/** Asks the iPhone Duo shell to open the sign-in dialog (its native toolbar has no JS dialog of its own). */
export function requestSignIn() {
  signInListeners.forEach((open) => open());
}

export function useSignInRequest(onOpen: () => void) {
  useEffect(() => {
    signInListeners.add(onOpen);
    return () => {
      signInListeners.delete(onOpen);
    };
  }, [onOpen]);
}

const searchListeners = new Set<Listener>();

/** Asks the root to open festival search: the header's and the iPhone Duo toolbar's search icon both land there. */
export function requestSearch() {
  searchListeners.forEach((open) => open());
}

export function useSearchRequest(onOpen: () => void) {
  useEffect(() => {
    searchListeners.add(onOpen);
    return () => {
      searchListeners.delete(onOpen);
    };
  }, [onOpen]);
}

const addReminderListeners = new Set<(date?: string) => void>();

/**
 * Asks the root to open the "+" menu (the header, the Duo toolbar, or a day's card). With a date
 * ("YYYY-MM-DD") the form starts on that day. A button's press event may come in as the argument: only a
 * string counts.
 */
export function requestAddReminder(date?: unknown) {
  const day = typeof date === "string" ? date : undefined;
  addReminderListeners.forEach((open) => open(day));
}

export function useAddReminderRequest(onOpen: (date?: string) => void) {
  useEffect(() => {
    addReminderListeners.add(onOpen);
    return () => {
      addReminderListeners.delete(onOpen);
    };
  }, [onOpen]);
}

const remindersChangedListeners = new Set<Listener>();

/** A reminder was created from the global sheet: the reminders page, if open, reloads its list. */
export function notifyRemindersChanged() {
  remindersChangedListeners.forEach((fn) => fn());
}

export function useRemindersChanged(onChange: () => void) {
  useEffect(() => {
    remindersChangedListeners.add(onChange);
    return () => {
      remindersChangedListeners.delete(onChange);
    };
  }, [onChange]);
}

/** A chosen place, handed back instead of becoming the app's place (a birth place in a profile form). */
export type PlacePick = (place: { label: string; params: { lat?: number; lon?: number; timezone?: string; city_id?: number } }) => void;
const locationListeners = new Set<(onPick?: PlacePick) => void>();

/**
 * Asks the root to open the place picker (the location button in the header and the Duo toolbar).
 * With `onPick`, the place the reader chooses is handed back and the app's own place stays as it was.
 * (Used straight as an onPress handler too, so anything that is not a function is ignored.)
 */
export function requestLocationPicker(onPick?: unknown) {
  const pick = typeof onPick === "function" ? (onPick as PlacePick) : undefined;
  locationListeners.forEach((open) => open(pick));
}

export function useLocationPickerRequest(onOpen: (onPick?: PlacePick) => void) {
  useEffect(() => {
    locationListeners.add(onOpen);
    return () => {
      locationListeners.delete(onOpen);
    };
  }, [onOpen]);
}
