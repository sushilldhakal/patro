import { useSyncExternalStore } from "react";

/**
 * Held while a finger is on a zoomable chart. The page's own ScrollView reads it
 * (`useZoomScrollLocked`) and stands still for the length of the gesture, so a pinch or a
 * drag on a zoomed chart is not also scrolling the page under it.
 */
let locked = false;
const listeners = new Set<() => void>();

export function setZoomScrollLocked(next: boolean) {
  if (next === locked) return;
  locked = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useZoomScrollLocked(): boolean {
  return useSyncExternalStore(subscribe, () => locked, () => false);
}
