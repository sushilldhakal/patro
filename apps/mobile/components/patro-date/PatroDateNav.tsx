import { adToBS, bsToAD } from "@vedic-patro/domain/calendar/bs-calendar";
import { isGregorianEra, type Era } from "@vedic-patro/domain/calendar/era";
import { patroBrowseTodayYear } from "@vedic-patro/domain/calendar/patro-browse-params";
import { PatroDayTimeHeader, PatroYearHeader } from "@vedic-patro/ui/kit/shell";
import { PatroCalendarHeader } from "./PatroCalendarHeader";
import { PatroHeaderLocation } from "./PatroHeaderLocation";
import { PatroHeaderTabs } from "./PatroHeaderTabs";
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
  const { era, onEraChange, year, location, onLocationChange, crossEraSubtitle, tabs, tabsLabel, className } = props;

  if (props.mode === "year-month") {
    return (
      <PatroCalendarHeader
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
        crossEraSubtitle={crossEraSubtitle}
        prevDisabled={props.prevDisabled}
        nextDisabled={props.nextDisabled}
        segments={tabs}
        segmentsLabel={tabsLabel}
      />
    );
  }

  const locationButton = <PatroHeaderLocation location={location} onLocationChange={onLocationChange} />;
  const tabsView = tabs ? <PatroHeaderTabs tabs={tabs} label={tabsLabel} /> : null;

  if (props.mode === "year") {
    return (
      <PatroYearHeader
        className={className}
        era={era}
        year={year}
        onChange={props.onYearChange}
        onEraChange={onEraChange}
        onToday={props.onToday ?? (() => props.onYearChange(patroBrowseTodayYear(era)))}
        todayYear={patroBrowseTodayYear(era)}
        subtitle={crossEraSubtitle}
        titleAside={locationButton}
        navAside={tabsView}
      />
    );
  }

  return (
    <PatroDayTimeHeader
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
      titleAside={locationButton}
      navAside={tabsView}
    />
  );
}
