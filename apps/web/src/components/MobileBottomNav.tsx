import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Star, Sparkles, Moon, Compass, BookOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  isDainikkrantiTabRoute,
  isJyotishRoute,
  isLearnRoute,
  isPanchangaTabRoute,
  isVastuRoute,
} from "@/lib/app-routes";
import { cn } from "@/lib/utils";
import { useLocale, bilingualText } from "@/i18n/locale";

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
  { to: "/", icon: Home, ne: "गृह", en: "Home", match: (p) => p === "/" },
  {
    to: "/panchanga",
    icon: Star,
    ne: "पञ्चाङ्ग",
    en: "Panchanga",
    match: isPanchangaTabRoute,
  },
  {
    to: "/kundali",
    icon: Sparkles,
    ne: "कुण्डली",
    en: "Kundali",
    match: isJyotishRoute,
  },
  {
    to: "/dainikkranti",
    icon: Moon,
    ne: "दैनिक",
    en: "Daily",
    match: isDainikkrantiTabRoute,
  },
  {
    to: "/vastu",
    icon: Compass,
    ne: "वास्तु",
    en: "Vastu",
    match: isVastuRoute,
  },
  {
    to: "/learn",
    icon: BookOpen,
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
      className="fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none lg:hidden"
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg items-stretch justify-around gap-0.5 rounded-2xl border border-border bg-background/90 p-1 shadow-[0_6px_24px_-8px_rgba(0,0,0,0.35)] backdrop-blur-md">
        {TABS.map(({ to, icon: Icon, ne, en, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[0.62rem] font-medium transition-colors",
                active
                  ? "bg-secondary/10 text-secondary"
                  : "text-muted-foreground hover:text-foreground",
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
