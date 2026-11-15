import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

function isActive(state: AppStateStatus | string | null | undefined): boolean {
  return state === "active" || state == null;
}

/**
 * Calls `onTick` every `intervalMs` while `enabled` and the app is in the foreground, and once
 * straight away when the app comes back. A live clock that re-renders an SVG chart after the
 * app is backgrounded makes Android redraw it there, and a slow background draw is reported as
 * an ANR (Sentry PATRO-D).
 */
export function useActiveInterval(onTick: () => void, intervalMs: number, enabled = true): void {
  const [appActive, setAppActive] = useState(() => isActive(AppState.currentState));
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => setAppActive(isActive(next)));
    return () => sub.remove();
  }, []);

  const tickRef = useRef(onTick);
  useEffect(() => {
    tickRef.current = onTick;
  });
  const active = appActive && enabled;
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
