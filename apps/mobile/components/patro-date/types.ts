import type { PatroBrowseEra } from "@/lib/patro-era";

import type { SamvatsaraPayload } from "@/lib/samvatsara";

/** The only three date chrome variants — used across phone and tablet. */
export type PatroDateNavMode = "year" | "year-month" | "year-month-time";

export type PatroDateNavModeProps =
  | { mode: "year" }
  | { mode: "year-month"; month: number; onMonthChange: (month: number) => void }
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
    };

export type PatroDateNavBaseProps = {
  era: PatroBrowseEra;
  onEraChange: (era: PatroBrowseEra) => void;
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
  /** Resolved Vikram parts from API (`date_parts.vikram`) — headline + samvatsara era. */
  vikramEra?: PatroBrowseEra;
  samvatsara?: SamvatsaraPayload | null;
  toolbar?: React.ReactNode;
  /** Phone row 1 right slot (e.g. day-cycle toggle on panchanga). */
  mobileToolbar?: React.ReactNode;
  /** Phone row 2 right slot — location chip (web `mobileToolbarLower`). */
  mobileToolbarLower?: React.ReactNode;
  /** Hide location in the nav row when it lives in `mobileToolbarLower` / desktop aside. */
  hideNavLocation?: boolean;
  className?: string;
};

export type PatroDateNavProps = PatroDateNavBaseProps & PatroDateNavModeProps;
