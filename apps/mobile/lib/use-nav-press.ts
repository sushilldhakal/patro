import { useCallback } from "react";
import { usePathname, useRouter } from "expo-router";
import { FLOATING_NAV, isNavActive, normalizeMobilePathname } from "@/lib/mobile-nav";
import { scrollPageToTop } from "@/lib/page-scroll";

/** Tabs that host their own stack: a sub-page sits on top of the tab's root page. */
const STACK_TABS = new Set(["/panchanga", "/kundali", "/learn", "/documents"]);

/** A floating-nav tab or a page inside one; everything else is pushed in the root stack. */
function isTabPath(path: string): boolean {
  return FLOATING_NAV.some((item) => (item.href === "/" ? path === "/" : path === item.href || path.startsWith(`${item.href}/`)));
}

/**
 * What a top-level nav button (floating nav, header logo) does when pressed.
 *
 * `router.push` on the page already showing pushed a second copy of it inside
 * the tab's stack, so the same page slid in again. Now:
 * - already on that page → scroll it to the top, no navigation;
 * - on a sub-page of that tab → back to the tab's root (pops, no push animation);
 * - anywhere else → switch to it.
 */
export function useNavPress() {
  const router = useRouter();
  const pathname = normalizeMobilePathname(usePathname());
  return useCallback(
    (href: string) => {
      const here = pathname === "/index" ? "/" : pathname;
      if (here === href) {
        scrollPageToTop(true);
        return;
      }
      if (STACK_TABS.has(href) && here.startsWith(`${href}/`)) {
        router.dismissTo(href as never);
        return;
      }
      /* On a page pushed over the tabs, a tab is back down the stack: pop to it (the
         native pop animation) rather than bringing the tabs forward over the page. */
      if (isTabPath(href) && !isTabPath(here)) {
        router.dismissTo(href as never);
        return;
      }
      /* A tab with its own stack may still hold a sub-page left there by a
         swipe-back to another tab; navigate pops it back to the tab's root
         page, where push would have stacked a second copy on top. */
      if (isNavActive(here, href) || STACK_TABS.has(href)) {
        router.navigate(href as never);
        return;
      }
      router.push(href as never);
    },
    [pathname, router],
  );
}
