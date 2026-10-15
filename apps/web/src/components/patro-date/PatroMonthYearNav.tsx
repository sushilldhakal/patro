import type { Era, Language } from "@vedic-patro/domain/era";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { PatroCalendarHeader, type CalendarHeaderSegment } from "./PatroCalendarHeader";

export type PatroMonthYearNavProps = {
  era: Era;
  year: number;
  month: number;
  /** The new browsed month; the caller stores it (URL or state). */
  onBrowse: (next: { year: number; month: number }) => void;
  onEraChange?: (era: Era) => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  crossEraSubtitle?: string | null;
  displayLanguage?: Language;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  /** A toggle beside the month picker (calendar | panchanga, paksha …); one phone button when it has two options. */
  segments?: CalendarHeaderSegment[];
  segmentsLabel?: string;
  className?: string;
};

/**
 * Month + year navigation — home calendar, dainik kranti, month-browse pages.
 * The redesigned header: badge, title, month + year panel, prev/next, optional
 * toggle and location.
 */
export function PatroMonthYearNav(props: PatroMonthYearNavProps) {
  const { onBrowse, ...rest } = props;
  return <PatroCalendarHeader {...rest} onChange={onBrowse} />;
}
