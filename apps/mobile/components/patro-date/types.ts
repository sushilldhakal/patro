import { type Era } from "@vedic-patro/domain/era";

/** The only three date chrome variants — used across phone and tablet. */
export type PatroDateNavMode = "year" | "year-month" | "year-month-time";

export type PatroDateNavModeProps =
  | { mode: "year" }
  | {
      mode: "year-month";
      month: number;
      onMonthChange: (month: number) => void;
      /** Year and month together (a step across a year boundary changes both). */
      onBrowse?: (next: { year: number; month: number }) => void;
    }
  | {
      mode: "year-month-time";
      month: number;
      day: number;
      onMonthChange: (month: number) => void;
      onDayChange: (day: number) => void;
      onSelectDate?: (year: number, month: number, day: number) => void;
      clock?: string;
      onClockChange?: (clock: string) => void;
      todayAd?: string;
      /** Weekday of the selected day (0 = Sunday); computed from the date when omitted. */
      weekday?: number;
    };

export type PatroDateNavBaseProps = {
  era: Era;
  onEraChange: (era: Era) => void;
  year: number;
  onYearChange: (year: number) => void;
  location: import("@/lib/use-panchanga-location").PanchangaLocation;
  onLocationChange: (location: import("@/lib/use-panchanga-location").PanchangaLocation) => void;
  onToday?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  crossEraSubtitle?: string;
  /** Toggle beside the date picker (BS | panchanga, day-night | calendar day, paksha …); one phone button when it has two options. */
  tabs?: import("./PatroHeaderTabs").PatroHeaderTab[];
  tabsLabel?: string;
  className?: string;
};

export type PatroDateNavProps = PatroDateNavBaseProps & PatroDateNavModeProps;
