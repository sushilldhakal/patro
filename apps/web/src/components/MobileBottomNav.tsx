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
 * sections without opening the drawer. Hidden at lg and up.
 */
export function MobileBottomNav() {
  const { lang } = useLocale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label={tFor(lang, "ui.mobile_bottom_nav.primary_navigation")}
      className={cn(shellClasses.navOuter, "fixed inset-x-0 bottom-0 z-50 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none lg:hidden")}
    >
      <div className={cn("pointer-events-auto mx-auto flex shadow-[0_6px_24px_-8px_rgba(0,0,0,0.35)] backdrop-blur-md", shellClasses.navBar)}>
        {TABS.map(({ to, icon: Icon, ne, en, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col transition-colors",
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
              <span className="max-w-full whitespace-nowrap leading-normal">{bilingualText(lang, ne, en)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
