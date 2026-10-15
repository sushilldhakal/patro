import { Link } from "@tanstack/react-router";
import { ArrowRight, Orbit } from "lucide-react";
import { useGocharPromoCard } from "@vedic-patro/features/gochar";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { patroRouteLinkSearch } from "@/lib/url-state";
import { cn } from "@vedic-patro/domain/utils";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";

type Props = {
  location: PanchangaLocation;
  className?: string;
  compact?: boolean;
};

/** Panchanga footer / cross-link card → full Gochar page. */
export function GocharPromoCard({ location, className, compact }: Props) {
  const copy = useGocharPromoCard();
  const era = useCalendarEra();

  return (
    <Link
      to="/gochar"
      search={patroRouteLinkSearch("/gochar", location, era) as Record<string, unknown>}
      className={cn(
        "group relative block bg-gradient-to-br from-card via-card to-secondary/[0.08] shadow-ring-soft transition-[border-color,box-shadow] hover:border-secondary/40 hover:shadow-md",
        gocharClasses.promoCard,
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-secondary/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("flex", gocharClasses.promoIcon)}>
            <Orbit className="size-6" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className={cn("m-0", gocharClasses.promoTitle)}>
              {copy.title}
            </h2>
            {!compact ? (
              <p className={cn("mb-0", gocharClasses.promoBody)}>
                {copy.body}
              </p>
            ) : null}
          </div>
        </div>
        <span className={cn("inline-flex transition-colors group-hover:bg-secondary/90", gocharClasses.promoCta, gocharClasses.promoCtaText)}>
          {copy.cta}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
