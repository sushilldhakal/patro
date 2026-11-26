import { useSyncExternalStore } from "react";
import { Easing, ReduceMotion, makeMutable, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { DURATION } from "@vedic-patro/ui/motion";

/**
 * The floating bottom bar's compact state, Revolut-style: scrolling a page down folds the bar to its
 * icons; scrolling back up, reaching the top or opening a new page unfolds it.
 *
 * The direction tracking runs where the scroll is (the UI thread for PageScrollView, JS for the
 * FlatLists). The fold itself is `navFold`, animated on the UI thread, so a busy JS thread (a page
 * mounting, a scroll) never stalls it and every bar on the stack shares the one value — a page
 * pushed in never mounts unfolded and then snaps. `useNavCompact` is the same state as a JS boolean.
 */
let compact = false;
const listeners = new Set<() => void>();

/** 0 = full bar, 1 = folded to its icons. */
export const navFold = makeMutable(0);
const FOLD_MS = DURATION.standard;

function animateFold(folded: boolean) {
  "worklet";
  navFold.value = withTiming(folded ? 1 : 0, {
    duration: FOLD_MS,
    easing: Easing.out(Easing.cubic),
    reduceMotion: ReduceMotion.System,
  });
}

/** JS side: the boolean and, when it flips, the fold. */
function setCompactAndFold(next: boolean) {
  if (next === compact) return;
  animateFold(next);
  setCompact(next);
}

function setCompact(next: boolean) {
  if (next === compact) return;
  compact = next;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** True while the bar should be folded to its icons. */
export function useNavCompact(): boolean {
  return useSyncExternalStore(subscribe, () => compact, () => false);
}

/** Distance scrolled one way before the bar changes (so a jitter of the finger doesn't flip it). */
const FOLD_AFTER = 28;
const UNFOLD_AFTER = 18;
/** Near the top the bar is always full. */
const TOP_ZONE = 48;

/**
 * The top bar's full height (AppHeader reports it). Hiding the bar gives the
 * page that much more room, so a page that is barely taller than the screen
 * would stop scrolling, snap back to the top and bring the bar back — over and
 * over, a flicker. So the bar only hides when the page can still scroll past
 * the top zone without it.
 */
let headerH = 0;
const uiHeaderH = makeMutable(0);
export function setNavHeaderHeight(h: number) {
  headerH = h;
  uiHeaderH.value = h;
}

/** Hiding the bar would leave this page too short to scroll (see setNavHeaderHeight). */
function tooShortToHide(maxY: number, h: number) {
  "worklet";
  return maxY - h <= TOP_ZONE + FOLD_AFTER;
}

// UI-thread copy of the tracking state (PageScrollView's scroll handler).
const uiAnchor = makeMutable(0);
const uiLast = makeMutable(0);
const uiFolded = makeMutable(false);

/**
 * Feed a page's vertical scroll offset from a Reanimated scroll handler (UI thread).
 * `maxY` is the furthest the page can scroll (content height minus viewport);
 * the offset is clamped to it, so the bounce past the end of a page — the
 * overshoot, then the spring back up — never reads as a scroll up and never
 * unfolds the bar at the bottom of a page, where the user is not scrolling up
 * at all. Pass Infinity (the default) when the limit is not known.
 */
export function reportNavScroll(y: number, maxY = Infinity) {
  "worklet";
  const cy = Math.min(Math.max(y, 0), maxY);
  const prev = uiLast.value;
  uiLast.value = cy;
  let next = uiFolded.value;
  // At the very end of the page the offset only moves because the page's room
  // changed (the bar folding shrinks how far it can scroll, and iOS pulls the
  // offset back) — not because the finger went up. Hold the state there.
  if (cy > TOP_ZONE && cy >= maxY - 2) {
    uiAnchor.value = cy;
    return;
  }
  if (cy <= TOP_ZONE || (!next && tooShortToHide(maxY, uiHeaderH.value))) {
    uiAnchor.value = cy;
    next = false;
  } else {
    const down = cy > prev;
    if ((down && uiAnchor.value > cy) || (!down && uiAnchor.value < cy)) uiAnchor.value = prev;
    if (down && !next && cy - uiAnchor.value > FOLD_AFTER) next = true;
    else if (!down && next && uiAnchor.value - cy > UNFOLD_AFTER) next = false;
  }
  if (next !== uiFolded.value) {
    uiFolded.value = next;
    animateFold(next);
    scheduleOnRN(setCompact, next);
  }
}

// JS copy, for lists that scroll with a plain onScroll (the document reader and chapter lists).
let jsAnchor = 0;
let jsLast = 0;

/** Feed a page's vertical scroll offset from a plain JS onScroll. Same clamping
    as reportNavScroll: the bounce past the end must not unfold the bar. */
export function reportNavScrollJS(y: number, maxY = Infinity) {
  const cy = Math.min(Math.max(y, 0), maxY);
  const prev = jsLast;
  jsLast = cy;
  if (cy > TOP_ZONE && cy >= maxY - 2) {
    jsAnchor = cy;
    return;
  }
  if (cy <= TOP_ZONE || (!compact && tooShortToHide(maxY, headerH))) {
    jsAnchor = cy;
    setCompactAndFold(false);
    return;
  }
  const down = cy > prev;
  if ((down && jsAnchor > cy) || (!down && jsAnchor < cy)) jsAnchor = prev;
  if (down && !compact && cy - jsAnchor > FOLD_AFTER) setCompactAndFold(true);
  else if (!down && compact && jsAnchor - cy > UNFOLD_AFTER) setCompactAndFold(false);
}

/** A new page opened: show the full bar. */
export function resetNavCompact() {
  uiAnchor.value = 0;
  uiLast.value = 0;
  uiFolded.value = false;
  jsAnchor = 0;
  jsLast = 0;
  // Always, not only on a flip: a fold the UI thread just started may not have reached JS yet.
  animateFold(false);
  setCompact(false);
}
