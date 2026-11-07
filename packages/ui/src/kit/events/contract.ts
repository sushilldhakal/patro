import type { ReactNode } from "react";
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
  /** App only: a row was tapped — show that event's details. */
  onOpen?: (event: CalendarEvent) => void;
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
  /** Opens an event: its details card in the app, the edit form on the website. */
  onOpenEvent: (event: CalendarEvent) => void;
  /** App only: a festival or holiday in the all-day row was tapped. */
  onOpenMark?: (date: string, name: string, holiday: boolean) => void;
  /** App only: the personal-day chip (शुभ / अष्टम चन्द्र …) was tapped — show its reading in a dialog. */
  onOpenPersonal?: (date: string, column: PersonalColumn) => void;
  /** A drag or resize ended: save these times. */
  onMoveEvent: (event: CalendarEvent, times: EventTimes) => void;
  /**
   * Start a new event. The app calls it on a long press of an empty slot or a day (a tap only looks),
   * and on a tap of a best-time placeholder; the website on a click. `extra` carries the
   * placeholder's end and a suggested title.
   */
  onCreateAt: (date: string, time: string, extra?: PlannerSlotExtra) => void;
  /**
   * App only: an event is being dragged (true) or let go (false). The hour grid is part of the page's
   * own scroll (no scroll box inside a scroll box, which iOS cannot hand a swipe across), so the page
   * stops scrolling while a block is dragged.
   */
  onDragChange?: (dragging: boolean) => void;
  /** App only: wraps the views under the toolbar, so a left / right swipe steps back or forward as the month grid's does. */
  wrapBody?: (body: ReactNode) => ReactNode;
};
