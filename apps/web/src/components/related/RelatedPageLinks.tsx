import { useNavigate, useRouterState } from "@tanstack/react-router";
import { RelatedPageLinks as RelatedPageLinksView, type RelatedLinkItem } from "@vedic-patro/ui/kit/shell";
import { useRelatedPageLinks } from "@vedic-patro/features/common";
import {
  CalendarHeart,
  CalendarSync,
  ChartPie,
  CalendarX,
  Leaf,
  Timer,
  CalendarClock,
  Compass,
  Eclipse,
  Grid3x3,
  Heart,
  HeartHandshake,
  Moon,
  MoonStar,
  Orbit,
  Route,
  RotateCcw,
  Sparkles,
  Sunrise,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { LEARN_ICONS } from "@/lib/learn/learn-library";
import { resolveSitePageId, shouldShowRelatedLinks, siteLinkRouteProps } from "@/lib/related-page-links";

const SITE_LINK_ICONS: Record<string, LucideIcon> = {
  panchanga: CalendarClock,
  "aakash-gochar": Orbit,
  holidays: CalendarHeart,
  converter: CalendarSync,
  suryakranti: Sunrise,
  "panchanga-year": ChartPie,
  dainikkranti: Moon,
  "panchak-patro": CalendarX,
  ritu: Leaf,
  "avakahada-chakra": Grid3x3,
  "abhijit-muhurta": Timer,
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

  const navigate = useNavigate();
  const pageId = shouldShowRelatedLinks(pathname) ? resolveSitePageId(pathname, params) : null;
  const related = useRelatedPageLinks(pageId);
  if (related.cards.length === 0) return null;

  const items: RelatedLinkItem[] = related.cards.map((card) => {
    if (card.kind === "learn") {
      const Icon = LEARN_ICONS[card.icon];
      return {
        key: card.key,
        label: card.label,
        description: card.description,
        icon: <Icon className="size-4" aria-hidden />,
        onPress: () => navigate({ to: "/learn/$slug", params: { slug: card.slug } }),
      };
    }
    const route = siteLinkRouteProps(card.linkId, location, era);
    const Icon = iconForLinkId(card.linkId);
    return {
      key: card.key,
      label: card.label,
      description: card.description,
      icon: <Icon className="size-4" aria-hidden />,
      onPress: () => navigate({ to: route.to, params: route.params, search: route.search } as never),
    };
  });

  return (
    <RelatedPageLinksView
      className={className}
      heading={related.heading}
      label={related.aria}
      headingIcon={<Compass className="size-4" aria-hidden />}
      items={items}
    />
  );
}
