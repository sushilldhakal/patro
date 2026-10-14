import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useSaitAside } from "@vedic-patro/features/home";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { patroYearLinkSearch } from "@/lib/url-state";
import { cn } from "@vedic-patro/domain/utils";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

type Props = {
  /** BS year of the month the calendar is currently showing. */
  year: number;
  /** BS month (1–12) the calendar is currently showing. */
  month: number;
  location: PanchangaLocation;
  /** Day to highlight (the selected calendar day), if it is auspicious. */
  highlightDay?: number;
  /**
   * Gregorian month on screen. When the calendar is in AD mode the grid shows
   * (say) July while `year`/`month` name only the BS month the 1st lands in, so
   * listing that BS month labels July's saait as Ashadh. Given these, the panel
   * lists the Gregorian month instead, in Gregorian day numbers.
   */
  adYear?: number;
  adMonth?: number;
};

/**
 * Home-aside saait: one row per ceremony type, each showing that ceremony's
 * auspicious days for the month the calendar is on (not the whole year). The
 * server computes just that month for all ceremonies in one call. Each row links
 * to the ceremony's /sait/$category page for the full yearly list.
 */
export function SaitAsidePanel({
  year,
  month,
  location,
  highlightDay,
  adYear,
  adMonth,
}: Props) {
  const sait = useSaitAside({ year, month, adYear, adMonth, highlightDay });

  return (
    <div className={homeClasses.saitStack}>
      <p className={homeClasses.saitMonth}>{sait.monthName}</p>

      {sait.status === "loading" ? (
        <div className={cn("animate-pulse", homeClasses.saitSkeleton)} />
      ) : sait.status === "error" ? (
        <p className={cn("m-0", homeClasses.saitEmpty)}>{sait.copy.error}</p>
      ) : (
        <>
          <ul className={cn("m-0 list-none p-0", homeClasses.saitList)}>
            {sait.rows.map((row) => (
              <li key={row.id}>
                <Link
                  to="/sait/$category"
                  params={{ category: row.id }}
                  search={patroYearLinkSearch(location, year, "bs")}
                  className={cn(homeClasses.saitRow, "text-sm leading-snug transition-colors hover:bg-surface-hover")}
                >
                  <span className={homeClasses.saitName}>{row.name}</span>
                  <span className={cn("min-w-0 flex-1", homeClasses.saitDays)}>
                    {row.days.length ? (
                      row.days.map((d, i) => (
                        <span key={d.day}>
                          {i > 0 ? ", " : ""}
                          <span className={cn(d.highlighted && cn(homeClasses.saitHighlight, "underline-offset-2"))}>{d.label}</span>
                        </span>
                      ))
                    ) : (
                      <span className={homeClasses.saitDaysNone}>{sait.copy.none}</span>
                    )}
                  </span>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>

          {sait.empty ? <p className={cn("m-0", homeClasses.saitEmpty)}>{sait.empty}</p> : null}
        </>
      )}
    </div>
  );
}
