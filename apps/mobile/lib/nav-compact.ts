import { makeMutable, type SharedValue } from "react-native-reanimated";

/**
 * The floating bottom bar's compact state, Revolut-style: scrolling a page down folds the bar to its
 * icons (no labels, a slimmer pill); scrolling back up, or reaching the top, unfolds it. 0 = full,
 * 1 = compact. Written on the UI thread by every page scroll (PageScrollView, the panchanga shell),
 * read by FloatingNavBar's animated styles — no JS work while the finger moves.
 */
export const navCompact: SharedValue<number> = makeMutable(0);

/** Where the last direction change happened, and the last offset seen. */
const anchorY = makeMutable(0);
const lastY = makeMutable(0);

/** Distance scrolled one way before the bar changes (so a jitter of the finger doesn't flip it). */
const FOLD_AFTER = 28;
const UNFOLD_AFTER = 18;
/** Near the top the bar is always full. */
const TOP_ZONE = 48;

/** Feed a page's vertical scroll offset (UI thread). */
export function reportNavScroll(y: number) {
  "worklet";
  const prev = lastY.value;
  lastY.value = y;
  if (y <= TOP_ZONE) {
    anchorY.value = y;
    if (navCompact.value !== 0) navCompact.value = 0;
    return;
  }
  const down = y > prev;
  // A turn of direction moves the anchor; the bar changes once the finger has gone far enough past it.
  if ((down && anchorY.value > y) || (!down && anchorY.value < y)) anchorY.value = prev;
  if (down && navCompact.value === 0 && y - anchorY.value > FOLD_AFTER) navCompact.value = 1;
  else if (!down && navCompact.value === 1 && anchorY.value - y > UNFOLD_AFTER) navCompact.value = 0;
}

/** A new page opened: show the full bar. */
export function resetNavCompact() {
  navCompact.value = 0;
  anchorY.value = 0;
  lastY.value = 0;
}
