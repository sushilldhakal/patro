import { useState } from "react";
import { locateDevice } from "@/components/panchanga/locate-device";
import { TopBarSlot } from "@/components/navigation/TopBarSlot";
import { usePageViewMenu } from "@/lib/page-view-menu";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { useFollowCalendarSystem, usePatroYearTopBarHeader } from "./HeaderDateTitle";
import { PatroYearNavBlock as View } from "@vedic-patro/ui/kit/shell";
import { PatroYearHeader } from "@vedic-patro/ui/kit/shell";
import { patroBrowseTodayYear } from "@vedic-patro/domain/calendar/patro-browse-params";
import { useTabletHeader } from "@/lib/tablet-ui";
import type { PatroYearBrowseNavProps } from "./PatroYearBrowseNav";

type Props = PatroYearBrowseNavProps & { className?: string };

/** Year navigation with page spacing. Draws the website header and keeps the app's call shape. */
export function PatroYearNavBlock({
  className,
  location,
  onLocationChange,
  crossEraSubtitle,
  gregorianRange,
  tabs,
  era,
  year,
  onYearChange,
  onEraChange,
  onToday,
}: Props) {
  // The page's view tabs live in the header's view menu, not in the date row.
  usePageViewMenu(tabs ? [{ key: "view", options: tabs }] : null);
  const fallback = usePanchangaLocation();
  useFollowCalendarSystem(era, onEraChange);
  const tablet = useTabletHeader();
  // Phone: home's header. The year line opens the year picker (sheet only, no stepper row).
  const [pickerOpen, setPickerOpen] = useState(false);
  const header = usePatroYearTopBarHeader({
    era, year, onYearChange, onEraChange, onToday, gregorianRange, crossEraSubtitle,
    location: location ?? fallback.location,
    onLocationChange: onLocationChange ?? fallback.setLocation,
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
      <View
        className={className ?? "mb-4"}
        era={era}
        year={year}
        onYearChange={onYearChange}
        onEraChange={onEraChange}
        onToday={onToday}
        gregorianRange={gregorianRange}
        rangeLabel={crossEraSubtitle}
        location={location ?? fallback.location}
        onLocationChange={onLocationChange ?? fallback.setLocation}
        locate={locateDevice}
      />
    </TopBarSlot>
  );
}
