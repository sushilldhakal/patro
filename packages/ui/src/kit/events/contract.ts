import type { CalendarEvent } from "@vedic-patro/api-client";
import type { BestSlot, CalendarFeedState, DayMark, HomeView, PersonalColumn, PlannerSlotExtra, PlannerViewKind, SlotSource } from "@vedic-patro/features/events";

/**
 * The new-event form's date and time pickers, drawn like Apple Calendar's inline ones; the same
 * props on the website and in the app.
 */

export type IosMonthGridProps = {
  /** The chosen BS day. */
  year: number;
  month: number;
  day: number;
  /** BS years the ‹ › arrows may reach. */
  yearOptions: number[];
  /** A tap picks at once (no Done). */
  onSelect: (year: number, month: number, day: number) => void;
};

export type DayEventsProps = {
  /** One day's events, earliest first (from `useDayEvents`); nothing is drawn when empty. */
  events: CalendarEvent[];
};

export type TimeWheelProps = {
  /** "HH:MM", 24-hour. */
  value: string;
  onChange: (time: string) => void;
};

export type CalendarFeedCardProps = {
  /** From `useCalendarFeed`. */
  feed: CalendarFeedState;
  /** Opens a link (the webcal one for Apple, Google's page). */
  onOpen: (url: string) => void;
  /** Puts the https link on the clipboard, or hands it to the share sheet. */
  onCopy: (url: string) => void;
  /** "copy" (website) or "share" (the app's share sheet, which can copy too). */
  copyMode: "copy" | "share";
  /** Apple Calendar's button: on Apple devices and the website. */
  showApple: boolean;
};

export type EventTimes = { starts_at: string; ends_at: string };

/** The planner views of the home calendar: week, day and year grids and a list, one contract for both apps. */
export type PlannerViewProps = {
  view: PlannerViewKind;
  /** The date the view is centred on, AD "YYYY-MM-DD". */
  anchor: string;
  onAnchorChange: (date: string) => void;
  onViewChange: (view: HomeView) => void;
  events: CalendarEvent[];
  /** Festivals and public holidays by AD date. */
  marks: Map<string, DayMark>;
  /** Best-time placeholders by AD date. */
  slots: Map<string, BestSlot[]>;
  /** Day-long yogas (सर्वार्थ सिद्धि) by AD date, drawn in the all-day row. */
  yogas: Map<string, SlotSource[]>;
  /** The signed-in profile's filter for each date. Empty for a guest. */
  personal: Map<string, PersonalColumn>;
  todayAd: string;
  /** Opens an event (the edit form). */
  onOpenEvent: (event: CalendarEvent) => void;
  /** A drag or resize ended: save these times. */
  onMoveEvent: (event: CalendarEvent, times: EventTimes) => void;
  /** An empty cell or a placeholder was tapped. `extra` carries the placeholder's end and a suggested title. */
  onCreateAt: (date: string, time: string, extra?: PlannerSlotExtra) => void;
  /**
   * App only: an event is being dragged (true) or let go (false). The hour grid is part of the page's
   * own scroll (no scroll box inside a scroll box, which iOS cannot hand a swipe across), so the page
   * stops scrolling while a block is dragged.
   */
  onDragChange?: (dragging: boolean) => void;
};
