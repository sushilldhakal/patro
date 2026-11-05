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
