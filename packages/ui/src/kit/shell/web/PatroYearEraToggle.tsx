import type { MouseEvent, PointerEvent } from "react";
import { cn } from "@vedic-patro/domain/utils";
import { patroDateClasses as era } from "@vedic-patro/design-tokens/classes/patro-date-classes";
import { usePatroYearEraToggle } from "@vedic-patro/features/patro-date";
import type { PatroYearEraToggleProps } from "../contract";

function stopBubble(event: PointerEvent | MouseEvent) {
  event.stopPropagation();
}

function stopBubbleMouse(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

/** BS↔BBS / AD↔BC. Pointer handling keeps the press from closing the year popup. */
export function PatroYearEraToggle({ era: current, onEraChange, className, compact = false, comfortable = false, variant = "inline" }: PatroYearEraToggleProps) {
  const toggle = usePatroYearEraToggle(current);
  if (!toggle) return null;
  const { targetEra, label, ariaLabel } = toggle;
  const change = (event: MouseEvent) => {
    stopBubble(event);
    onEraChange(targetEra);
  };

  if (variant === "dropdown") {
    return (
      <div className={cn("border-b border-border px-2 pb-2 pt-1.5", className)} onPointerDown={stopBubble} onMouseDown={stopBubbleMouse}>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-center rounded-md border border-border bg-card px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={ariaLabel}
          title={label}
          onClick={change}
        >
          {label}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "relative z-10 truncate transition-colors",
        era.eraToggle,
        era.eraToggleLabel,
        "pointer-events-auto hover:bg-muted hover:text-foreground",
        compact
          ? cn("inline-flex items-center justify-center", era.eraToggleCompact, comfortable ? cn("h-9", era.eraToggleLabelRegular) : cn("h-6 sm:h-7 sm:px-2 sm:text-xs", era.eraToggleLabelCompact))
          : cn(era.eraToggleRegular, era.eraToggleLabelRegular),
        className,
      )}
      aria-label={ariaLabel}
      title={label}
      onPointerDown={stopBubble}
      onMouseDown={stopBubbleMouse}
      onClick={change}
    >
      {label}
    </button>
  );
}
