import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type MobileNavIcon = ComponentProps<typeof Ionicons>["name"];

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
  { href: "/", ne: "गृह", en: "Home", icon: "home-outline" as MobileNavIcon },
  { href: "/panchanga", ne: "पञ्चाङ्ग", en: "Panchanga", icon: "sunny-outline" as MobileNavIcon },
  { href: "/kundali", ne: "कुण्डली", en: "Kundali", icon: "sparkles-outline" as MobileNavIcon },
  { href: "/dainikkranti", ne: "दैनिक", en: "Transit", icon: "moon-outline" as MobileNavIcon },
  { href: "/vastu", ne: "वास्तु", en: "Vastu", icon: "compass-outline" as MobileNavIcon },
  { href: "/learn", ne: "सिकाइ", en: "Learn", icon: "book-outline" as MobileNavIcon },
] as const;

/** Secondary links — header drawer only. */
export const DRAWER_NAV_EXTRA = [
  { href: "/holidays", ne: "बिदा तथा पर्व", en: "Holidays", icon: "flag-outline" as MobileNavIcon },
  { href: "/converter", ne: "रूपान्तरण", en: "Converter", icon: "swap-horizontal-outline" as MobileNavIcon },
  { href: "/more", ne: "थप", en: "More", icon: "ellipsis-horizontal-outline" as MobileNavIcon },
] as const;

export const FLOATING_NAV_BOTTOM_PADDING = 84;

/** Scroll bottom inset on tablet — keep in sync with `floatingNavTabBarHeight`. */
export const FLOATING_NAV_BOTTOM_PADDING_TABLET = 96;

/**
 * Total height of the tab bar slot (pill + bottom inset).
 * Keep in sync with `FloatingNavBar` padding and pill size.
 */
export function floatingNavTabBarHeight(isTablet: boolean, safeBottom: number): number {
  const pill = isTablet ? 56 : 50;
  const minBottom = isTablet ? 10 : 6;
  return pill + Math.max(safeBottom, minBottom);
}

/** Bottom inset for scroll content — scales slightly on tablet. */
export function floatingNavBottomPadding(isTablet: boolean): number {
  return isTablet ? FLOATING_NAV_BOTTOM_PADDING_TABLET : FLOATING_NAV_BOTTOM_PADDING;
}

/** Standard left/right inset for page scroll content and headers. */
export const PAGE_HORIZONTAL_PADDING = 15;

/** Home header/aside inset on phone — matches web `max-md` rail (`calc(100% - 2rem)`). */
export const HOME_PHONE_INSET = 16;

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
