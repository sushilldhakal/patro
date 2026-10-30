import { Minus, Plus, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import type { useSvgZoom } from "./use-svg-zoom";

/**
 * The hint and zoom buttons under an SVG learn diagram that uses `useSvgZoom`.
 * They sit below the drawing, never over it, so no label is covered on a phone.
 */
export function ZoomBar({
  zoom,
  hint,
  labels,
  extra = [],
}: {
  zoom: ReturnType<typeof useSvgZoom>;
  hint: string;
  labels: { in: string; out: string; reset: string };
  /** More buttons after the zoom ones, e.g. fullscreen. */
  extra?: { label: string; icon: ReactNode; onClick: () => void }[];
}) {
  const buttons = [
    { label: labels.in, icon: <Plus size={14} />, onClick: zoom.zoomIn },
    { label: labels.out, icon: <Minus size={14} />, onClick: zoom.zoomOut },
    ...(zoom.scale > 1 ? [{ label: labels.reset, icon: <RotateCcw size={13} />, onClick: zoom.reset }] : []),
    ...extra,
  ];
  return (
    <div className="mt-1 flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex shrink-0 gap-1.5">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            className="flex size-8 items-center justify-center rounded-full border border-border bg-card/75 shadow-sm"
            onClick={b.onClick}
            title={b.label}
            aria-label={b.label}
          >
            {b.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
