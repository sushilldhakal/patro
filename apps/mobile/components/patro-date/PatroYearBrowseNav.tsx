import { useState } from "react";
import { locateDevice } from "@/components/panchanga/locate-device";
import { TopBarSlot } from "@/components/navigation/TopBarSlot";
import { usePageViewMenu } from "@/lib/page-view-menu";
import type { Era } from "@vedic-patro/domain/calendar/era";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { useFollowCalendarSystem, usePatroYearTopBarHeader } from "./HeaderDateTitle";
import { PatroYearNav } from "@vedic-patro/ui/kit/shell";
import { PatroYearHeader } from "@vedic-patro/ui/kit/shell";
import { patroBrowseTodayYear } from "@vedic-patro/domain/calendar/patro-browse-params";
import { useTabletUi } from "@/lib/tablet-ui";
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
  className,
  onToday,
}: PatroYearBrowseNavProps) {
  // The page's view tabs live in the header's view menu, not in the date row.
  usePageViewMenu(tabs ? [{ key: "view", options: tabs }] : null);
  const fallback = usePanchangaLocation();
  useFollowCalendarSystem(era, onEraChange);
  const tablet = useTabletUi();
  // Phone: home's header. The year line opens the year picker (sheet only, no stepper row).
  const [pickerOpen, setPickerOpen] = useState(false);
  const header = usePatroYearTopBarHeader({
    era, year, onYearChange, onEraChange, onToday, gregorianRange, crossEraSubtitle,
    location: locationProp ?? fallback.location,
    onLocationChange: onLocationChangeProp ?? fallback.setLocation,
  });
  const goThisYear = onToday ?? (() => onYearChange(patroBrowseTodayYear(era)));
  if (!tablet) {
    return (
      <TopBarSlot header={{ ...header, onPick: () => setPickerOpen(true) }}>
        <PatroYearHeader
          buttonless
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          era={era}
          year={year}
          onChange={onYearChange}
          onEraChange={onEraChange}
          onToday={goThisYear}
          todayYear={patroBrowseTodayYear(era)}
        />
      </TopBarSlot>
    );
  }
  return (
    <TopBarSlot header={header}>
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
      />
    </TopBarSlot>
  );
}
