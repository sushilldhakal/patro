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
  /* About 52pt per icon, after the status area at the top of the rail (~150pt) and the gaps between
     its three groups (side menu, actions, tabs: ~50pt). Erring short only sends an icon behind "…";
     erring long makes the groups overlap. */
  const slots = horizontal ? Number.POSITIVE_INFINITY : Math.max(2, Math.floor((height - 200) / 52));
  return { horizontal, slots, folded };
}

/** Every tab, in rail order. */
export const ALL_TABS = ["index", "panchanga", "kundali", "dainikkranti", "vastu", "learn"] as const;
export type TabRoute = (typeof ALL_TABS)[number];

/** Tabs the open display never shows (the side menu still reaches them): three tabs, like every phone. */
const UNFOLDED_HIDDEN: ReadonlySet<TabRoute> = new Set<TabRoute>(["kundali", "vastu", "learn"]);
/** The only tabs on the folded display's short rail. */
const FOLDED_TABS: ReadonlySet<TabRoute> = new Set<TabRoute>(["index", "panchanga"]);

/** Toolbar icons that may move into the "…" menu, most needed first. */
export const RAIL_EXTRAS = ["search", "location", "profile", "settings", "share"] as const;
export type RailExtra = (typeof RAIL_EXTRAS)[number];

/** Icons always in the rail: the side menu, "+" and "…". */
const FIXED_ICONS = 3;

export type RailPlan = {
  /** Toolbar actions shown as their own icons; the rest sit in the "…" menu. */
  extras: ReadonlySet<RailExtra>;
  /** Tabs in the tab bar. */
  tabs: ReadonlySet<TabRoute>;
  /** Tabs moved behind the "…" menu (folded only). */
  overflowTabs: readonly TabRoute[];
};

/**
 * Which items get a slot, so the rail's icons and the tab group never run into each other (iOS stacks
 * the toolbar group and the tab group in one column; when they do not fit, they overlap). The tabs are
 * placed first (folded: home and panchanga; open: up to four, kundali and vastu left out), then the
 * side menu, "+" and "…", then as many of search, place, profile, settings and share as still fit —
 * the rest go behind "…". The view menu is a text button, which iOS keeps in the top bar, not the rail.
 */
export function planRail(slots: number, folded = false): RailPlan {
  const pool = ALL_TABS.filter((t) => (folded ? FOLDED_TABS.has(t) : !UNFOLDED_HIDDEN.has(t)));
  const tabCount = folded
    ? Math.max(1, Math.min(pool.length, slots - FIXED_ICONS))
    : Math.max(2, Math.min(pool.length, slots - FIXED_ICONS - 1));
  const tabs = new Set(pool.slice(0, tabCount));
  // Portrait (horizontal bars, unlimited slots): search, "+", place and settings sit at the foot beside
  // the tabs (DuoBottomActions), so the top bar keeps only the profile; share stays behind "…".
  const extras: ReadonlySet<RailExtra> = Number.isFinite(slots)
    ? new Set(RAIL_EXTRAS.slice(0, Math.max(0, slots - FIXED_ICONS - tabs.size)))
    : new Set<RailExtra>(["profile"]);
  return {
    extras,
    tabs,
    overflowTabs: ALL_TABS.filter((t) => !tabs.has(t)).filter((t) => folded || !UNFOLDED_HIDDEN.has(t)),
  };
}
