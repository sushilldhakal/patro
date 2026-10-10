import { Link } from "@tanstack/react-router";
import { ArrowRight, Orbit } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { patroRouteLinkSearch } from "@/lib/url-state";
import { useLocale, bilingualText } from "@/i18n/locale";
import { cn } from "@/lib/utils";

type Props = {
  location: PanchangaLocation;
  className?: string;
  compact?: boolean;
};

/** Panchanga footer / cross-link card → full Gochar page. */
export function GocharPromoCard({ location, className, compact }: Props) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const era = useCalendarEra();

  return (
    <Link
      to="/gochar"
      search={patroRouteLinkSearch("/gochar", location, era) as Record<string, unknown>}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/[0.08] p-5 shadow-ring-soft transition-[border-color,box-shadow] hover:border-secondary/40 hover:shadow-md",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-secondary/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
            <Orbit className="size-6" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-base font-bold text-foreground sm:text-lg">
              {t("gochar.promo_title")}
            </h2>
            {!compact ? (
              <p className="mt-1.5 mb-0 text-sm leading-relaxed text-muted-foreground">
                {bilingualText(
                  lang,
                  "आजको पञ्चाङ्ग हेर्नुभयो? अब ग्रहहरू कहाँ गति गर्दैछन् र आजको गोचरले तपाईंको राशिमा कस्तो असर पार्छ हेर्नुहोस्।",
                  "Seen the day's panchang? Now check where the planets are moving and how today's transits affect your sign.",
                )}
              </p>
            ) : null}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors group-hover:bg-secondary/90 sm:self-center">
          {t("gochar.promo_cta")}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
