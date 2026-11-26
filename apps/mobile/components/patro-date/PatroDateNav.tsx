import { useState } from "react";
import { adToBS, bsToAD } from "@vedic-patro/domain/calendar/bs-calendar";
import { TopBarSlot } from "@/components/navigation/TopBarSlot";
import { usePageViewMenu } from "@/lib/page-view-menu";
import { isGregorianEra, type Era } from "@vedic-patro/domain/calendar/era";
import { defaultMonthBrowseParts, patroBrowseTodayYear } from "@vedic-patro/domain/calendar/patro-browse-params";
import { monthLengthInBrowseEra } from "@vedic-patro/domain/calendar/patro-browse-range";
import { monthShortLabel } from "@vedic-patro/domain/calendar/patro-month-labels";
import { patroEraShortLabel } from "@vedic-patro/domain/calendar/patro-era-label";
import { useLocale } from "@/lib/i18n";
import { useTabletHeader } from "@/lib/tablet-ui";
import { useFollowCalendarSystem, usePatroYearLine } from "./HeaderDateTitle";
import { PatroDayTimeHeader, PatroYearHeader } from "@vedic-patro/ui/kit/shell";
import { PatroCalendarHeader } from "./PatroCalendarHeader";
import type { PatroDateNavProps } from "./types";

/** Today's date in the browsing era, to outline in the day grid (BS and AD; other eras have no outline). */
function todayInEra(era: Era, todayAd: string | undefined): { year: number; month: number; day: number } | null {
  if (!todayAd) return null;
  const d = new Date(`${todayAd}T12:00:00`);
  if (isGregorianEra(era)) return era === "ad" ? { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() } : null;
  return era === "bs" ? adToBS(d) : null;
}

/** Weekday (0 = Sunday) of a date in the browsing era; the caller's own value wins. */
function weekdayInEra(era: Era, year: number, month: number, day: number, given?: number): number {
  if (given != null) return given;
  if (era === "bs") return bsToAD(year, month, day).getDay();
  if (era === "ad") return new Date(year, month - 1, day).getDay();
  return 0;
}

/**
 * The app's date header for every page: month + year (home, month browse), year only, or
 * day + month + year with a clock. Two rows at every width: title and location, then the
 * date picker and the toggle.
 */
export function PatroDateNav(props: PatroDateNavProps) {
  const { era, onEraChange, year, location, onLocationChange, crossEraSubtitle, tabs, className } = props;
  // The page's view tabs live in the header's view menu, not in the date row.
  usePageViewMenu(tabs ? [{ key: "view", options: tabs }] : null);
  const { lang, digits } = useLocale();
  const tablet = useTabletHeader();
  const yearLine = usePatroYearLine(era, year);
  useFollowCalendarSystem(era, onEraChange);
  // Phone: home's header. The year line opens this page's picker (year / month / day / day+time);
  // the picker draws only its sheet, no stepper row.
  const [pickerOpen, setPickerOpen] = useState(false);
  const sheetOnly = tablet ? {} : { buttonless: true, open: pickerOpen, onOpenChange: setPickerOpen };
  const place = { location, onLocationChange, title: yearLine, subtitle: crossEraSubtitle, onPick: tablet ? undefined : () => setPickerOpen(true) };

  if (props.mode === "year-month") {
    const { month } = props;
    const goToday =
      props.onToday ??
      (() => {
        const today = defaultMonthBrowseParts(era);
        if (props.onBrowse) props.onBrowse(today);
        else {
          props.onYearChange(today.year);
          props.onMonthChange(today.month);
        }
      });
    return (
      <TopBarSlot
        header={{ ...place, badgeTop: monthShortLabel(era, month, lang), badgeBottom: `${digits(1)}–${digits(monthLengthInBrowseEra(era, year, month))}`, onToday: goToday }}
      >
        <PatroCalendarHeader
          {...sheetOnly}
          monthOnly={!tablet}
          className={className}
          era={era}
          onEraChange={onEraChange}
          year={year}
          month={props.month}
          onChange={(next) => {
            if (props.onBrowse) {
              props.onBrowse(next);
              return;
            }
            if (next.year !== year) props.onYearChange(next.year);
            if (next.month !== props.month) props.onMonthChange(next.month);
          }}
          location={location}
          onLocationChange={onLocationChange}
          crossEraSubtitle={tablet ? crossEraSubtitle : undefined}
          prevDisabled={props.prevDisabled}
          nextDisabled={props.nextDisabled}
        />
      </TopBarSlot>
    );
  }


  if (props.mode === "year") {
    const goThisYear = props.onToday ?? (() => props.onYearChange(patroBrowseTodayYear(era)));
    return (
      <TopBarSlot header={{ ...place, badgeTop: patroEraShortLabel(era, lang), badgeBottom: digits(year), onToday: goThisYear }}>
        <PatroYearHeader
          {...sheetOnly}
          className={className}
          era={era}
          year={year}
          onChange={props.onYearChange}
          onEraChange={onEraChange}
          onToday={goThisYear}
          todayYear={patroBrowseTodayYear(era)}
          subtitle={crossEraSubtitle}
        />
      </TopBarSlot>
    );
  }

  return (
    <TopBarSlot header={{ ...place, badgeTop: monthShortLabel(era, props.month, lang), badgeBottom: digits(props.day), onToday: props.onToday }}>
      <PatroDayTimeHeader
        {...sheetOnly}
        className={className}
        era={era}
        year={year}
        month={props.month}
        day={props.day}
        weekday={weekdayInEra(era, year, props.month, props.day, props.weekday)}
        today={todayInEra(era, props.todayAd)}
        clock={props.clock}
        onClockChange={props.onClockChange}
        onEraChange={onEraChange}
        onSelect={(y, m, d) => {
          if (props.onSelectDate) {
            props.onSelectDate(y, m, d);
            return;
          }
          if (y !== year) props.onYearChange(y);
          if (m !== props.month) props.onMonthChange(m);
          if (d !== props.day) props.onDayChange(d);
        }}
        onStepDay={(delta) => (delta < 0 ? props.onPrev?.() : props.onNext?.())}
        onToday={() => props.onToday?.()}
        prevDisabled={props.prevDisabled}
        nextDisabled={props.nextDisabled}
        crossEraText={crossEraSubtitle}
      />
    </TopBarSlot>
  );
}
