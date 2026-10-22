import { cn } from "@vedic-patro/design-tokens/cn";
import { verticalEdgeLabel } from "@vedic-patro/domain/panchanga/vertical-edge-label";
import { Box } from "@vedic-patro/ui";
import type { VerticalEdgeLabelProps } from "../contract";

/** Upright text along a cell edge. The website uses writing-mode. */
export function VerticalEdgeLabel({ text, side, className, insetClass = "inset-y-1", align = "center" }: VerticalEdgeLabelProps) {
  const { label, fontSize } = verticalEdgeLabel(text);
  return (
    <Box className={cn("pointer-events-none absolute z-[2] flex w-[1.375rem] items-center justify-center overflow-visible max-md:hidden", insetClass, side === "left" ? "left-0.5" : "right-0.5")}>
      {/* The left run is turned 180°, so its "start" is the cell's bottom. */}
      <Box
        className={cn(
          "flex h-full w-full flex-col items-center overflow-hidden px-px py-0.5",
          align === "end" ? (side === "left" ? "justify-start" : "justify-end") : "justify-center",
          side === "left" && "rotate-180",
        )}
      >
        <span className={cn("inline-block max-h-full whitespace-nowrap font-num font-semibold leading-[1.4] tracking-wide [text-orientation:mixed] [writing-mode:vertical-rl]", className)} style={{ fontSize }}>
          {label}
        </span>
      </Box>
    </Box>
  );
}
