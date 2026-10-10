import { cn } from "@/lib/utils";
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
 * Read-only month/day chip — matches {@link PatroDateNavCore} left chip styling
 * (secondary month band + bordered card day cell).
 */
export function PatroDayMonthChip({ month, day, className, size = "default" }: Props) {
  return (
    <div
      className={cn(
        patroMonthChipShell,
        "shrink-0",
        size === "prominent" && "w-[3rem] sm:w-[3.75rem] sm:rounded-[10px]",
        size === "compact" &&
          "mt-0 w-[1.85rem] rounded-[6px] sm:w-[2.15rem] sm:rounded-[8px]",
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          patroMonthChipHead,
          size === "compact" && "px-0 py-0.5 text-[10px] sm:px-0.5 sm:py-1 sm:text-xs",
        )}
      >
        {month}
      </div>
      <div
        className={cn(
          patroMonthChipDay,
          size === "prominent" && "text-base sm:min-h-[2.25rem] sm:text-lg",
          size === "compact" &&
            "min-h-0 py-0.5 text-xs sm:min-h-[1.35rem] sm:pb-0.5 sm:pt-0.5 sm:text-sm",
        )}
      >
        {day}
      </div>
    </div>
  );
}
