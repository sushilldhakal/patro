import type { ReactNode } from "react";
import { useDeferredMount } from "@/lib/use-deferred-mount";

/**
 * Renders `children` one settled frame after this element mounts. Being a
 * component (not a hook in the screen) matters: inside an already-deferred
 * page body it waits for that body to draw, rather than firing together with it.
 */
export function Deferred({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{useDeferredMount() ? children : fallback}</>;
}

/** The first `first` items now, the rest once they have drawn. */
export function useStagedList<T>(items: T[], first: number): T[] {
  const all = useDeferredMount();
  return all ? items : items.slice(0, first);
}

/**
 * `children(items)` with the first `first` items now and all of them once those
 * have drawn — {@link useStagedList} as an element, so it can sit inside a page
 * body that is itself deferred.
 */
export function Staged<T>({ items, first, children }: { items: T[]; first: number; children: (items: T[]) => ReactNode }) {
  return <>{children(useStagedList(items, first))}</>;
}
