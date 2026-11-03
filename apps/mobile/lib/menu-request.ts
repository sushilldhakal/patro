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

const addReminderListeners = new Set<Listener>();

/** Asks the root to open the new-reminder sheet (the "+" in the header and in the Duo toolbar). */
export function requestAddReminder() {
  addReminderListeners.forEach((open) => open());
}

export function useAddReminderRequest(onOpen: () => void) {
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

const locationListeners = new Set<Listener>();

/** Asks the root to open the place picker (the location button in the header and the Duo toolbar). */
export function requestLocationPicker() {
  locationListeners.forEach((open) => open());
}

export function useLocationPickerRequest(onOpen: () => void) {
  useEffect(() => {
    locationListeners.add(onOpen);
    return () => {
      locationListeners.delete(onOpen);
    };
  }, [onOpen]);
}
