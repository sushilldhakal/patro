import { useState } from "react";
import { locateDevice } from "@/components/panchanga/locate-device";
import { TopBarSlot } from "@/components/navigation/TopBarSlot";
import { usePageViewMenu } from "@/lib/page-view-menu";
import { PatroCalendarHeader } from "@vedic-patro/ui/kit/shell";
import type { PatroDateNavProps } from "./types";
import { defaultMonthBrowseParts } from "@vedic-patro/domain/calendar/patro-browse-params";
import { monthLengthInBrowseEra } from "@vedic-patro/domain/calendar/patro-browse-range";
import { monthShortLabel } from "@vedic-patro/domain/calendar/patro-month-labels";
import { useLocale } from "@/lib/i18n";
import { useTabletHeader } from "@/lib/tablet-ui";
import { useFollowCalendarSystem, usePatroYearLine } from "./HeaderDateTitle";

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
  prevDisabled,
  nextDisabled,
  crossEraSubtitle,
  className,
  onToday,
}: MonthYearNavProps) {
  // The page's view tabs live in the header's view menu, not in the date row.
  usePageViewMenu(tabs ? [{ key: "view", options: tabs }] : null);
  const { lang, digits } = useLocale();
  const tablet = useTabletHeader();
  const yearLine = usePatroYearLine(era, year);
  useFollowCalendarSystem(era, onEraChange);
  // Phone: home's header. The year line opens the month/year picker (sheet only, no stepper row).
  const [pickerOpen, setPickerOpen] = useState(false);
  const browse = (next: { year: number; month: number }) => {
    if (onBrowse) {
      onBrowse(next);
      return;
    }
    if (next.year !== year) onYearChange(next.year);
    if (next.month !== month) onMonthChange(next.month);
  };
  return (
    <TopBarSlot
      header={{
        location,
        onLocationChange,
        title: yearLine,
        subtitle: crossEraSubtitle,
        badgeTop: monthShortLabel(era, month, lang),
        badgeBottom: `${digits(1)}–${digits(monthLengthInBrowseEra(era, year, month))}`,
        onToday: onToday ?? (() => browse(defaultMonthBrowseParts(era))),
        onPick: tablet ? undefined : () => setPickerOpen(true),
      }}
    >
      <PatroCalendarHeader
        {...(tablet ? {} : { buttonless: true, open: pickerOpen, onOpenChange: setPickerOpen })}
        monthOnly={!tablet}
        era={era}
        year={year}
        month={month}
        onChange={browse}
        onEraChange={onEraChange}
        location={location}
        onLocationChange={onLocationChange}
        locate={locateDevice}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
        crossEraSubtitle={tablet ? crossEraSubtitle : undefined}
        className={className}
      />
    </TopBarSlot>
  );
}
