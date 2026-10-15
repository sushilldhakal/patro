import { Link } from "@tanstack/react-router";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { patroYearLinkSearch } from "@/lib/url-state";
import { SaitAsidePanel as Shared } from "@vedic-patro/ui/kit/jyotish";

type Props = {
  year: number;
  month: number;
  location: PanchangaLocation;
  highlightDay?: number;
  adYear?: number;
  adMonth?: number;
};

/** Home aside. The row is a router link; the list itself is shared. */
export function SaitAsidePanel({ year, month, location, highlightDay, adYear, adMonth }: Props) {
  return (
    <Shared
      year={year}
      month={month}
      highlightDay={highlightDay}
      adYear={adYear}
      adMonth={adMonth}
      renderLink={({ id, className, children }) => (
        <Link to="/sait/$category" params={{ category: id }} search={patroYearLinkSearch(location, year, "bs")} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
