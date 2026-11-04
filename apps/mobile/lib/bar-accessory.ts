import { useSyncExternalStore } from "react";

/**
 * The height of whatever docks just above the floating bottom bar (the documents' audio player),
 * so the floating search / place buttons can lift above it instead of crowding it. 0 when nothing
 * is docked.
 */
let height = 0;
const listeners = new Set<() => void>();

export function setBarAccessoryHeight(next: number) {
  const rounded = Math.round(next);
  if (rounded === height) return;
  height = rounded;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useBarAccessoryHeight(): number {
  return useSyncExternalStore(subscribe, () => height, () => 0);
}
