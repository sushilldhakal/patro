/**
 * A Learn diagram raised over the 3D scene by the running chapter.
 *
 * Some of what this tour has to teach is not a position in space. A week is
 * seven days because of the होरा cycle; a बिक्रम month is 29 to 32 days because
 * of a quantity plotted across a year; the pole star changes because of a
 * 25,772-year cone no orbit animation can run through. The Learn library
 * already holds a diagram for each of those, so a chapter names one
 * (`overlay: "hora-weekday-cycle"`) and gets it here instead of the scene
 * pretending to make a point it cannot.
 *
 * Two things make that safe to do.
 *
 * The diagrams are written for the article body, in `--tm-*` tokens, so the
 * panel carries `tm-tokens` and paints `--tm-card` behind them — they render in
 * the reader's own theme over the dark canvas rather than inheriting nothing
 * and coming out as invisible strokes. (Same reason the fullscreen overlay
 * carries that class; see {@link ./DayPlaygroundStudy}.)
 *
 * And it is dismissible. A chapter raising a panel is a suggestion about what
 * to look at, not a takeover: closing it leaves the scene running, and the next
 * chapter's own `overlay` decides afresh.
 */

import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

import { LEARN_DIAGRAMS } from "@/lib/learn/learn-diagrams";
import { cn } from "@/lib/utils";

export function ChapterOverlay({
  id,
  onClose,
  className,
}: {
  /** A key of {@link LEARN_DIAGRAMS}. An unknown id draws nothing. */
  id: string;
  onClose: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const Diagram = LEARN_DIAGRAMS[id as keyof typeof LEARN_DIAGRAMS];
  if (!Diagram) return null;
  return (
    <div
      className={cn(
        "tm-tokens absolute z-20 flex max-h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-[var(--tm-border)] shadow-2xl",
        "bottom-3 right-3 w-[min(420px,calc(100%-1.5rem))]",
        className,
      )}
      style={{ background: "var(--tm-card)", color: "var(--tm-ink)" }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("common.close")}
        className="absolute right-1.5 top-1.5 z-10 grid size-7 cursor-pointer place-items-center rounded-full border border-[var(--tm-border)] bg-[var(--tm-card)] text-[var(--tm-ink-dim)] hover:text-[var(--tm-ink)]"
      >
        <X size={14} />
      </button>
      {/* The diagrams bring their own scrubbers and play buttons, and several
          are taller than this panel — so it scrolls rather than clipping them. */}
      <div className="min-h-0 overflow-y-auto overscroll-contain p-2.5">
        <Diagram />
      </div>
    </div>
  );
}

export default ChapterOverlay;
