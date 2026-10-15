import type { ReactNode } from "react";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import type { Era, Language } from "@vedic-patro/domain/era";
import { cn } from "@vedic-patro/domain/utils";
import { PatroDateNavCore } from "./PatroDateNavCore";
import { usePatroMonthYearNav } from "@vedic-patro/features/patro-date";

export type PatroMonthYearNavProps = {
  era: Era;
  year: number;
  month: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onEraChange?: (era: Era) => void;
  onBrowseCommit?: (era: Era, year: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  todayAd?: string;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  /** Optional override; default comes from `usePatroMonthYearNav`. */
  crossEraSubtitle?: string | null;
  /** URL `language` — Nepali digits when `ne`. */
  displayLanguage?: Language;
  subtitle?: string;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  mobileToolbar?: ReactNode;
  mobileToolbarLower?: ReactNode;
  desktopToolbar?: ReactNode;
  className?: string;
};

/**
 * Month + year date navigation — home calendar, dainik kranti, month-browse pages.
 * No day picker, no time picker.
 */
export function PatroMonthYearNav({
  era,
  year,
  month,
  onMonthChange,
  onYearChange,
  onBrowseCommit,
  onPrev,
  onNext,
  onToday,
  todayAd,
  prevDisabled,
  nextDisabled,
  crossEraSubtitle,
  displayLanguage,
  subtitle,
  location,
  onLocationChange,
  mobileToolbar,
  mobileToolbarLower,
  desktopToolbar,
  className,
}: PatroMonthYearNavProps) {
  const defaultPrevDisabled = prevDisabled ?? false;
  const defaultNextDisabled = nextDisabled ?? false;

  const locationDesktop =
    desktopToolbar ??
    (location && onLocationChange ? (
      <LocationSelector
        compact
        location={location}
        onLocationChange={onLocationChange}
        className="h-8 min-w-0 w-auto max-w-[12.5rem]"
      />
    ) : null);

  const resolvedMobileToolbar = mobileToolbar;

  const nav = usePatroMonthYearNav({ era, year, month, location, crossEraSubtitle, displayLanguage });

  return (
    <div
      className={cn(
        "w-full flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <PatroDateNavCore
          era={era}
          year={year}
          month={month}
          crossEraSubtitle={nav.crossEraSubtitle}
          displayLanguage={displayLanguage}
          todayAd={todayAd}
          onToday={onToday}
          todayAriaLabel={nav.labels.today}
          onMonthChange={onMonthChange}
          onYearChange={onYearChange}
          onBrowseCommit={onBrowseCommit}
          monthAriaLabel={nav.labels.month}
          yearAriaLabel={nav.labels.year}
          onPrev={onPrev}
          onNext={onNext}
          prevDisabled={defaultPrevDisabled}
          nextDisabled={defaultNextDisabled}
          prevAriaLabel={nav.labels.prev}
          nextAriaLabel={nav.labels.next}
          panchangaSubtitle={subtitle}
          mobileDateTimeDrawer
          mobileToolbar={resolvedMobileToolbar}
          mobileToolbarLower={mobileToolbarLower}
          location={location}
          onLocationChange={onLocationChange}
        />
      </div>
      {locationDesktop ? (
        <div className="hidden shrink-0 md:flex md:w-auto md:flex-col md:items-end md:pt-0.5">
          {locationDesktop}
        </div>
      ) : null}
    </div>
  );
}
