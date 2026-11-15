import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Whether the app is in front of the user. Each app reports it (the phone app from
 * `AppState`); it stays true where nothing reports, so the website behaves as before.
 *
 * Live clocks pause while it is false: a timer that keeps re-rendering a chart after the
 * app is sent to the background makes Android redraw it there, and a slow draw on a
 * background app is reported as an ANR (Sentry PATRO-D).
 */
let foreground = true;
const listeners = new Set<() => void>();

export function setAppForeground(next: boolean): void {
  if (next === foreground) return;
  foreground = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppForeground(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => foreground,
    () => true,
  );
}

/**
 * Calls `onTick` every `intervalMs` while `enabled` and the app is in front, and once
 * straight away when the app comes back, so a clock catches up instead of showing the
 * time it was left at.
 */
export function useForegroundInterval(onTick: () => void, intervalMs: number, enabled = true): void {
  const active = useAppForeground() && enabled;
  const tickRef = useRef(onTick);
  useEffect(() => {
    tickRef.current = onTick;
  });
  const wasActive = useRef(active);

  useEffect(() => {
    if (!active) {
      wasActive.current = false;
      return;
    }
    if (!wasActive.current) tickRef.current();
    wasActive.current = true;
    const id = setInterval(() => tickRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
}
