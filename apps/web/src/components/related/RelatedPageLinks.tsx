import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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
import { elementBlurb, elementTitle } from "@/lib/panchanga-i18n";
import { LEARN_TOPICS_BY_SLUG } from "@/lib/learn/learn-topics-meta";
import { useLocale, bilingualText } from "@/i18n/locale";
import {
  getRelatedLearnSlugs,
  getRelatedSiteLinkIds,
  resolveSitePageId,
  shouldShowRelatedLinks,
  siteLinkRouteProps,
  SITE_LINK_BLURB_KEY,
  SITE_LINK_LABEL_KEY,
} from "@/lib/related-page-links";
import { cn } from "@/lib/utils";

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

/** Articles and pages share one list, capped so the footer stays scannable. */
const RELATED_CARD_LIMIT = 6;

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
  const { t } = useTranslation();
  const { lang } = useLocale();
  const { location } = usePanchangaLocation();
  const era = useCalendarEra();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const params = useRouterState({
    select: (s) => {
      const match = s.matches[s.matches.length - 1];
      return (match?.params ?? {}) as Record<string, string>;
    },
  });

  if (!shouldShowRelatedLinks(pathname)) return null;

  const pageId = resolveSitePageId(pathname, params);
  if (!pageId) return null;

  /**
   * One list, not two: articles first (closest to what the reader just read),
   * then site pages fill the rest of the six-card budget.
   */
  const learnCards = getRelatedLearnSlugs(pageId)
    .map((slug) => {
      const topic = LEARN_TOPICS_BY_SLUG[slug];
      if (!topic) return null;
      return {
        key: `learn:${slug}`,
        label: bilingualText(lang, topic.titleNe, topic.titleEn),
        description: bilingualText(lang, topic.summary, topic.summaryEn),
        icon: topic.icon,
        to: "/learn/$slug",
        params: { slug },
        search: undefined as Record<string, unknown> | undefined,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const siteCards = getRelatedSiteLinkIds(pageId).map((linkId) => {
    const route = siteLinkRouteProps(linkId, location, era);
    let label: string;
    let description: string | undefined;

    if (linkId.startsWith("element:")) {
      const elId = linkId.slice(8);
      label = elementTitle(elId);
      description = elementBlurb(elId);
    } else if (linkId.startsWith("sait:")) {
      const cat = linkId.slice(5);
      label = t(`sait.categories.${cat}`);
      description = t("sidebar_nav.items.sait_moment.blurb");
    } else {
      const labelKey = SITE_LINK_LABEL_KEY[linkId];
      label = labelKey ? t(labelKey) : linkId;
      const blurbKey = SITE_LINK_BLURB_KEY[linkId];
      description = blurbKey ? t(blurbKey) : undefined;
    }

    return {
      key: linkId,
      label,
      description,
      icon: iconForLinkId(linkId),
      to: route.to,
      params: route.params,
      search: route.search,
    };
  });

  const cards = [...learnCards, ...siteCards].slice(0, RELATED_CARD_LIMIT);
  if (cards.length === 0) return null;

  return (
    <aside
      className={cn("mt-10 border-t border-border pt-8", className)}
      aria-label={t("related_pages.aria")}
    >
      <div className="mb-3 flex items-center gap-2 text-secondary">
        <Compass className="size-4" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">{t("related_pages.heading")}</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <RelatedNavCard
            key={card.key}
            label={card.label}
            description={card.description}
            icon={card.icon}
            to={card.to}
            params={card.params}
            search={card.search}
          />
        ))}
      </div>
    </aside>
  );
}
