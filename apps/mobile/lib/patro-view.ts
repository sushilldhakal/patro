import { useSyncExternalStore } from "react";
import type { HomePatroView } from "@/components/home/PatroViewToggle";

/**
 * How home draws the month (the BS calendar or the panchanga grid). It lives here, not in the home
 * screen's state, so it survives the home screen unloading while another tab is open.
 */
let homeView: HomePatroView = "calendar";
const listeners = new Set<() => void>();

export function setHomePatroView(next: HomePatroView) {
  if (next === homeView) return;
  homeView = next;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useHomePatroView(): [HomePatroView, (next: HomePatroView) => void] {
  const view = useSyncExternalStore(subscribe, () => homeView);
  return [view, setHomePatroView];
}
