import { Link, useRouterState } from "@tanstack/react-router";
import { useRelatedPageLinks } from "@vedic-patro/features/common";
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarClock,
  CalendarRange,
  Compass,
  Eclipse,
  Grid3x3,
  Heart,
  HeartHandshake,
  Moon,
  MoonStar,
  Orbit,
  PartyPopper,
  Route,
  RotateCcw,
  Sparkles,
  Sprout,
  Sunrise,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { LEARN_ICONS } from "@/lib/learn/learn-library";
import { resolveSitePageId, shouldShowRelatedLinks, siteLinkRouteProps } from "@/lib/related-page-links";
import { cn } from "@vedic-patro/domain/utils";

const SITE_LINK_ICONS: Record<string, LucideIcon> = {
  panchanga: CalendarClock,
  "aakash-gochar": Orbit,
  holidays: PartyPopper,
  converter: ArrowLeftRight,
  suryakranti: Sunrise,
  "panchanga-year": CalendarRange,
  dainikkranti: Moon,
  "panchak-patro": CalendarClock,
  ritu: Sprout,
  "avakahada-chakra": Grid3x3,
  "abhijit-muhurta": Sparkles,
  kundali: Sparkles,
  "kundali-milan": Heart,
  gochar: Route,
  "graha-asta": Sunrise,
  "graha-vakri": RotateCcw,
  "chandra-grahan": MoonStar,
  "surya-grahan": Eclipse,
  rashifal: Sun,
};

function iconForLinkId(id: string): LucideIcon {
  if (id.startsWith("element:") || id.startsWith("sait:")) return HeartHandshake;
  return SITE_LINK_ICONS[id] ?? Compass;
}

function RelatedNavCard({
  label,
  description,
  icon: Icon,
  to,
  params,
  search,
}: {
  label: string;
  description?: string;
  icon: LucideIcon;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
}) {
  return (
    <Link
      to={to}
      params={params}
      search={search}
      className="group flex items-start gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 transition-colors hover:border-secondary/60 hover:bg-secondary/[0.04]"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground line-clamp-2">
            {description}
          </span>
        ) : null}
      </span>
      <ArrowRight
        className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-secondary"
        aria-hidden
      />
    </Link>
  );
}

export function RelatedPageLinks({ className }: { className?: string }) {
  const { location } = usePanchangaLocation();
  const era = useCalendarEra();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const params = useRouterState({
    select: (s) => {
      const match = s.matches[s.matches.length - 1];
      return (match?.params ?? {}) as Record<string, string>;
    },
  });

  const pageId = shouldShowRelatedLinks(pathname) ? resolveSitePageId(pathname, params) : null;
  const related = useRelatedPageLinks(pageId);
  if (related.cards.length === 0) return null;

  return (
    <aside className={cn("mt-10 border-t border-border pt-8", className)} aria-label={related.aria}>
      <div className="mb-3 flex items-center gap-2 text-secondary">
        <Compass className="size-4" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">{related.heading}</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {related.cards.map((card) => {
          if (card.kind === "learn") {
            return (
              <RelatedNavCard
                key={card.key}
                label={card.label}
                description={card.description}
                icon={LEARN_ICONS[card.icon]}
                to="/learn/$slug"
                params={{ slug: card.slug }}
              />
            );
          }
          const route = siteLinkRouteProps(card.linkId, location, era);
          return (
            <RelatedNavCard
              key={card.key}
              label={card.label}
              description={card.description}
              icon={iconForLinkId(card.linkId)}
              to={route.to}
              params={route.params}
              search={route.search}
            />
          );
        })}
      </div>
    </aside>
  );
}
