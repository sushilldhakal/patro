import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import {
  CalendarClock,
  HeartHandshake,
  MoonStar,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { QuickLinkCard } from "@/components/home/HomeQuickLinks";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { elementBlurb, elementTitle } from "@vedic-patro/domain/panchanga-i18n";
import { CEREMONY_META, ELEMENT_META } from "@vedic-patro/domain/panchanga-elements";
import { patroElementLinkSearch, patroRouteLinkSearch } from "@/lib/url-state";
import { cn } from "@vedic-patro/domain/utils";
import { featureIcon } from "@/lib/nav-icons";

function SectionTitle({ titleKey, className }: { titleKey: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <h2
      className={cn(
        panchangaPageClasses.directory.sectionTitle,
        className,
      )}
    >
      {t(titleKey)}
    </h2>
  );
}

function DirectoryCard({
  to,
  params,
  search,
  labelKey,
  blurbKey,
  icon,
}: {
  to: "/panchanga/element/$name" | "/sait/$category";
  params: Record<string, string>;
  search?: Record<string, unknown>;
  labelKey: string;
  blurbKey: string;
  icon: LucideIcon;
}) {
  const { t } = useTranslation();
  return (
    <QuickLinkCard
      to={to}
      params={params}
      search={search}
      icon={icon}
      label={t(labelKey)}
      description={t(blurbKey)}
    />
  );
}

const GRAHA_PAGES = [
  { to: "/gochar" as const, labelKey: "sidebar_nav.items.gochar.label", blurbKey: "sidebar_nav.items.gochar.blurb", icon: featureIcon("gochar") },
  { to: "/panchanga/graha-asta" as const, labelKey: "sidebar_nav.items.graha-asta.label", blurbKey: "sidebar_nav.items.graha-asta.blurb", icon: featureIcon("graha-asta") },
  { to: "/panchanga/graha-vakri" as const, labelKey: "sidebar_nav.items.graha-vakri.label", blurbKey: "sidebar_nav.items.graha-vakri.blurb", icon: featureIcon("graha-vakri") },
  { to: "/panchanga/chandra-grahan" as const, labelKey: "sidebar_nav.items.chandra-grahan.label", blurbKey: "sidebar_nav.items.chandra-grahan.blurb", icon: featureIcon("chandra-grahan") },
  { to: "/panchanga/surya-grahan" as const, labelKey: "sidebar_nav.items.surya-grahan.label", blurbKey: "sidebar_nav.items.surya-grahan.blurb", icon: featureIcon("surya-grahan") },
];

/** Categorized link grid: transition elements → graha detail → daily tables → shubha muhurta. */
export function PanchangaDirectory({ className }: { className?: string }) {
  const { t } = useTranslation();
  const era = useCalendarEra();
  const { location } = usePanchangaLocation();
  const spans = ELEMENT_META.filter((e) => e.kind === "span");
  const tables = ELEMENT_META.filter((e) => e.kind === "table");

  return (
    <div className={className}>
      <SectionTitle titleKey="sidebar_nav.sections.spans.title" />
      <div className={cn("flex", panchangaPageClasses.directory.cardRow)}>
        {spans.map((e) => (
          <QuickLinkCard
            key={e.id}
            to="/panchanga/element/$name"
            params={{ name: e.id }}
            search={patroElementLinkSearch(e.id, location, era) as Record<string, unknown>}
            icon={MoonStar}
            label={elementTitle(e.id)}
            description={elementBlurb(e.id)}
          />
        ))}
      </div>

      <SectionTitle titleKey="sidebar_nav.sections.graha.title" />
      <div className={cn("flex", panchangaPageClasses.directory.cardRow)}>
        {GRAHA_PAGES.map((g) => (
          <QuickLinkCard
            key={g.to}
            to={g.to}
            search={patroRouteLinkSearch(g.to, location, era)}
            icon={g.icon}
            label={t(g.labelKey)}
            description={t(g.blurbKey)}
          />
        ))}
      </div>

      <SectionTitle titleKey="sidebar_nav.sections.tables.title" />
      <div className={cn("flex", panchangaPageClasses.directory.cardRow)}>
        {tables.map((e) => (
          <QuickLinkCard
            key={e.id}
            to="/panchanga/element/$name"
            params={{ name: e.id }}
            search={patroElementLinkSearch(e.id, location, era) as Record<string, unknown>}
            icon={CalendarClock}
            label={elementTitle(e.id)}
            description={elementBlurb(e.id)}
          />
        ))}
      </div>

      <div id="home-sait-links" className="scroll-mt-20">
      <SectionTitle titleKey="sidebar_nav.sections.sait.title" />
      <div className={cn("flex", panchangaPageClasses.directory.cardRow)}>
        {CEREMONY_META.map((c) => (
          <DirectoryCard
            key={c.id}
            to="/sait/$category"
            params={{ category: c.id }}
            search={patroRouteLinkSearch(`/sait/${c.id}`, location, era)}
            labelKey={`sait.categories.${c.id}`}
            blurbKey="sidebar_nav.items.sait_moment.blurb"
            icon={HeartHandshake}
          />
        ))}
      </div>
      </div>
    </div>
  );
}
