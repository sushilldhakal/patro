import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useIsFocused } from "expo-router";
import { IS_IPHONE_DUO } from "@/lib/iphone-duo";
import { useDuoRail } from "@/lib/duo-rail";

/** The focused page's date controls, drawn in the iPhone Duo's top bar (DuoToolbar) instead of the page. */
let current: { owner: object; element: ReactNode } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** What DuoToolbar puts in the top bar beside the view button, or null. */
export function useDuoTopBarElement(): ReactNode {
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
 * A page's date controls (the month stepper, the day-and-time picker, the year picker). On the iPhone Duo,
 * when its bars sit in the side rail (folded, landscape, Split View), iOS keeps a top bar for the text view
 * button; the controls move into that same row, like Apple Calendar's month title beside "Month", instead
 * of opening the page under an empty band. Everywhere else they stay in the page.
 */
export function DuoTopBarSlot({ children }: { children: ReactNode }) {
  if (!IS_IPHONE_DUO) return <>{children}</>;
  return <DuoTopBarSlotDuo>{children}</DuoTopBarSlotDuo>;
}

function DuoTopBarSlotDuo({ children }: { children: ReactNode }) {
  const { horizontal } = useDuoRail();
  if (horizontal) return <>{children}</>;
  return <Publish>{children}</Publish>;
}
