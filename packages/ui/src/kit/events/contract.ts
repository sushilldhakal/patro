import type { CalendarFeedState } from "@vedic-patro/features/events";

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
