import { PatroHeaderLocation } from "./PatroHeaderLocation";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { patroBrowseTodayYear } from "@vedic-patro/domain/patro-browse-params";
import { patroBrowseTodayEra, type Era } from "@vedic-patro/domain/era";
import { patroDateClasses } from "@vedic-patro/design-tokens/classes/patro-date-classes";
import { calendarPickerClasses as pickerClasses } from "@vedic-patro/design-tokens/classes/calendar-picker-classes";
import { cn } from "@vedic-patro/domain/utils";
import { PatroYearHeader } from "./PatroYearHeader";
import { usePatroYearHeadlineSubtitle } from "./use-patro-year-headline-subtitle";

export type PatroYearNavProps = {
  era: Era;
  year: number;
  onYearChange: (year: number) => void;
  onEraChange?: (era: Era) => void;
  /** Raw API gregorian year span — formatted for the headline subtitle. */
  gregorianRange?: { start: string; end: string } | null;
  /** Preformatted cross-era span (skip when {@link gregorianRange} is set). */
  rangeLabel?: string | null;
  /** Out-of-range or validation message from the backend (400 detail). */
  yearError?: string | null;
  /** Observer “today” (YYYY-MM-DD) for the chip jump — e.g. location timezone. */
  todayAd?: string;
  /** Override chip “go to today”; default sets year via {@link patroBrowseTodayYear}. */
  onToday?: () => void;
  displayLanguage?: import("@vedic-patro/domain/era").Language;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  className?: string;
};

/**
 * Year-only navigation — graha yearly pages (asta, vakri), holidays, suryakranti.
 * Positive {@link year} in the active {@link Era}; the backend validates range.
 */
export function PatroYearNav({
  era,
  year,
  onYearChange,
  onEraChange,
  gregorianRange,
  rangeLabel,
  yearError,
  todayAd,
  onToday,
  displayLanguage,
  location,
  onLocationChange,
  className,
}: PatroYearNavProps) {
  const jumpToToday =
    onToday ??
    (() => {
      const targetEra = patroBrowseTodayEra(era);
      if (targetEra !== era) onEraChange?.(targetEra);
      onYearChange(patroBrowseTodayYear(era, todayAd));
    });

  const subtitle = usePatroYearHeadlineSubtitle(era, year, gregorianRange, rangeLabel, displayLanguage);

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div className={pickerClasses.webDtGrid}>
        <PatroYearHeader
          className="contents"
          era={era}
          year={year}
          onChange={onYearChange}
          onEraChange={onEraChange}
          onToday={jumpToToday}
          todayYear={patroBrowseTodayYear(era, todayAd)}
          subtitle={subtitle}
        />
        {location && onLocationChange ? (
          <PatroHeaderLocation location={location} onLocationChange={onLocationChange} className={pickerClasses.webDtLocationSolo} />
        ) : null}
      </div>
      {yearError ? (
        <p className={patroDateClasses.navError} role="alert">
          {yearError}
        </p>
      ) : null}
    </div>
  );
}
