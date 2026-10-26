/**
 * Where the card that opened a screen sits on the window, so the screen can grow out of it.
 * One slot: the card writes it just before it navigates, and the screen's `ZoomTransition` takes it
 * once, so a later visit that did not come from a card does not zoom from a stale place.
 */
export type ZoomOrigin = { x: number; y: number; w: number; h: number };

let pending: ZoomOrigin | null = null;

export function setZoomOrigin(origin: ZoomOrigin): void {
  pending = origin;
}

export function takeZoomOrigin(): ZoomOrigin | null {
  const origin = pending;
  pending = null;
  return origin;
}
