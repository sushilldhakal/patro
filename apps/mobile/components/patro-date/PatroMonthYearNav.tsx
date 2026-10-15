import { locateDevice } from "@/components/panchanga/locate-device";
import { PatroCalendarHeader } from "@vedic-patro/ui/kit/shell";
import type { PatroDateNavProps } from "./types";

type MonthYearNavProps = Omit<Extract<PatroDateNavProps, { mode: "year-month" }>, "mode">;

/**
 * Month + year navigation. Draws the website header. This file keeps the app's
 * older call shape (`onYearChange` / `onMonthChange` / `tabs`) for screens that
 * already use it.
 */
export function PatroMonthYearNav({
  era,
  year,
  month,
  onBrowse,
  onMonthChange,
  onYearChange,
  onEraChange,
  location,
  onLocationChange,
  tabs,
  tabsLabel,
  prevDisabled,
  nextDisabled,
  crossEraSubtitle,
  className,
}: MonthYearNavProps) {
  return (
    <PatroCalendarHeader
      era={era}
      year={year}
      month={month}
      onChange={(next) => {
        if (onBrowse) {
          onBrowse(next);
          return;
        }
        if (next.year !== year) onYearChange(next.year);
        if (next.month !== month) onMonthChange(next.month);
      }}
      onEraChange={onEraChange}
      location={location}
      onLocationChange={onLocationChange}
      locate={locateDevice}
      segments={tabs}
      segmentsLabel={tabsLabel}
      prevDisabled={prevDisabled}
      nextDisabled={nextDisabled}
      crossEraSubtitle={crossEraSubtitle}
      className={className}
    />
  );
}
