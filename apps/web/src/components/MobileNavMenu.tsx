import type { LinkProps } from "@tanstack/react-router";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { DrawerClose } from "@/components/ui/drawer";
import { NavDrawerLinkCard } from "@/components/home/HomeQuickLinks";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { parseEraFromUrl } from "@vedic-patro/domain/era";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useCurrentRitu } from "@/lib/ritu-display";
import { resolveSidebarLinkPath } from "@/lib/panchanga-route-preload";
import type { PanchangaSidebarItem } from "@vedic-patro/features/panchanga";
import { useMobileNavMenu } from "@vedic-patro/features/common";
import {
  currentPatroYearLinkSearch,
  patroRouteLinkSearch,
} from "@/lib/url-state";
import { useLocale } from "@/i18n/locale";
import { cn } from "@vedic-patro/domain/utils";
import { featureIcon, navEntryIcon } from "@/lib/nav-icons";

function itemSearch(
  item: PanchangaSidebarItem,
  location: ReturnType<typeof usePanchangaLocation>["location"],
  era: ReturnType<typeof useCalendarEra>,
  urlBrowse: { year?: number; month?: number },
): Record<string, unknown> | undefined {
  if (item.id === "kundali" || item.id === "kundali-milan" || item.id === "rashifal" || item.id === "avakahada" || item.id === "converter") {
    return undefined;
  }
  if (item.id === "panchak-patro") {
    return currentPatroYearLinkSearch(location, era) as Record<string, unknown>;
  }
  const path = item.params
    ? resolveSidebarLinkPath(item.to, item.params)
    : item.to;
  return patroRouteLinkSearch(path, location, era, urlBrowse) as Record<string, unknown>;
}

function NavSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-t border-border/50 px-3 pb-5 pt-4 first:border-t-0 first:pt-1",
        className,
      )}
    >
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-wide text-foreground">{title}</h2>
        <span className="mt-1.5 block h-0.5 w-7 rounded-full bg-primary" aria-hidden />
      </div>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </section>
  );
}

function DrawerNavLink({
  item,
  label,
  icon,
  iconNode,
  search,
  onNavigate,
}: {
  item: PanchangaSidebarItem;
  label: string;
  icon?: LucideIcon;
  iconNode?: ReactNode;
  search?: Record<string, unknown>;
  onNavigate?: () => void;
}) {
  const shared = {
    label,
    icon,
    iconNode,
    onClick: onNavigate,
    ...(search ? { search } : {}),
  };

  if (item.params) {
    return (
      <DrawerClose asChild>
        <NavDrawerLinkCard
          {...shared}
          to={item.to as "/panchanga/element/$name" | "/sait/$category"}
          params={item.params}
        />
      </DrawerClose>
    );
  }

  return (
    <DrawerClose asChild>
      <NavDrawerLinkCard {...shared} to={item.to as LinkProps["to"]} />
    </DrawerClose>
  );
}

export function MobileNavMenu({ onNavigate }: { onNavigate?: () => void }) {
  const menu = useMobileNavMenu();
  const { lang } = useLocale();
  const era = useCalendarEra();
  const { location } = usePanchangaLocation();
  const rawSearch = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const urlBrowse = parseEraFromUrl(rawSearch, lang === "en" ? "en" : "ne");
  const { current: ritu, loading: rituLoading } = useCurrentRitu(location);
  const mainLabel = Object.fromEntries(menu.main.map((m) => [m.id, m.label])) as Record<string, string>;

  return (
    <nav className="flex flex-col gap-1 pb-3 pt-2" aria-label={menu.navAria}>
      <NavSection title={menu.mainTitle}>
        <DrawerClose asChild>
          <NavDrawerLinkCard to="/" label={mainLabel.home} icon={featureIcon("home")} onClick={onNavigate} />
        </DrawerClose>
        <DrawerClose asChild>
          <NavDrawerLinkCard to="/panchanga" search={patroRouteLinkSearch("/panchanga", location, era, { year: urlBrowse.year, month: urlBrowse.month })} label={mainLabel.panchanga} icon={featureIcon("panchanga")} onClick={onNavigate} />
        </DrawerClose>
        <DrawerClose asChild>
          <NavDrawerLinkCard to="/kundali" label={mainLabel.kundali} icon={featureIcon("kundali")} onClick={onNavigate} />
        </DrawerClose>
        <DrawerClose asChild>
          <NavDrawerLinkCard to="/dainikkranti" search={patroRouteLinkSearch("/dainikkranti", location, era, { year: urlBrowse.year, month: urlBrowse.month })} label={mainLabel.dainikkranti} icon={featureIcon("dainikkranti")} onClick={onNavigate} />
        </DrawerClose>
        <DrawerClose asChild>
          <NavDrawerLinkCard to="/jyotish/kundali-milan" label={mainLabel["kundali-milan"]} icon={featureIcon("kundali-milan")} onClick={onNavigate} />
        </DrawerClose>
        <DrawerClose asChild>
          <NavDrawerLinkCard to="/jyotish/rashifal" label={mainLabel.rashifal} icon={featureIcon("rashifal")} onClick={onNavigate} />
        </DrawerClose>
        <DrawerClose asChild>
          <NavDrawerLinkCard to="/panchanga/year" search={patroRouteLinkSearch("/panchanga/year", location, era, { year: urlBrowse.year, month: urlBrowse.month })} label={mainLabel["panchanga-year"]} icon={featureIcon("panchanga-year")} onClick={onNavigate} />
        </DrawerClose>
        <DrawerClose asChild>
          <NavDrawerLinkCard to="/vastu" label={mainLabel.vastu} icon={featureIcon("vastu")} onClick={onNavigate} />
        </DrawerClose>
        <DrawerClose asChild>
          <NavDrawerLinkCard to="/learn" label={mainLabel.learn} icon={featureIcon("learn")} onClick={onNavigate} />
        </DrawerClose>
        <DrawerClose asChild>
          <NavDrawerLinkCard to="/documents" label={mainLabel.documents} icon={featureIcon("documents")} onClick={onNavigate} />
        </DrawerClose>
      </NavSection>

      {menu.sections.map((section) => (
          <NavSection key={section.id} title={section.title}>
          {section.items.map(({ item, label }) => {
            const search = itemSearch(item, location, era, {
              year: urlBrowse.year,
              month: urlBrowse.month,
            });
            const icon = navEntryIcon(section.id, item.id);

            if (item.id === "ritu") {
              return (
                <DrawerNavLink
                  key={item.id}
                  item={item}
                  label={label}
                  search={search}
                  onNavigate={onNavigate}
                  iconNode={
                    rituLoading ? (
                      <Sprout size={28} strokeWidth={1.75} className="shrink-0 text-danger dark:text-danger" aria-hidden />
                    ) : ritu?.emoji ? (
                      <span className="text-sm leading-none" aria-hidden>
                        {ritu.emoji}
                      </span>
                    ) : (
                      <Sprout size={28} strokeWidth={1.75} className="shrink-0 text-danger dark:text-danger" aria-hidden />
                    )
                  }
                />
              );
            }

            return (
              <DrawerNavLink
                key={item.id}
                item={item}
                label={label}
                icon={icon}
                search={search}
                onNavigate={onNavigate}
              />
            );
          })}
          </NavSection>
      ))}
    </nav>
  );
}
