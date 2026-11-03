import { useCallback, useSyncExternalStore } from "react";
import { usePathname } from "expo-router";
import type { HomePatroView } from "@/components/home/PatroViewToggle";
import { useLocale } from "@/lib/i18n";
import { normalizeMobilePathname } from "@/lib/mobile-nav";
import { useNavPress } from "@/lib/use-nav-press";

/**
 * How home draws the month (the BS calendar or the panchanga grid). It lives here, not in the home
 * screen's state, so the view menu in the header and the iPhone Duo toolbar can switch it from any page.
 */
let homeView: HomePatroView = "calendar";
const listeners = new Set<() => void>();

export function setHomePatroView(next: HomePatroView) {
  if (next === homeView) return;
  homeView = next;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useHomePatroView(): [HomePatroView, (next: HomePatroView) => void] {
  const view = useSyncExternalStore(subscribe, () => homeView);
  return [view, setHomePatroView];
}

export type PatroViewOption = {
  key: "calendar" | "panchanga" | "daily";
  label: string;
  /** SF Symbol for the iPhone Duo's native menu. */
  sf: "calendar" | "square.grid.3x3" | "sun.max";
  /** Ionicon for the header's menu on every other phone. */
  ion: "calendar-outline" | "moon-outline" | "sunny-outline";
  active: boolean;
  onPress: () => void;
};

/**
 * The header's view menu, like Apple Calendar's Single Day / Multi Day / List: home's month as the
 * BS calendar, home's month as the panchanga grid, or the daily panchanga page. The one being looked
 * at is ticked.
 */
export function usePatroViewOptions(): PatroViewOption[] {
  const { t } = useLocale();
  const navPress = useNavPress();
  const pathname = normalizeMobilePathname(usePathname());
  const [view] = useHomePatroView();
  const daily = pathname === "/panchanga";
  const home = pathname === "/" || pathname === "/index";

  const openHome = useCallback(
    (next: HomePatroView) => {
      setHomePatroView(next);
      if (!home) navPress("/");
    },
    [home, navPress],
  );

  return [
    {
      key: "calendar",
      label: t("ui.view_menu.monthly_bs"),
      sf: "calendar",
      ion: "calendar-outline",
      active: !daily && view === "calendar",
      onPress: () => openHome("calendar"),
    },
    {
      key: "panchanga",
      label: t("ui.view_menu.monthly_panchanga"),
      sf: "square.grid.3x3",
      // Not a grid: that is the side menu's button.
      ion: "moon-outline",
      active: !daily && view === "panchanga",
      onPress: () => openHome("panchanga"),
    },
    {
      key: "daily",
      label: t("ui.view_menu.daily_panchanga"),
      sf: "sun.max",
      ion: "sunny-outline",
      active: daily,
      onPress: () => {
        if (!daily) navPress("/panchanga");
      },
    },
  ];
}
