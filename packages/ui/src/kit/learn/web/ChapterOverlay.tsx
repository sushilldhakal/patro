import { Box, Icon } from "@vedic-patro/ui";
import { kitIcons } from "@vedic-patro/ui/classes";
import { cn } from "@vedic-patro/domain/utils";
import { useChapterOverlay } from "@vedic-patro/features/learn";
import type { ChapterOverlayProps } from "../contract";

/**
 * A chapter diagram over the scene. The panel carries the page's `--tm-*`
 * tokens so article diagrams keep their colours on the dark canvas.
 * Mount nothing when the chapter has no overlay.
 */
export function ChapterOverlay({ onClose, className, children }: ChapterOverlayProps) {
  const { closeLabel } = useChapterOverlay();
  return (
    <div
      className={cn(
        "tm-tokens absolute bottom-3 right-3 z-20 flex w-[min(420px,calc(100%-1.5rem))] max-h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-[var(--tm-border)] shadow-2xl",
        className,
      )}
      style={{ background: "var(--tm-card)", color: "var(--tm-ink)" }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="absolute right-1.5 top-1.5 z-10 grid size-7 cursor-pointer place-items-center rounded-full border border-[var(--tm-border)] bg-[var(--tm-card)] text-[var(--tm-ink-dim)] hover:text-[var(--tm-ink)]"
      >
        <Icon node={kitIcons.x} size={14} tone="muted" />
      </button>
      <Box className="min-h-0 overflow-y-auto overscroll-contain p-2.5">{children}</Box>
    </div>
  );
}
