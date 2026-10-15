import { useMemo } from "react";
import { getCurrentBs } from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { formatPatroYearGregorianRange, patroHeadlineDigits } from "@vedic-patro/domain/patro-headline-subtitle";
import { type Era } from "@vedic-patro/domain/era";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { PatroDateNav } from "./PatroDateNav";
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
  /** Override the badge's "go to this year"; default sets the current BS year. */
  onToday?: () => void;
};

/** Year-only browse header (web `PatroYearNav`): badge, title, year picker and location. */
export function PatroYearBrowseNav({
  era,
  onEraChange,
  year,
  onYearChange,
  gregorianRange,
  crossEraSubtitle: crossEraSubtitleProp,
  location: locationProp,
  onLocationChange: onLocationChangeProp,
  tabs,
  tabsLabel,
  className,
  onToday,
}: PatroYearBrowseNavProps) {
  const { lang } = useLocale();
  const fallback = usePanchangaLocation();
  const location = locationProp ?? fallback.location;
  const onLocationChange = onLocationChangeProp ?? fallback.setLocation;
  const digitFn = patroHeadlineDigits(lang);

  const crossEraSubtitle = useMemo(() => {
    if (crossEraSubtitleProp?.trim()) return crossEraSubtitleProp;
    if (gregorianRange?.start && gregorianRange?.end) {
      return formatPatroYearGregorianRange(gregorianRange.start, gregorianRange.end, lang, digitFn);
    }
    return undefined;
  }, [crossEraSubtitleProp, gregorianRange, lang, digitFn]);

  return (
    <PatroDateNav
      mode="year"
      className={className}
      era={era}
      onEraChange={onEraChange}
      year={year}
      onYearChange={onYearChange}
      crossEraSubtitle={crossEraSubtitle}
      onToday={onToday ?? (() => onYearChange(getCurrentBs().year))}
      location={location}
      onLocationChange={onLocationChange}
      tabs={tabs}
      tabsLabel={tabsLabel}
    />
  );
}
