import { useSyncExternalStore } from "react";
import { makeMutable } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/**
 * The home screen's sticky second row, same pattern as the floating bar's
 * compact state in nav-compact.ts: the scroll offset is tracked where the
 * scroll is (the UI thread, in PageScrollView's scroll handler) and the header
 * only hears about a flip, as a plain JS boolean. No Reanimated view owns the
 * header — Reanimated views lose their layout styles on iOS (see
 * nav-compact.ts), which is why the first sticky attempt never showed.
 *
 * The row shows only while scrolling up, and hides while scrolling down — the
 * same behaviour as the bottom bar folding. It lands exactly where the in-page
 * second row sits: the in-page row's top edge reaches the top of the safe area
 * (just under the status bar) at 72px of scroll, so the pinned row only ever
 * appears past that point, and only on the way back up — the two rows meet at
 * the same spot, so the handoff is seamless and the pinned row never stops
 * short of its place.
 *
 * The aside's three tabs (panchanga / sait / daily muhurta) pin the same way,
 * further down the page: once the tabs have scrolled past the safe area they
 * stay pinned while the tab content is read, and the second row steps aside
 * for them — the sticky header is whichever section the page is in.
 *
 * The flags are only live while the home screen is mounted: the home screen
 * turns them on when it mounts and off when it leaves, so scrolling another
 * page can never leave a header stuck on a page that has none.
 */
let stuck = false;
let hideInstant = false;
const listeners = new Set<() => void>();

/** `instant`: the row hides because the in-page row (or the pinned tabs) took
    its place, so it must vanish on the spot instead of sliding over them. */
function setStuck(next: boolean, instant = false) {
  if (next === stuck) return;
  stuck = next;
  hideInstant = !next && instant;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Whether the last hide was a handoff (vanish at once) rather than a scroll down (slide away). */
export function homeHideIsInstant(): boolean {
  return hideInstant;
}

/** True while the second row should sit pinned at the top of the screen. */
export function useHomeStuck(): boolean {
  return useSyncExternalStore(subscribe, () => stuck, () => false);
}

let tabsStuck = false;
const tabsListeners = new Set<() => void>();

function setTabsStuck(next: boolean) {
  if (next === tabsStuck) return;
  tabsStuck = next;
  tabsListeners.forEach((fn) => fn());
}

function subscribeTabs(fn: () => void) {
  tabsListeners.add(fn);
  return () => {
    tabsListeners.delete(fn);
  };
}

/** True while the aside's three tabs should sit pinned at the top of the screen. */
export function useTabsStuck(): boolean {
  return useSyncExternalStore(subscribeTabs, () => tabsStuck, () => false);
}

// UI-thread copy of the tracking state (PageScrollView's scroll handler).
const uiStuck = makeMutable(false);
const uiActive = makeMutable(false);
const uiAnchor = makeMutable(0);
const uiLast = makeMutable(0);
/** Scroll offset at which the aside tabs' top edge reaches the safe area. 0 = not measured yet. */
const uiTabsTop = makeMutable(0);
const uiTabsStuck = makeMutable(false);

/** The home screen mounts: start tracking its scroll, from the top. */
export function setHomeStickyActive(on: boolean) {
  uiActive.value = on;
  uiAnchor.value = 0;
  uiLast.value = 0;
  uiTabsTop.value = 0;
  if (uiStuck.value) {
    uiStuck.value = false;
    setStuck(false, true);
  }
  if (uiTabsStuck.value) {
    uiTabsStuck.value = false;
    setTabsStuck(false);
  }
}

/**
 * The aside tabs' top edge in the scroll content, minus the safe-area inset —
 * the scroll offset at which the tabs reach the top of the screen. Reported by
 * the aside (it measures its own tab bar); 0 clears it (not measured yet).
 */
export function setHomeTabsTop(top: number) {
  uiTabsTop.value = top > 0 ? top : 0;
}

/**
 * Feed a page's vertical scroll offset from a Reanimated scroll handler (UI
 * thread). The in-page second row's top edge reaches the top of the safe area
 * at 72px of scroll (12px page padding + the first row's height, less the
 * safe-area inset it already carries); at or above that the pinned row stays
 * hidden (the in-page row is still there, in the same place). Past it,
 * scrolling down hides the pinned row and scrolling up shows it, after a short
 * run each way so a jitter of the finger doesn't flip it.
 *
 * The aside tabs pin once they reach the safe area and stay pinned while the
 * tab content below them is read; while they are pinned the second row stays
 * hidden, so the sticky header is the section the page is in.
 */
const TOP_ZONE = 72;
const HIDE_AFTER = 28;
const SHOW_AFTER = 18;

/** Feed a page's vertical scroll offset from a Reanimated scroll handler (UI thread).
 * `maxY` is the furthest the page can scroll; the offset is clamped to it, so
 * the bounce past the end of the page — the overshoot, then the spring back
 * up — never reads as a scroll up and never shows the sticky row at the
 * bottom of the page, where the user is not scrolling up at all. */
export function reportHomeScroll(y: number, maxY = Infinity) {
  "worklet";
  if (!uiActive.value) return;
  const cy = Math.min(Math.max(y, 0), maxY);
  const prev = uiLast.value;
  uiLast.value = cy;
  // The tabs pin as soon as they reach the safe area and stay pinned below it.
  const nextTabs = uiTabsTop.value > 0 && cy > uiTabsTop.value;
  if (nextTabs !== uiTabsStuck.value) {
    uiTabsStuck.value = nextTabs;
    scheduleOnRN(setTabsStuck, nextTabs);
  }
  let next = uiStuck.value;
  const handoff = cy <= TOP_ZONE || nextTabs;
  if (handoff) {
    uiAnchor.value = cy;
    next = false;
  } else {
    const down = cy > prev;
    if ((down && uiAnchor.value > cy) || (!down && uiAnchor.value < cy)) uiAnchor.value = prev;
    if (down && next && cy - uiAnchor.value > HIDE_AFTER) next = false;
    else if (!down && !next && uiAnchor.value - cy > SHOW_AFTER) next = true;
  }
  if (next !== uiStuck.value) {
    uiStuck.value = next;
    scheduleOnRN(setStuck, next, handoff);
  }
}
