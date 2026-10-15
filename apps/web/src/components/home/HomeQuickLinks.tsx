import { Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { Sprout, type LucideIcon } from "lucide-react";
import { useHomeQuickLinks, type HomeQuickLink } from "@vedic-patro/features/home";
import { HomeQuickLinks as HomeQuickLinksView, type HomeQuickLinkGroup } from "@vedic-patro/ui/kit/shell";
import { createElement, type ReactNode } from "react";
import { useCurrentRitu } from "@/lib/ritu-display";
import { currentPatroMonthLinkSearch, currentPatroYearLinkSearch, patroRouteLinkSearch } from "@/lib/url-state";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { cn } from "@vedic-patro/domain/utils";
import { featureIcon } from "@/lib/nav-icons";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

const QUICK_LINK_ICON_SIZE = 28;
const QUICK_LINK_ICON_STROKE = 1.75;
/** Phone: content-sized row chips. md+: the original square tiles. */
const quickLinkCardClass = cn(
  homeClasses.quickChip,
  "group flex w-auto shrink-0 text-left no-underline transition-[border-color,background-color,transform] duration-200 hover:border-secondary/35 hover:bg-tab-hover active:scale-[0.98] md:aspect-square md:w-[calc((100%-3rem)/5)] md:max-w-[8rem] md:flex-col md:items-center md:justify-center md:gap-3 md:rounded-2xl md:px-2.5 md:py-3.5 md:text-center md:shadow-none lg:max-w-none lg:w-[calc((100%-5.25rem)/8)]",
);

/** Flat drawer tile — 3 per row under 540px, 4 per row above. */
export const quickLinkIconClass = "shrink-0 text-danger dark:text-danger";

export function QuickLinkCard({
  label,
  description,
  icon: Icon,
  iconNode,
  ...linkProps
}: {
  label: string;
  description?: string;
  icon?: LucideIcon;
  iconNode?: ReactNode;
} & Omit<LinkProps, "className" | "children">) {
  return (
    <Link {...linkProps} className={quickLinkCardClass}>
      <span className="inline-flex shrink-0 items-center justify-center max-md:[&_svg]:size-5">
        {iconNode ??
          (Icon ? (
            <Icon
              size={QUICK_LINK_ICON_SIZE}
              strokeWidth={QUICK_LINK_ICON_STROKE}
              className={quickLinkIconClass}
              aria-hidden
            />
          ) : null)}
      </span>
      <span className={cn(homeClasses.quickLabel, "min-w-0 px-0.5 line-clamp-1 md:line-clamp-2 md:w-full")}>
        {label}
      </span>
      {description ? (
        <span className="hidden w-full min-w-0 text-xs leading-snug text-muted-foreground line-clamp-2 md:block">
          {description}
        </span>
      ) : null}
    </Link>
  );
}

function RituIcon({ location }: { location: PanchangaLocation }) {
  const { current, loading } = useCurrentRitu(location);
  if (!loading && current?.emoji) {
    return (
      <span className="text-base leading-none" aria-hidden>
        {current.emoji}
      </span>
    );
  }
  return <Sprout size={QUICK_LINK_ICON_SIZE} strokeWidth={QUICK_LINK_ICON_STROKE} className={quickLinkIconClass} aria-hidden />;
}

function FeatureIcon({ feature }: { feature: HomeQuickLink["feature"] }) {
  return createElement(featureIcon(feature), {
    size: QUICK_LINK_ICON_SIZE,
    strokeWidth: QUICK_LINK_ICON_STROKE,
    className: quickLinkIconClass,
    "aria-hidden": true,
  });
}

/** Shortcut tiles. The drawing is `@vedic-patro/ui/kit/shell`; this file supplies the route and the icon. */
export function HomeQuickLinks({ location, className }: { location: PanchangaLocation; className?: string }) {
  const era = useCalendarEra();
  const navigate = useNavigate();
  const { groups } = useHomeQuickLinks();

  const searchFor = (link: HomeQuickLink) =>
    link.search === "month"
      ? currentPatroMonthLinkSearch(location, era)
      : link.search === "year"
        ? currentPatroYearLinkSearch(location, era)
        : link.search === "route"
          ? patroRouteLinkSearch(link.to, location, era)
          : undefined;

  const viewGroups: HomeQuickLinkGroup[] = groups.map((group) => ({
    id: group.id,
    title: group.title,
    items: group.links.map((link) => ({
      key: link.to,
      label: link.label,
      icon: link.feature === "ritu" ? <RituIcon location={location} /> : <FeatureIcon feature={link.feature} />,
      onPress: () => navigate({ to: link.to as LinkProps["to"], search: searchFor(link) as LinkProps["search"] }),
    })),
  }));

  return <HomeQuickLinksView groups={viewGroups} className={className} />;
}
