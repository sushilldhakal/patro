import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False while server-rendering and on the first client pass, true afterwards.
 *
 * For anything that cannot exist in the prerendered HTML — a WebGL canvas, a
 * `window` measurement — this is the guard that keeps the first client render
 * identical to the markup that shipped, so hydration has nothing to reconcile.
 * `useSyncExternalStore` gives React the two snapshots directly, rather than
 * flipping a state flag from an effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
