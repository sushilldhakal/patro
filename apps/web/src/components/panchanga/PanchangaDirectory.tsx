import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { CalendarClock, HeartHandshake, MoonStar, type LucideIcon } from "lucide-react";
import { usePanchangaDirectory, type DirectoryLink } from "@vedic-patro/features/panchanga-details";
import { QuickLinkCard } from "@/components/home/HomeQuickLinks";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { patroElementLinkSearch, patroRouteLinkSearch } from "@/lib/url-state";
import { cn } from "@vedic-patro/design-tokens/cn";
import { featureIcon } from "@/lib/nav-icons";

const ICONS: Partial<Record<DirectoryLink["icon"], LucideIcon>> = {
  "moon-star": MoonStar,
  "calendar-clock": CalendarClock,
  "heart-handshake": HeartHandshake,
};

/**
 * Categorized link grid (transition elements → graha detail → daily tables →
 * shubha muhurta) — draws `usePanchangaDirectory` (@vedic-patro/features).
 */
export function PanchangaDirectory({ className }: { className?: string }) {
  const era = useCalendarEra();
  const { location } = usePanchangaLocation();
  const sections = usePanchangaDirectory();

  const card = (link: DirectoryLink) => {
    switch (link.kind) {
      case "element":
        return (
          <QuickLinkCard
            key={link.id}
            to="/panchanga/element/$name"
            params={{ name: link.id }}
            search={patroElementLinkSearch(link.id, location, era) as Record<string, unknown>}
            icon={ICONS[link.icon] ?? MoonStar}
            label={link.label}
            description={link.description}
          />
        );
      case "graha":
        return (
          <QuickLinkCard
            key={link.id}
            to={link.path as "/gochar"}
            search={patroRouteLinkSearch(link.path, location, era)}
            icon={featureIcon(link.id)}
            label={link.label}
            description={link.description}
          />
        );
      default:
        return (
          <QuickLinkCard
            key={link.id}
            to="/sait/$category"
            params={{ category: link.id }}
            search={patroRouteLinkSearch(`/sait/${link.id}`, location, era)}
            icon={HeartHandshake}
            label={link.label}
            description={link.description}
          />
        );
    }
  };

  return (
    <div className={className}>
      {sections.map((section) => {
        const block = (
          <>
            <h2 className={panchangaPageClasses.directory.sectionTitle}>{section.title}</h2>
            <div className={cn("flex", panchangaPageClasses.directory.cardRow)}>{section.links.map(card)}</div>
          </>
        );
        return section.id === "sait" ? (
          <div key={section.id} id="home-sait-links" className="scroll-mt-20">
            {block}
          </div>
        ) : (
          <div key={section.id} className="contents">
            {block}
          </div>
        );
      })}
    </div>
  );
}
