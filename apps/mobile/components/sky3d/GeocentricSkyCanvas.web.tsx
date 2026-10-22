import type { ComponentProps } from "react";
import { Canvas as R3FCanvas } from "@react-three/fiber";

/** The website's canvas has no screen focus to follow; `paused` is accepted so callers are the same on both. */
export function Canvas({ paused: _paused, ...rest }: ComponentProps<typeof R3FCanvas> & { paused?: boolean }) {
  return <R3FCanvas {...rest} />;
}
