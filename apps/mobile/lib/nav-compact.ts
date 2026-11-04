import { useSyncExternalStore } from "react";
import { makeMutable } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/**
 * The floating bottom bar's compact state, Revolut-style: scrolling a page down folds the bar to its
 * icons; scrolling back up, reaching the top or opening a new page unfolds it.
 *
 * The direction tracking runs where the scroll is (the UI thread for PageScrollView, JS for the
 * FlatLists), but the bar only hears about a flip, as a plain JS boolean. The bar itself animates
 * with React Native's own Animated on plain Views: Reanimated's views lost their layout styles on
 * iOS (the pill went narrow and the tabs stacked in a column).
 */
let compact = false;
const listeners = new Set<() => void>();

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

// UI-thread copy of the tracking state (PageScrollView's scroll handler).
const uiAnchor = makeMutable(0);
const uiLast = makeMutable(0);
const uiFolded = makeMutable(false);

/** Feed a page's vertical scroll offset from a Reanimated scroll handler (UI thread). */
export function reportNavScroll(y: number) {
  "worklet";
  const prev = uiLast.value;
  uiLast.value = y;
  let next = uiFolded.value;
  if (y <= TOP_ZONE) {
    uiAnchor.value = y;
    next = false;
  } else {
    const down = y > prev;
    if ((down && uiAnchor.value > y) || (!down && uiAnchor.value < y)) uiAnchor.value = prev;
    if (down && !next && y - uiAnchor.value > FOLD_AFTER) next = true;
    else if (!down && next && uiAnchor.value - y > UNFOLD_AFTER) next = false;
  }
  if (next !== uiFolded.value) {
    uiFolded.value = next;
    scheduleOnRN(setCompact, next);
  }
}

// JS copy, for lists that scroll with a plain onScroll (the document reader and chapter lists).
let jsAnchor = 0;
let jsLast = 0;

/** Feed a page's vertical scroll offset from a plain JS onScroll. */
export function reportNavScrollJS(y: number) {
  const prev = jsLast;
  jsLast = y;
  if (y <= TOP_ZONE) {
    jsAnchor = y;
    setCompact(false);
    return;
  }
  const down = y > prev;
  if ((down && jsAnchor > y) || (!down && jsAnchor < y)) jsAnchor = prev;
  if (down && !compact && y - jsAnchor > FOLD_AFTER) setCompact(true);
  else if (!down && compact && jsAnchor - y > UNFOLD_AFTER) setCompact(false);
}

/** A new page opened: show the full bar. */
export function resetNavCompact() {
  uiAnchor.value = 0;
  uiLast.value = 0;
  uiFolded.value = false;
  jsAnchor = 0;
  jsLast = 0;
  setCompact(false);
}
