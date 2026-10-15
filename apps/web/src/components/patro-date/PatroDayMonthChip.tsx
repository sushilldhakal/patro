import { patroDateClasses } from "@vedic-patro/design-tokens/classes/patro-date-classes";
import { cn } from "@vedic-patro/domain/utils";
import {
  patroMonthChipDay,
  patroMonthChipHead,
  patroMonthChipShell,
} from "@/lib/patro-classes";

type Props = {
  /** Month label — same slot as the date nav chip head (e.g. साउन). */
  month: string;
  /** Day numeral — same slot as the date nav chip body (e.g. १७). */
  day: string;
  className?: string;
  /** Larger chip for emphasis; `compact` for dense lists (gochar ingress). */
  size?: "default" | "prominent" | "compact";
};

/**
 * Read-only month/day chip — matches the date nav's left chip styling
 * (secondary month band + bordered card day cell).
 */
export function PatroDayMonthChip({ month, day, className, size = "default" }: Props) {
  return (
    <div
      className={cn(
        patroMonthChipShell,
        "shrink-0",
        size === "prominent" && patroDateClasses.chipProminent,
        size === "compact" && patroDateClasses.chipCompact,
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          patroMonthChipHead,
          size === "compact" && patroDateClasses.chipHeadCompact,
        )}
      >
        {month}
      </div>
      <div
        className={cn(
          patroMonthChipDay,
          size === "prominent" && patroDateClasses.chipDayProminent,
          size === "compact" && patroDateClasses.chipDayCompact,
        )}
      >
        {day}
      </div>
    </div>
  );
}
