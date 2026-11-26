import { useSyncExternalStore } from "react";
import { Easing, makeMutable, withTiming } from "react-native-reanimated";

/**
 * The top bar on a phone's inner pages, done the way home does its header: the bar floats over
 * the page (AppHeader draws it absolutely), the page's own scroll leaves room for it at the top
 * (PageScrollView's spacer), and the bar's rows move with the scroll on the UI thread. Near the
 * top both rows ride with the content; further down the second row (the date controls) pins the
 * way home's does (lib/home-sticky.ts): after a short run up it slides in on a timed animation,
 * after a short run down it slides away — never left half-shown where the finger stopped.
 * Nothing is laid out again while scrolling, so nothing on the page jumps.
 *
 * Only a focused page that scrolls with PageScrollView turns this on (`registerOverlayPage`).
 * Any other page keeps the bar in the layout, fixed, so its content is never covered.
 */

/** The focused page's scroll offset, clamped to its range. */
export const headerY = makeMutable(0);
/** 0..1: how far the pinned second row has slid in (animated). */
export const headerShown = makeMutable(0);
/** Height of the first row (it scrolls away) and of both rows, measured by AppHeader. */
export const headerRow1H = makeMutable(0);
export const headerRowsH = makeMutable(0);
/** Height of a bottom row that never scrolls away (a page's tab bar), 0 without one. */
export const headerPinnedH = makeMutable(0);

let rowsHeight = 0;
let pages = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** AppHeader reports its rows' heights (without the status bar). */
export function setOverlayHeaderHeights(row1: number, rows: number) {
  headerRow1H.value = row1;
  headerRowsH.value = rows;
  if (rows !== rowsHeight) {
    rowsHeight = rows;
    emit();
  }
}

/** A focused page with a PageScrollView: the bar floats over it. Returns the unregister. */
export function registerOverlayPage(): () => void {
  pages += 1;
  emit();
  return () => {
    pages -= 1;
    emit();
  };
}

/** True while the focused page lets the bar float over it. */
export function useOverlayHeaderActive(): boolean {
  return useSyncExternalStore(subscribe, () => pages > 0, () => false);
}

/** Room the page leaves at its top for the floating bar's rows (0 until measured). */
export function useOverlayHeaderRowsHeight(): number {
  return useSyncExternalStore(subscribe, () => rowsHeight, () => 0);
}

/**
 * How far the rows are pushed up for offset `y` and pin progress `p`. Unpinned, the rows ride
 * with the content until both are gone; pinned, only the first row is gone (never more than
 * `y`, so no gap opens above the content). The two agree while y <= row1, which is where the
 * pin hands off to the rows riding with the content — as home's in-page row takes over there.
 */
export function headerShiftFor(y: number, p: number): number {
  "worklet";
  // A pinned tab bar stays: the rows never move further up than the rows above it.
  const attached = Math.min(y, Math.max(0, headerRowsH.value - headerPinnedH.value));
  const pinned = Math.min(y, headerRow1H.value);
  return attached - p * (attached - pinned);
}

// UI-thread tracking state of the focused page (same thresholds as home-sticky.ts).
const HIDE_AFTER = 28;
const SHOW_AFTER = 18;
const uiAnchor = makeMutable(0);
const uiLast = makeMutable(0);
const uiPinned = makeMutable(false);

/** A page takes over the bar at offset `y`: the second row shows (pinned) unless at the top. */
export function resetOverlayHeader(y: number) {
  const pinned = y > headerRow1H.value;
  uiAnchor.value = y;
  uiLast.value = y;
  uiPinned.value = pinned;
  headerY.value = y;
  headerShown.value = pinned ? 1 : 0;
}

/** Feed the focused page's clamped scroll offset (UI thread). */
export function reportOverlayScroll(y: number) {
  "worklet";
  const prev = uiLast.value;
  uiLast.value = y;
  headerY.value = y;
  let next = uiPinned.value;
  const handoff = y <= headerRow1H.value;
  if (handoff) {
    uiAnchor.value = y;
    next = false;
  } else {
    const down = y > prev;
    if ((down && uiAnchor.value > y) || (!down && uiAnchor.value < y)) uiAnchor.value = prev;
    if (down && next && y - uiAnchor.value > HIDE_AFTER) next = false;
    else if (!down && !next && uiAnchor.value - y > SHOW_AFTER) next = true;
  }
  if (next === uiPinned.value) return;
  uiPinned.value = next;
  // Home's timings: in 220ms ease-out, away 180ms ease-in. At the handoff the two positions
  // are the same, so the switch is instant there.
  headerShown.value = handoff
    ? 0
    : withTiming(next ? 1 : 0, { duration: next ? 220 : 180, easing: next ? Easing.out(Easing.cubic) : Easing.in(Easing.quad) });
}
