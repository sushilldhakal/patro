import { locateDevice } from "@/components/panchanga/locate-device";
import type { Era } from "@vedic-patro/domain/era";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { PatroYearNav } from "@vedic-patro/ui/kit/shell";
import type { PatroHeaderTab } from "./PatroHeaderTabs";

export type PatroYearBrowseNavProps = {
  era: Era;
  onEraChange: (era: Era) => void;
  year: number;
  onYearChange: (year: number) => void;
  /** API `gregorian_range` for the cross-era headline line. */
  gregorianRange?: { start: string; end: string } | null;
  crossEraSubtitle?: string;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  tabs?: PatroHeaderTab[];
  tabsLabel?: string;
  className?: string;
  /** Override the badge's "go to this year". */
  onToday?: () => void;
};

/** Year-only browse header. Draws the website year nav. */
export function PatroYearBrowseNav({
  era,
  onEraChange,
  year,
  onYearChange,
  gregorianRange,
  crossEraSubtitle,
  location: locationProp,
  onLocationChange: onLocationChangeProp,
  tabs,
  tabsLabel,
  className,
  onToday,
}: PatroYearBrowseNavProps) {
  const fallback = usePanchangaLocation();
  return (
    <PatroYearNav
      className={className}
      era={era}
      onEraChange={onEraChange}
      year={year}
      onYearChange={onYearChange}
      gregorianRange={gregorianRange}
      rangeLabel={crossEraSubtitle}
      onToday={onToday}
      location={locationProp ?? fallback.location}
      onLocationChange={onLocationChangeProp ?? fallback.setLocation}
      locate={locateDevice}
      tabs={tabs}
      tabsLabel={tabsLabel}
    />
  );
}
