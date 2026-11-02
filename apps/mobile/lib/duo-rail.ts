import { useWindowDimensions } from "react-native";

/**
 * What the iPhone Duo's bars look like right now. iOS 27.1 keeps them horizontal only on the open
 * display in portrait; folded, in landscape and in Split View they sit in a vertical rail, so the
 * rail is whatever is not that. The window size is read at render time, so it follows a fold or a
 * rotation (Expo's iPhone Duo guide).
 */
export function useDuoRail(): { horizontal: boolean; slots: number } {
  const { width, height } = useWindowDimensions();
  const horizontal = width >= 600 && height > width;
  /* About 50pt per icon, after the status area at the top of the rail. */
  const slots = horizontal ? Number.POSITIVE_INFINITY : Math.max(2, Math.floor((height - 150) / 50));
  return { horizontal, slots };
}

export type RailPlan = {
  /** Toolbar actions shown as their own icons; the rest sit in the "…" menu. */
  settings: boolean;
  share: boolean;
  /** Tab destinations kept in the tab bar; the others are hidden (the side menu still reaches them). */
  tabs: ReadonlySet<string>;
};

/**
 * Which items get a slot, most important first: dashboard, profile and the "…" menu, then the main
 * tabs, then settings and share, then vastu and learn last. With `tabsInBar` false (a page pushed
 * over the tabs) there is no tab bar, so only the toolbar items compete for slots.
 */
export function planRail(slots: number, tabsInBar: boolean): RailPlan {
  const order = ["dashboard", "profile", "more", "index", "panchanga", "kundali", "dainikkranti", "settings", "share", "vastu", "learn"];
  const taken = new Set<string>();
  for (const item of order) {
    const isTab = ["index", "panchanga", "kundali", "dainikkranti", "vastu", "learn"].includes(item);
    if (isTab && !tabsInBar) continue;
    if (taken.size < slots || item === "dashboard" || item === "more") taken.add(item);
  }
  return {
    settings: taken.has("settings"),
    share: taken.has("share"),
    tabs: new Set(["index", "panchanga", "kundali", "dainikkranti", "vastu", "learn"].filter((t) => taken.has(t))),
  };
}
