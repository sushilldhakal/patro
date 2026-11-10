import { FEATURE_ICON } from "@vedic-patro/icons";
import { useDuoRail } from "@/lib/duo-rail";
import { tFor } from "@vedic-patro/i18n/runtime";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDuoPushedPage } from "@/lib/duo-page-context";
import { IS_IPHONE_DUO } from "@/lib/iphone-duo";

/**
 * Primary floating bottom nav — matches web header sections, सिकाइ last.
 *
 * Labels here are the short forms, not the page titles: six tabs share the
 * pill, so "सूर्य पञ्चाङ्ग" and "दैनिक क्रान्ति" were already arriving as
 * "पञ्चाङ्ग" and "दैनिक क्रा…" once the ellipsis had done its work. Naming
 * them short says the same thing without the truncation, and matches the web
 * bottom nav, which has always used these.
 */
export const FLOATING_NAV = [
  { href: "/", get ne() { return tFor("ne", "ui.mobile_bottom_nav.home"); }, get en() { return tFor("en", "ui.mobile_bottom_nav.home"); }, icon: FEATURE_ICON.home },
  { href: "/panchanga", get ne() { return tFor("ne", "learn.diagrams.hierarchy_converge"); }, get en() { return tFor("en", "learn.diagrams.hierarchy_converge"); }, icon: FEATURE_ICON.panchanga },
  { href: "/kundali", get ne() { return tFor("ne", "nav.jyotish_kundali"); }, get en() { return tFor("en", "nav.jyotish_kundali"); }, icon: FEATURE_ICON.kundali },
  { href: "/dainikkranti", get ne() { return tFor("ne", "ui.mobile_nav.transit"); }, get en() { return tFor("en", "ui.mobile_nav.transit"); }, icon: FEATURE_ICON.dainikkranti },
  { href: "/vastu", get ne() { return tFor("ne", "nav.vastu"); }, get en() { return tFor("en", "nav.vastu"); }, icon: FEATURE_ICON.vastu },
  { href: "/learn", get ne() { return tFor("ne", "nav.learn"); }, get en() { return tFor("en", "nav.learn"); }, icon: FEATURE_ICON.learn },
] as const;

export const FLOATING_NAV_BOTTOM_PADDING = 100;

/** Scroll bottom inset on tablet — keep in sync with `floatingNavTabBarHeight`. */
export const FLOATING_NAV_BOTTOM_PADDING_TABLET = 104;

/**
 * Total height of the tab bar slot (pill + bottom inset).
 * Keep in sync with `FloatingNavBar` padding and pill size.
 */
/** How much shorter the floating bar gets when it folds to its icons on scroll (60pt → 46pt). */
export const FLOATING_NAV_FOLD_SHRINK = 14;

export function floatingNavTabBarHeight(isTablet: boolean, safeBottom: number): number {
  const pill = 60; // FloatingNavBar: 60pt full
  const minBottom = isTablet ? 10 : 6;
  return pill + Math.max(safeBottom, minBottom);
}

/** Bottom inset for scroll content — scales slightly on tablet. */
export function floatingNavBottomPadding(isTablet: boolean): number {
  return isTablet ? FLOATING_NAV_BOTTOM_PADDING_TABLET : FLOATING_NAV_BOTTOM_PADDING;
}

/**
 * Bottom padding that keeps scroll content clear of the nav. Everywhere but the iPhone Duo the floating
 * bar is ours, so a fixed height. On the Duo the bars are the system's: a tab scene gets the tab bar's
 * inset from iOS itself, so only a gutter is left to add; a page pushed over the tabs gets none, so it
 * clears the bottom safe area. Nothing here is a fixed bar height, which would double up in the rail
 * poses (landscape, folded) where the bar is not at the bottom (Expo's iPhone Duo guide).
 */
export function useNavBottomPadding(isTablet: boolean): number {
  const { bottom } = useSafeAreaInsets();
  const pushed = useDuoPushedPage();
  const { horizontal } = useDuoRail();
  // The app's bottom bar: every phone, and the iPhone Duo in portrait.
  if (!IS_IPHONE_DUO || horizontal) return floatingNavBottomPadding(isTablet);
  return pushed ? bottom + PAGE_HORIZONTAL_PADDING : PAGE_HORIZONTAL_PADDING;
}

/** Page inset. Matches the website: `px-4` (16) and `sm:px-6` (24). */
export const PAGE_HORIZONTAL_PADDING = 16;
export const PAGE_HORIZONTAL_PADDING_WIDE = 24;
/** Website `PageShell` / page top: `py-8`. */
export const PAGE_PADDING_Y = 32;

/**
 * Gap between the app header and the first thing on a page. One value for every
 * screen (home and the daily panchanga set it), so page headers sit at the same
 * height wherever you navigate: 12 on phones, 16 from 768 up.
 */
export function pageTopPadding(isCompact: boolean): number {
  return isCompact ? 12 : 16;
}

/** Home month rail on a phone — website `calc(100% - 2rem)`. */
export const HOME_PHONE_INSET = 16;

/** Home cards and the panchanga aside on a phone — website `max-sm:mx-2.5`. */
export const HOME_CARD_INSET = 10;

export function homeContentInset(isPhone: boolean): number {
  return isPhone ? HOME_PHONE_INSET : PAGE_HORIZONTAL_PADDING;
}

/** Panchanga main + sidebar split — matches web `xl:grid-cols-[1fr_330px]` (1280px). */
export const PANCHANGA_SIDEBAR_SPLIT = 1280;
export const PANCHANGA_SIDEBAR_WIDTH = 330;

/** Panchanga / kundali left rail — matches web `min-[992px]` sidebar. */
export const PANCHANGA_SIDEBAR_MIN_WIDTH = 992;

/** @deprecated use PANCHANGA_SIDEBAR_MIN_WIDTH */
export const KUNDALI_SIDEBAR_SPLIT = PANCHANGA_SIDEBAR_MIN_WIDTH;

/** Normalize expo-router pathnames (strip group segments like `/(tabs)`). */
export function normalizeMobilePathname(pathname: string): string {
  const normalized = pathname.replace(/\/\([^/]+\)/g, "");
  return normalized.length > 0 ? normalized : "/";
}

export function isNavActive(pathname: string, href: string): boolean {
  pathname = normalizeMobilePathname(pathname);
  if (href === "/") return pathname === "/" || pathname === "/index";
  if (href === "/kundali") {
    return (
      pathname === "/kundali" ||
      pathname.startsWith("/kundali/") ||
      pathname === "/kundali-milan" ||
      pathname === "/jyotish/kundali-milan" ||
      pathname === "/rashifal" ||
      pathname === "/jyotish/rashifal"
    );
  }
  if (href === "/learn") {
    return pathname === "/learn" || pathname.startsWith("/learn/");
  }
  if (href === "/panchanga") {
    return pathname === "/panchanga" || pathname.startsWith("/panchanga/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
