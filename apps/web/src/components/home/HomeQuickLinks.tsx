import { Link, type LinkProps } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BookMarked,
  CalendarClock,
  CalendarRange,
  Grid3x3,
  Heart,
  Moon,
  PartyPopper,
  Sparkles,
  Sprout,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { type ReactNode } from "react";
import { useCurrentRitu } from "@/lib/ritu-display";
import { currentPatroMonthLinkSearch, currentPatroYearLinkSearch, patroRouteLinkSearch } from "@/lib/url-state";
import { defaultPanchakPatroYear } from "@vedic-patro/domain/panchak/panchak-patro-data";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { useLocale, bilingualText } from "@/i18n/locale";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
  { group: "patro", to: "/holidays" as const, labelKey: "nav.holidays", icon: PartyPopper },
  { group: "patro", to: "/converter" as const, labelKey: "nav.converter", icon: ArrowLeftRight },
  { group: "patro", to: "/suryakranti" as const, labelKey: "nav.suryakranti", icon: Sunrise },
  { group: "patro", to: "/panchanga/year" as const, labelKey: "panchanga_year.title", icon: CalendarRange },
  { group: "jyotish", to: "/panchanga/avakahada-chakra" as const, labelKey: "nav.avakahada_chakra", icon: Grid3x3 },
  { group: "jyotish", to: "/abhijit-muhurta" as const, labelKey: "nav.abhijit_muhurta", icon: Sparkles },
  { group: "jyotish", to: "/kundali" as const, labelKey: "home_quick.kundali_build_title", icon: Sparkles },
  { group: "jyotish", to: "/jyotish/kundali-milan" as const, labelKey: "home_quick.kundali_milan_title", icon: Heart },
] as const satisfies {
  group: "patro" | "jyotish";
  to: string;
  labelKey: string;
  icon: LucideIcon;
}[];

const QUICK_LINK_ICON_SIZE = 28;
const QUICK_LINK_ICON_STROKE = 1.75;
const NAV_DRAWER_ICON_SIZE = 28;
const NAV_DRAWER_ICON_STROKE = 1.75;

/** Phone: content-sized row chips. md+: the original square tiles. */
export const quickLinkCardClass =
  "group flex w-auto max-w-full shrink-0 flex-row items-center justify-start gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left no-underline shadow-sm transition-[border-color,background-color,transform] duration-200 hover:border-secondary/35 hover:bg-tab-hover active:scale-[0.98] md:aspect-square md:w-[calc((100%-3rem)/5)] md:max-w-[8rem] md:flex-col md:items-center md:justify-center md:gap-3 md:rounded-2xl md:px-2.5 md:py-3.5 md:text-center md:shadow-none lg:max-w-none lg:w-[calc((100%-5.25rem)/8)]";

/** Flat drawer tile — 3 per row under 540px, 4 per row above. */
export const navDrawerCardClass =
  "group flex h-[6.25rem] w-[calc((100%-1.25rem)/3)] min-[540px]:w-[calc((100%-1.875rem)/4)] flex-col items-center justify-center gap-1.5 bg-transparent px-0.5 py-1 text-center no-underline shadow-none transition-colors duration-200 hover:text-secondary active:scale-[0.98] [&.active]:text-secondary";

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
      <span className="min-w-0 px-0.5 text-sm font-bold leading-snug text-foreground line-clamp-1 md:line-clamp-2 md:w-full">
        {label}
      </span>
      {description ? (
        <span className="hidden w-full min-w-0 text-[0.68rem] leading-snug text-muted-foreground line-clamp-2 md:block">
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
      <span className="w-full min-w-0 px-0.5 text-[0.8rem] font-bold leading-tight text-foreground line-clamp-2 group-[.active]:text-secondary">
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
      <h2 className="mb-3 text-left text-base font-bold text-foreground md:text-center md:text-sm md:uppercase md:tracking-wider md:text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-wrap items-stretch justify-start gap-2 md:justify-center md:gap-3">{children}</div>
    </section>
  );
}

function PanchakPatroQuickLink({ location, era }: { location: PanchangaLocation; era: ReturnType<typeof useCalendarEra> }) {
  const { t } = useTranslation();
  const { digits } = useLocale();
  const year = defaultPanchakPatroYear();

  return (
    <QuickLinkCard
      to="/panchak-patro"
      search={currentPatroYearLinkSearch(location, era)}
      icon={CalendarClock}
      label={t("panchak.title", { year: digits(year) })}
    />
  );
}

function ChandrKrantiQuickLink({ location, era }: { location: PanchangaLocation; era: ReturnType<typeof useCalendarEra> }) {
  const { t } = useTranslation();

  return (
    <QuickLinkCard
      to="/dainikkranti"
      search={currentPatroMonthLinkSearch(location, era)}
      icon={Moon}
      label={t("nav.dainikkranti")}
    />
  );
}

function RituQuickLink({ location }: { location: PanchangaLocation }) {
  const { t } = useTranslation();
  const era = useCalendarEra();
  const { current, loading } = useCurrentRitu(location);

  return (
    <QuickLinkCard
      to="/ritu"
      search={patroRouteLinkSearch("/ritu", location, era)}
      label={t("ritu.title")}
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
  const { t } = useTranslation();
  const { lang } = useLocale();
  const era = useCalendarEra();

  return (
    <div
      className={cn(
        "space-y-8",
        className,
      )}
    >
      <LinkCategory title={bilingualText(lang, "पात्रो तथा मिति", "Patro & dates")}>
        {QUICK_LINKS.filter(({ group }) => group === "patro").map(({ to, labelKey, icon }) => (
          <QuickLinkCard
            key={to}
            to={to}
            search={patroRouteLinkSearch(to, location, era)}
            icon={icon}
            label={t(labelKey)}
          />
        ))}
        <ChandrKrantiQuickLink location={location} era={era} />
        <PanchakPatroQuickLink location={location} era={era} />
        <RituQuickLink location={location} />
      </LinkCategory>

      <LinkCategory title={bilingualText(lang, "ज्योतिष तथा मुहूर्त", "Jyotish & moment")}>
        {QUICK_LINKS.filter(({ group }) => group === "jyotish").map(({ to, labelKey, icon }) => (
          <QuickLinkCard
            key={to}
            to={to}
            search={patroRouteLinkSearch(to, location, era)}
            icon={icon}
            label={t(labelKey)}
          />
        ))}
        {/* Not a patro/era route — no location or year search params to carry. */}
        <QuickLinkCard to="/documents" icon={BookMarked} label={t("nav.documents")} />
      </LinkCategory>
    </div>
  );
}
