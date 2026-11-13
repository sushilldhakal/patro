import { cn } from "@vedic-patro/design-tokens/cn";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { useCalculationSystemToggle } from "@vedic-patro/features/patro-date";
import type { CalculationSystemToggleProps } from "../contract";

/**
 * Drik | Surya Siddhanta — the calculation the panchanga, calendar, festivals and
 * kundali follow. Options never swap places: Drik first. Same control on web and app.
 */
export function CalculationSystemToggle({ className }: CalculationSystemToggleProps) {
  const { ariaLabel, options, select } = useCalculationSystemToggle();
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn(cls.segment, "inline-flex shrink-0 items-center", className)}>
      {options.map((option) => (
        <button
          key={option.system}
          type="button"
          role="radio"
          aria-checked={option.active}
          aria-label={option.hint}
          title={option.hint}
          onClick={() => {
            if (!option.active) select(option.system);
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
