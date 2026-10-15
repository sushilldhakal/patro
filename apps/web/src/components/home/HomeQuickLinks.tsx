import { Link, type LinkProps } from "@tanstack/react-router";
import { Sprout, type LucideIcon } from "lucide-react";
import { useHomeQuickLinks, type HomeQuickLink } from "@vedic-patro/features/home";
import { type ReactNode } from "react";
import { useCurrentRitu } from "@/lib/ritu-display";
import { currentPatroMonthLinkSearch, currentPatroYearLinkSearch, patroRouteLinkSearch } from "@/lib/url-state";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { cn } from "@vedic-patro/domain/utils";
import { featureIcon } from "@/lib/nav-icons";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

const QUICK_LINK_ICON_SIZE = 28;
const QUICK_LINK_ICON_STROKE = 1.75;
const NAV_DRAWER_ICON_SIZE = 28;
const NAV_DRAWER_ICON_STROKE = 1.75;

/** Phone: content-sized row chips. md+: the original square tiles. */
const quickLinkCardClass = cn(
  homeClasses.quickChip,
  "group flex w-auto shrink-0 text-left no-underline transition-[border-color,background-color,transform] duration-200 hover:border-secondary/35 hover:bg-tab-hover active:scale-[0.98] md:aspect-square md:w-[calc((100%-3rem)/5)] md:max-w-[8rem] md:flex-col md:items-center md:justify-center md:gap-3 md:rounded-2xl md:px-2.5 md:py-3.5 md:text-center md:shadow-none lg:max-w-none lg:w-[calc((100%-5.25rem)/8)]",
);

/** Flat drawer tile — 3 per row under 540px, 4 per row above. */
export const navDrawerCardClass =
  "group flex h-[6.25rem] w-[calc((100%-1.25rem)/3)] compact:w-[calc((100%-1.875rem)/4)] flex-col items-center justify-center gap-1.5 bg-transparent px-0.5 py-1 text-center no-underline shadow-none transition-colors duration-200 hover:text-secondary active:scale-[0.98] [&.active]:text-secondary";

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

export function NavDrawerLinkCard({
  label,
  icon: Icon,
  iconNode,
  className,
  onClick,
  ...linkProps
}: {
  label: string;
  icon?: LucideIcon;
  iconNode?: ReactNode;
  className?: string;
  onClick?: () => void;
} & Omit<LinkProps, "className" | "children" | "onClick">) {
  return (
    <Link
      {...linkProps}
      onClick={onClick}
      className={cn(navDrawerCardClass, className)}
      activeProps={{ className: "active" }}
    >
      <span
        className="flex size-12 items-center justify-center rounded-full bg-muted/80 group-hover:bg-secondary/10 group-[.active]:bg-secondary/15"
        aria-hidden
      >
        {iconNode ??
          (Icon ? (
            <Icon
              size={NAV_DRAWER_ICON_SIZE}
              strokeWidth={NAV_DRAWER_ICON_STROKE}
              className={cn(quickLinkIconClass, "group-hover:text-secondary group-[.active]:text-secondary")}
            />
          ) : null)}
      </span>
      <span className="w-full min-w-0 px-0.5 text-diagram-sm font-bold leading-tight text-foreground line-clamp-2 group-[.active]:text-secondary">
        {label}
      </span>
    </Link>
  );
}

function LinkCategory({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className={cn(homeClasses.quickTitle, "text-left md:text-center md:text-sm md:uppercase md:tracking-wider md:text-muted-foreground")}>
        {title}
      </h2>
      <div className={cn(homeClasses.quickRow, "gap-2 md:justify-center md:gap-3")}>{children}</div>
    </section>
  );
}

function RituQuickLink({ link, location }: { link: HomeQuickLink; location: PanchangaLocation }) {
  const era = useCalendarEra();
  const { current, loading } = useCurrentRitu(location);

  return (
    <QuickLinkCard
      to="/ritu"
      search={patroRouteLinkSearch(link.to, location, era)}
      label={link.label}
      iconNode={
        loading ? (
          <Sprout size={QUICK_LINK_ICON_SIZE} strokeWidth={QUICK_LINK_ICON_STROKE} className={quickLinkIconClass} aria-hidden />
        ) : current?.emoji ? (
          <span className="text-base leading-none" aria-hidden>
            {current.emoji}
          </span>
        ) : (
          <Sprout size={QUICK_LINK_ICON_SIZE} strokeWidth={QUICK_LINK_ICON_STROKE} className={quickLinkIconClass} aria-hidden />
        )
      }
    />
  );
}

export function HomeQuickLinks({
  location,
  className,
}: {
  location: PanchangaLocation;
  className?: string;
}) {
  const era = useCalendarEra();
  const { groups } = useHomeQuickLinks();

  const searchFor = (link: HomeQuickLink) =>
    link.search === "month"
      ? currentPatroMonthLinkSearch(location, era)
      : link.search === "year"
        ? currentPatroYearLinkSearch(location, era)
        : link.search === "route"
          ? patroRouteLinkSearch(link.to, location, era)
          : undefined;

  return (
    <div className={cn("space-y-8", className)}>
      {groups.map((group) => (
        <LinkCategory key={group.id} title={group.title}>
          {group.links.map((link) =>
            link.feature === "ritu" ? (
              <RituQuickLink key={link.to} link={link} location={location} />
            ) : (
              <QuickLinkCard
                key={link.to}
                to={link.to as LinkProps["to"]}
                search={searchFor(link) as LinkProps["search"]}
                icon={featureIcon(link.feature)}
                label={link.label}
              />
            ),
          )}
        </LinkCategory>
      ))}
    </div>
  );
}
