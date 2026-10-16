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
