import { useWindowDimensions } from "react-native";

/**
 * What the iPhone Duo's bars look like right now. iOS 27.1 keeps them horizontal only on the open
 * display in portrait; folded, in landscape and in Split View they sit in a vertical rail, so the
 * rail is whatever is not that. The window size is read at render time, so it follows a fold or a
 * rotation (Expo's iPhone Duo guide).
 */
export function useDuoRail(): { horizontal: boolean; slots: number; folded: boolean } {
  const { width, height } = useWindowDimensions();
  /* The open display is 669x951pt; the outer (folded) one is narrower than 560 on its short side. */
  const folded = Math.min(width, height) < 560;
  const horizontal = !folded && width >= 600 && height > width;
  /* About 50pt per icon, after the status area at the top of the rail. */
  const slots = horizontal ? Number.POSITIVE_INFINITY : Math.max(2, Math.floor((height - 150) / 50));
  return { horizontal, slots, folded };
}

/** Every tab, in rail order. */
export const ALL_TABS = ["index", "panchanga", "kundali", "dainikkranti", "vastu", "learn"] as const;
export type TabRoute = (typeof ALL_TABS)[number];

/** Tabs the open display never shows (the side menu still reaches them). */
const UNFOLDED_HIDDEN: ReadonlySet<TabRoute> = new Set<TabRoute>(["kundali", "vastu"]);
/** The only tabs on the folded display's short rail. */
const FOLDED_TABS: ReadonlySet<TabRoute> = new Set<TabRoute>(["index", "panchanga"]);

export type RailPlan = {
  /** Toolbar actions shown as their own icons; the rest sit in the "…" menu. */
  settings: boolean;
  share: boolean;
  /** Tabs in the tab bar. */
  tabs: ReadonlySet<TabRoute>;
  /** Tabs moved behind the "…" menu (folded only). */
  overflowTabs: readonly TabRoute[];
};

/**
 * Which items get a slot. Folded: home and panchanga only, the other tabs go behind "…". Open:
 * kundali and vastu are left out, the rest fit by height (least used dropped first).
 */
export function planRail(slots: number, folded = false): RailPlan {
  const settings = folded ? false : slots >= 6;
  const share = folded ? false : slots >= 7;
  if (folded) {
    return { settings, share, tabs: FOLDED_TABS, overflowTabs: ALL_TABS.filter((t) => !FOLDED_TABS.has(t)) };
  }
  const budget = Math.max(2, slots - 3 - (settings ? 1 : 0) - (share ? 1 : 0));
  const tabs = ALL_TABS.filter((t) => !UNFOLDED_HIDDEN.has(t)).slice(0, budget);
  return { settings, share, tabs: new Set(tabs), overflowTabs: [] };
}
