import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Platform } from "react-native";
import { useIsFocused } from "expo-router";

/** The focused page's date controls, drawn in the app's top bar (AppHeader, or DuoToolbar on the iPhone Duo) instead of the page. */
let current: { owner: object; element: ReactNode } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** What the top bar draws after the side-menu button, or null. */
export function useTopBarElement(): ReactNode {
  return useSyncExternalStore(subscribe, () => current?.element ?? null);
}

function Publish({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  const owner = useRef({}).current;

  // Every render: the controls carry the page's state, so the top bar always draws the newest copy.
  useEffect(() => {
    if (!focused) {
      if (current?.owner === owner) {
        current = null;
        emit();
      }
      return;
    }
    current = { owner, element: children };
    emit();
  });

  useEffect(
    () => () => {
      if (current?.owner === owner) {
        current = null;
        emit();
      }
    },
    [owner],
  );
  return null;
}

/**
 * A page's date controls (the month stepper, the day-and-time picker, the year picker). In the app they
 * live in the top bar — side-menu button, then the date, then the view menu and the account — so the page
 * starts with its content. On the iPhone Duo they are a custom toolbar view, which iOS keeps in the top
 * bar even when the icons go to the side rail (Apple Calendar's month title beside "Month"). The web
 * build keeps them in the page.
 */
export function TopBarSlot({ children }: { children: ReactNode }) {
  if (Platform.OS === "web") return <>{children}</>;
  return <Publish>{children}</Publish>;
}
