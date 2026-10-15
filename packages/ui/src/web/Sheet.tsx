import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "@vedic-patro/domain/utils";
import { kitIcons, sheetClass } from "../classes";
import type { SheetProps } from "../contract";
import { Icon } from "./Icon";

/**
 * A panel over the page: rises from the bottom on phones, centred from `sm` up.
 * Escape and a tap on the backdrop close it.
 */
export function Sheet({ open, onClose, title, closeLabel, maxHeightPercent, placement, children, className, webClassName, testID }: SheetProps) {
  const titleId = useId();
  const top = placement === "top";
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  /* Drawn into <body>: a sticky header with backdrop-filter, or any transformed ancestor,
     would otherwise become the containing block of `fixed` and pin the sheet to its top. */
  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex justify-center", top ? "items-start" : "items-end sm:items-center")} data-testid={testID}>
      <div className={cn("absolute inset-0", sheetClass.backdrop)} onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        style={{ maxHeight: `${maxHeightPercent ?? 85}dvh` }}
        className={cn(
          "relative w-full overflow-y-auto sm:max-w-lg sm:rounded-2xl",
          top ? cn(sheetClass.panelTop, "sm:mt-16") : sheetClass.panel,
          className,
          webClassName,
        )}
      >
        {top ? null : <div className={cn(sheetClass.handle, "sm:hidden")} />}
        {title || closeLabel ? (
          <div className={cn("flex", sheetClass.header)}>
            {title ? (
              <h2 id={titleId} className={sheetClass.title}>
                {title}
              </h2>
            ) : (
              <span />
            )}
            {closeLabel ? (
              <button type="button" aria-label={closeLabel} onClick={onClose} className="rounded-md p-1 hover:bg-muted">
                <Icon node={kitIcons.x} size="md" tone="muted" />
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
