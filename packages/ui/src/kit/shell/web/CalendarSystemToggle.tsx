import { cn } from "@vedic-patro/design-tokens/cn";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { useCalendarSystemToggle } from "@vedic-patro/features/patro-date";
import type { CalendarSystemToggleProps } from "../contract";

/**
 * BS | AD — the calendar-system preference. Independent of the UI language and
 * separate from the BBS/BC pair toggle inside the month picker. Options never
 * swap places: BS first, AD second.
 */
export function CalendarSystemToggle({ className }: CalendarSystemToggleProps) {
  const { ariaLabel, options, select } = useCalendarSystemToggle();
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn(cls.segment, "inline-flex shrink-0 items-center", className)}>
      {options.map((option) => (
        <button
          key={option.calendar}
          type="button"
          role="radio"
          aria-checked={option.active}
          aria-label={option.hint}
          title={option.hint}
          onClick={() => {
            if (!option.active) select(option.calendar);
          }}
          className={cn(
            cls.segmentItem,
            "flex-none cursor-pointer transition-colors",
            option.active ? cls.segmentItemActive : "hover:bg-card hover:text-foreground",
          )}
        >
          <span className={cn(cls.segmentLabel, option.active ? cls.segmentLabelActive : cls.segmentLabelIdle)}>
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}
