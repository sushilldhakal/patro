import { Text as RNText } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { verticalEdgeLabel } from "@vedic-patro/domain/panchanga/vertical-edge-label";
import { Box } from "@vedic-patro/ui";
import type { VerticalEdgeLabelProps } from "../contract";

/** Upright text along a cell edge. React Native Text has no writing-mode, so the run is rotated. */
export function VerticalEdgeLabel({ text, side, className, color, align = "center" }: VerticalEdgeLabelProps) {
  if (!text || text === "—") return null;
  const { label, fontSize } = verticalEdgeLabel(text);
  // Laid out flat, then turned: give the run its own length so it never wraps
  // inside the narrow strip, and lift it by half the turn when it sits at the end.
  const runLength = Math.ceil(label.length * fontSize * 0.62) + 4;
  const lineHeight = Math.ceil(fontSize * 1.3);
  return (
    <Box
      className={cn(
        "pointer-events-none absolute bottom-1 top-1 z-[2] w-[1.375rem] items-center",
        align === "end" ? "justify-end" : "justify-center",
        side === "left" ? "left-0.5" : "right-0.5",
      )}
    >
      <RNText
        numberOfLines={1}
        className={cn("font-num font-semibold", className)}
        style={{
          color,
          fontSize,
          lineHeight,
          width: runLength,
          textAlign: "center",
          marginBottom: align === "end" ? (runLength - lineHeight) / 2 : 0,
          transform: [{ rotate: side === "left" ? "-90deg" : "90deg" }],
        }}
      >
        {label}
      </RNText>
    </Box>
  );
}
