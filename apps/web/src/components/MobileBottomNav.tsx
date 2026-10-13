import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  isDainikkrantiTabRoute,
  isJyotishRoute,
  isLearnRoute,
  isPanchangaTabRoute,
  isVastuRoute,
} from "@/lib/app-routes";
import { cn } from "@vedic-patro/domain/utils";
import { useLocale, bilingualText } from "@/i18n/locale";
import { featureIcon } from "@/lib/nav-icons";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";

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
  { to: "/", icon: featureIcon("home"), ne: "गृह", en: "Home", match: (p) => p === "/" },
  {
    to: "/panchanga",
    icon: featureIcon("panchanga"),
    ne: "पञ्चाङ्ग",
    en: "Panchanga",
    match: isPanchangaTabRoute,
  },
  {
    to: "/kundali",
    icon: featureIcon("kundali"),
    ne: "कुण्डली",
    en: "Kundali",
    match: isJyotishRoute,
  },
  {
    to: "/dainikkranti",
    icon: featureIcon("dainikkranti"),
    ne: "दैनिक",
    en: "Daily",
    match: isDainikkrantiTabRoute,
  },
  {
    to: "/vastu",
    icon: featureIcon("vastu"),
    ne: "वास्तु",
    en: "Vastu",
    match: isVastuRoute,
  },
  {
    to: "/learn",
    icon: featureIcon("learn"),
    ne: "सिकाइ",
    en: "Learn",
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
      aria-label={bilingualText(lang, "मुख्य नेभिगेसन", "Primary navigation")}
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
