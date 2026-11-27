import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Platform } from "react-native";
import { useIsFocused } from "expo-router";
import type { HeaderDateTitleProps } from "@/components/patro-date/HeaderDateTitle";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";

/** The phone header's first row (home's layout): date badge + year line, and the page's place. */
export type TopBarHeader = HeaderDateTitleProps & {
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
};

/** The focused page's date controls, drawn in the app's top bar (AppHeader, or DuoToolbar on the iPhone Duo) instead of the page. */
let current: { owner: object; element: ReactNode; header?: TopBarHeader; pinned?: boolean } | null = null;
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

/** True when the focused page asked for its bar to stay put while the page scrolls (PageBackBar). */
export function useTopBarPinned(): boolean {
  return useSyncExternalStore(subscribe, () => current?.pinned ?? false);
}

/** The focused page's first-row title and place, or null (the bar then stays one row). */
export function useTopBarHeader(): TopBarHeader | null {
  return useSyncExternalStore(subscribe, () => current?.header ?? null);
}

function Publish({ children, header, pinned }: { children: ReactNode; header?: TopBarHeader; pinned?: boolean }) {
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
    current = { owner, element: children, header, pinned };
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
export function TopBarSlot({ children, header, pinned }: { children: ReactNode; header?: TopBarHeader; pinned?: boolean }) {
  if (Platform.OS === "web") return <>{children}</>;
  return <Publish header={header} pinned={pinned}>{children}</Publish>;
}
