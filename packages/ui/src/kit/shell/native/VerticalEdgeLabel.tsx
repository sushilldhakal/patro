import { Text as RNText } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { verticalEdgeLabel } from "@vedic-patro/domain/panchanga/vertical-edge-label";
import { Box } from "@vedic-patro/ui";
import type { VerticalEdgeLabelProps } from "../contract";

/** Upright text along a cell edge. React Native Text has no writing-mode, so the run is rotated. */
export function VerticalEdgeLabel({ text, side, className, color }: VerticalEdgeLabelProps) {
  if (!text || text === "—") return null;
  const { label, fontSize } = verticalEdgeLabel(text);
  return (
    <Box className={cn("pointer-events-none absolute bottom-1 top-1 z-[2] w-[1.375rem] items-center justify-center", side === "left" ? "left-0.5" : "right-0.5")}>
      <RNText
        className={cn("font-num font-semibold", className)}
        style={{ color, fontSize, transform: [{ rotate: side === "left" ? "-90deg" : "90deg" }] }}
      >
        {label}
      </RNText>
    </Box>
  );
}
