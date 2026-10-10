import type { MouseEvent, PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { isPatroBrowseEraPair, togglePatroBrowseEra, type Era } from "@/lib/era";
import { cn } from "@/lib/utils";
import { patroEraShortLabel } from "./patro-era-short-label";

/**
 * Keep the press from reaching the combobox popup, which dismisses on an
 * outside/interaction pointerdown.
 *
 * `stopPropagation` alone does that. Calling `preventDefault` on **pointerdown**
 * as well is what breaks touch: it suppresses the compatibility mouse events the
 * browser would otherwise synthesise, and on a touch device that is the path
 * these buttons' `onClick` depends on — so the tap registers as a dismiss and
 * the era never changes. Mouse users were unaffected, which is why this only
 * ever showed up on a phone.
 */
function stopBubble(e: PointerEvent | MouseEvent) {
  e.stopPropagation();
}

/** Mouse-only: suppress the focus steal without touching the click path. */
function stopBubbleMouse(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * - `inline` — beside year on day nav (month | year | day | BBS).
 * - `dropdown` — inside the year combobox panel (year-only / month+year nav).
 */
export function PatroYearEraToggle({
  era,
  onEraChange,
  className,
  compact = false,
  comfortable = false,
  variant = "inline",
}: {
  era: Era;
  onEraChange: (era: Era) => void;
  className?: string;
  compact?: boolean;
  comfortable?: boolean;
  variant?: "inline" | "dropdown";
}) {
  const { t } = useTranslation();
  if (!isPatroBrowseEraPair(era)) return null;

  const targetEra = togglePatroBrowseEra(era);
  if (targetEra == null) return null;

  const targetLabel = patroEraShortLabel(targetEra, t);

  if (variant === "dropdown") {
    return (
      <div
        className={cn("border-b border-border px-2 pb-2 pt-1.5", className)}
        onPointerDown={stopBubble}
        onMouseDown={stopBubbleMouse}
      >
        <button
          type="button"
          data-vaul-no-drag
          className={cn(
            "flex w-full cursor-pointer items-center justify-center rounded-md border border-border bg-card px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
          )}
          aria-label={t("patro_date.switch_to_era", {
            era: targetLabel,
            defaultValue: `Switch to ${targetLabel}`,
          })}
          title={targetLabel}
          onClick={(e) => {
            stopBubble(e);
            onEraChange(targetEra);
          }}
        >
          {targetLabel}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "relative z-10 shrink-0 truncate rounded-md border border-border bg-card font-semibold text-muted-foreground transition-colors",
        "pointer-events-auto hover:bg-muted hover:text-foreground",
        compact
          ? cn(
              "inline-flex items-center justify-center px-1.5",
              comfortable ? "h-9 text-xs" : "h-6 text-[10px] sm:h-7 sm:px-2 sm:text-xs",
            )
          : "px-2 py-1.5 text-xs",
        className,
      )}
      aria-label={t("patro_date.switch_to_era", { era: targetLabel, defaultValue: `Switch to ${targetLabel}` })}
      title={targetLabel}
      onPointerDown={stopBubble}
      onMouseDown={stopBubbleMouse}
      onClick={(e) => {
        stopBubble(e);
        onEraChange(targetEra);
      }}
    >
      {targetLabel}
    </button>
  );
}
