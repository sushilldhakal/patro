import { useNavigate, useRouterState } from "@tanstack/react-router";
import { RelatedPageLinks as RelatedPageLinksView, type RelatedLinkItem } from "@vedic-patro/ui/kit/shell";
import { useRelatedPageLinks } from "@vedic-patro/features/common";
import { Compass, type LucideIcon } from "lucide-react";
import { resolveNavIcon, type NavIconName } from "@vedic-patro/icons";
import { NAV_ICONS } from "@/lib/nav-icons";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { LEARN_ICONS } from "@/lib/learn/learn-library";
import { resolveSitePageId, shouldShowRelatedLinks, siteLinkRouteProps } from "@/lib/related-page-links";

/** Same icons the navigation draws (@vedic-patro/icons), keyed by related-link id. */
const SITE_LINK_ICONS: Record<string, NavIconName> = {
  panchanga: "scroll-text",
  "aakash-gochar": "orbit",
  holidays: "calendar-heart",
  converter: "calendar-sync",
  suryakranti: "sunrise",
  "panchanga-year": "chart-pie",
  dainikkranti: "moon",
  "panchak-patro": "calendar-x",
  "adhik-maas": "calendar-plus",
  ritu: "leaf",
  "avakahada-chakra": "grid-3x3",
  "abhijit-muhurta": "timer",
  kundali: "sparkles",
  "kundali-milan": "heart",
  gochar: "route",
  "graha-asta": "eye-off",
  "graha-vakri": "rotate-ccw",
  "chandra-grahan": "sun-moon",
  "surya-grahan": "eclipse",
  rashifal: "sun",
};

function iconForLinkId(id: string): LucideIcon {
  if (id.startsWith("element:")) return NAV_ICONS[resolveNavIcon("tables", id.slice("element:".length))];
  if (id.startsWith("sait:")) return NAV_ICONS[resolveNavIcon("sait", id.slice("sait:".length))];
  return NAV_ICONS[SITE_LINK_ICONS[id] ?? "compass"];
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
