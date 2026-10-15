import { Link } from "@tanstack/react-router";
import { Sprout, HelpCircle } from "lucide-react";
import { useRituPage } from "@vedic-patro/features/ritu";
import { useLocale } from "@/i18n/locale";
import { displayLocationLabel, type PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { cn } from "@vedic-patro/domain/utils";
import { rituClasses } from "@vedic-patro/design-tokens/classes/ritu-classes";

/**
 * ऋतु — the six seasons by the Sun's tropical longitude. What they are, when
 * each starts and how far the current one has run come from `useRituPage`
 * (@vedic-patro/features), shared with the app; this draws them.
 */
export function RituSeasons({
  location,
  showHeader = true,
}: {
  location: PanchangaLocation;
  showHeader?: boolean;
}) {
  const { lang } = useLocale();
  const page = useRituPage(location.params);
  const locationLabel = displayLocationLabel(location, undefined, lang);
  const south = page.south;
  const whyLink = (extra?: string) => (
    <Link
      to="/learn/$slug"
      params={{ slug: "ritu-drift" }}
      className={cn("inline-flex whitespace-nowrap no-underline transition-colors hover:border-secondary/55 hover:bg-secondary/12 dark:hover:border-primary/55 dark:hover:bg-primary/14", extra, rituClasses.whyLink, rituClasses.whyLinkText)}
    >
      <HelpCircle size={13} strokeWidth={2} aria-hidden />
      {page.copy.whyLink}
    </Link>
  );

  return (
    <div className={showHeader ? "mt-5.5" : undefined}>
      {showHeader ? (
        <div className={cn("flex flex-wrap", rituClasses.sectionHead)}>
          <Sprout className="self-center text-secondary dark:text-primary" size={18} strokeWidth={1.8} />
          <h2 className={cn("m-0", rituClasses.sectionTitle)}>{page.copy.title}</h2>
          <span className={rituClasses.sectionSub}>
            {page.copy.subtitle}{locationLabel ? ` · ${locationLabel}` : ""}
            {south && <span className={cn("ml-1 font-semibold text-warning")}>{page.copy.southern}</span>}
          </span>
          {whyLink("self-center")}
        </div>
      ) : (
        <div className={cn("flex flex-wrap", rituClasses.toolbar)}>
          {south ? <span className={rituClasses.southTag}>{page.copy.southern}</span> : null}
          {whyLink()}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 compact:grid-cols-2 md:grid-cols-3">
        {page.cards.map((card) => (
          <div
            key={card.key}
            className={cn(
              "flex flex-col shadow-ring-soft",
              rituClasses.card,
              card.current &&
                "shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--secondary)_38%,transparent)] dark:shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--primary)_38%,transparent)]",
            )}
          >
            <span className={cn(rituClasses.kicker, card.current && rituClasses.kickerCurrent)}>{card.kicker}</span>
            <div className={cn("flex", rituClasses.seasonRow)}>
              <span className={rituClasses.emoji} aria-hidden>
                {card.emoji}
              </span>
              <span className={rituClasses.nameWrap}>
                <span className={cn("block", rituClasses.name)}>{card.name}</span>
              </span>
              <span className={cn("flex h-[46px] w-[46px] flex-col bg-secondary/13", rituClasses.dateChip)}>
                <span className={rituClasses.dateDay}>{card.day}</span>
                <span className={rituClasses.dateMonth}>{card.month}</span>
              </span>
            </div>
            <div className={cn("flex", rituClasses.metaRow)}>
              <span className={rituClasses.metaText}>{card.meta}</span>
              <span className={cn("mono", rituClasses.metaFrom)}>{card.from}</span>
            </div>
            {card.progress ? (
              <>
                <div className={rituClasses.track} role="presentation">
                  <div
                    className={cn(rituClasses.bar, "bg-gradient-to-r from-secondary to-secondary/55 transition-[width] duration-400 ease-out dark:from-primary dark:to-primary/55")}
                    style={{ width: `${card.progress.pct}%` }}
                  />
                </div>
                <div className={cn("flex text-sm", rituClasses.progressRow)}>
                  <span className={rituClasses.progressText}>{card.progress.label}</span>
                  <span className={cn("mono", rituClasses.progressPct)}>{card.progress.pctLabel}</span>
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>

      {south && <p className={rituClasses.southNote}>{page.copy.southNote}</p>}
    </div>
  );
}
