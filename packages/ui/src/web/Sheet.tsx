import { useEffect, useId } from "react";
import { cn } from "@vedic-patro/domain/utils";
import { kitIcons, sheetClass } from "../classes";
import type { SheetProps } from "../contract";
import { Icon } from "./Icon";

/**
 * A panel over the page: rises from the bottom on phones, centred from `sm` up.
 * Escape and a tap on the backdrop close it.
 */
export function Sheet({ open, onClose, title, closeLabel, children, className, webClassName, testID }: SheetProps) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" data-testid={testID}>
      <div className={cn("absolute inset-0", sheetClass.backdrop)} onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "relative max-h-[85vh] w-full overflow-y-auto sm:max-w-lg sm:rounded-2xl",
          sheetClass.panel,
          className,
          webClassName,
        )}
      >
        <div className={cn(sheetClass.handle, "sm:hidden")} />
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
    </div>
  );
}
