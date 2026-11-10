import { useLayoutEffect, useRef, type RefObject } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  isDainikkrantiTabRoute,
  isJyotishRoute,
  isLearnRoute,
  isPanchangaTabRoute,
  isVastuRoute,
} from "@/lib/app-routes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useLocale, bilingualText } from "@/i18n/locale";
import { featureIcon } from "@/lib/nav-icons";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";
import { useNavCompact } from "@/hooks/use-nav-compact";

import { tFor } from "@vedic-patro/i18n/runtime";
type Tab = {
  to: string;
  icon: LucideIcon;
  ne: string;
  en: string;
  /** Whether this tab is the active section for a given pathname. */
  match: (pathname: string) => boolean;
};

// Home · Panchanga · Kundali · Dainik Kranti · Vastu · Learn — primary
// destinations. Kept in sync with the hamburger nav in Header.tsx.
const TABS: Tab[] = [
  { to: "/", icon: featureIcon("home"), get ne() { return tFor("ne", "ui.mobile_bottom_nav.home"); }, get en() { return tFor("en", "ui.mobile_bottom_nav.home"); }, match: (p) => p === "/" },
  {
    to: "/panchanga",
    icon: featureIcon("panchanga"),
    get ne() { return tFor("ne", "learn.diagrams.hierarchy_converge"); },
    get en() { return tFor("en", "learn.diagrams.hierarchy_converge"); },
    match: isPanchangaTabRoute,
  },
  {
    to: "/kundali",
    icon: featureIcon("kundali"),
    get ne() { return tFor("ne", "nav.jyotish_kundali"); },
    get en() { return tFor("en", "nav.jyotish_kundali"); },
    match: isJyotishRoute,
  },
  {
    to: "/dainikkranti",
    icon: featureIcon("dainikkranti"),
    get ne() { return tFor("ne", "rashifal.tabs.daily"); },
    get en() { return tFor("en", "rashifal.tabs.daily"); },
    match: isDainikkrantiTabRoute,
  },
  {
    to: "/vastu",
    icon: featureIcon("vastu"),
    get ne() { return tFor("ne", "nav.vastu"); },
    get en() { return tFor("en", "nav.vastu"); },
    match: isVastuRoute,
  },
  {
    to: "/learn",
    icon: featureIcon("learn"),
    get ne() { return tFor("ne", "nav.learn"); },
    get en() { return tFor("en", "nav.learn"); },
    match: isLearnRoute,
  },
];

/**
 * Floating bottom navigation for small screens (< lg / 1024px), shown whenever
 * the desktop nav collapses into the hamburger menu so users can reach the main
 * sections without opening the drawer. Hidden at lg and up. Scrolling down folds it to its icons in a
 * narrower pill (useNavCompact); scrolling back up unfolds it.
 */
export function MobileBottomNav() {
  const { lang } = useLocale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const compact = useNavCompact();
  const barRef = useRef<HTMLDivElement>(null);
  useNavTopVariable(barRef);

  return (
    <nav
      aria-label={tFor(lang, "ui.mobile_bottom_nav.primary_navigation")}
      className={cn(shellClasses.navOuter, "fixed inset-x-0 bottom-0 z-50 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none lg:hidden")}
    >
      <div
        ref={barRef}
        data-compact={compact || undefined}
        className={cn(
          "pointer-events-auto mx-auto flex shadow-[0_6px_24px_-8px_rgba(0,0,0,0.35)] backdrop-blur-md",
          shellClasses.navBar,
          shellClasses.navBarMotion,
          compact && shellClasses.navBarCompact,
        )}
      >
        {TABS.map(({ to, icon: Icon, ne, en, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              aria-label={compact ? bilingualText(lang, ne, en) : undefined}
              className={cn(
                "flex flex-col",
                shellClasses.navItemMotion,
                compact && shellClasses.navItemCompact,
                shellClasses.navItem,
                shellClasses.navLabel,
                active
                  ? cn(shellClasses.navItemActive, shellClasses.navLabelActive)
                  : cn(shellClasses.navLabelIdle, "hover:text-foreground"),
              )}
            >
              <Icon className="size-5 shrink-0" />
              {/* leading-normal + no overflow clip so Devanagari vowel marks
                  (above/below the baseline) aren't cut off top and bottom. */}
              {/* Folds to nothing while compact (grid row 1fr → 0fr animates the height). */}
              <span
                aria-hidden={compact || undefined}
                className={cn(shellClasses.navLabelFold, compact ? shellClasses.navLabelFolded : shellClasses.navLabelOpen)}
              >
                <span className="min-h-0 overflow-hidden whitespace-nowrap leading-normal">{bilingualText(lang, ne, en)}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Writes how far the floating bar's top edge is from the bottom of the window to
 * `--bottom-nav-top` on <html>, so things docked above it (the documents audio player) sit
 * right on it with no gap: the bar folds shorter on scroll and rides the iPhone safe area,
 * so a fixed offset left a strip of page between them. Follows the fold as it animates.
 */
function useNavTopVariable(barRef: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    let frame = 0;
    const write = () => {
      frame = 0;
      const top = bar.getBoundingClientRect().top;
      // Hidden (lg and up): nothing to sit on.
      if (bar.offsetParent === null || top <= 0) root.style.removeProperty("--bottom-nav-top");
      else root.style.setProperty("--bottom-nav-top", `${Math.max(0, window.innerHeight - top)}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };
    write();
    const observer = new ResizeObserver(schedule);
    observer.observe(bar);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    // The fold animates max-width / padding; follow it to the end.
    bar.addEventListener("transitionrun", schedule);
    bar.addEventListener("transitionend", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      bar.removeEventListener("transitionrun", schedule);
      bar.removeEventListener("transitionend", schedule);
      root.style.removeProperty("--bottom-nav-top");
    };
  }, [barRef]);
}
