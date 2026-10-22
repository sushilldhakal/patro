import type { ComponentProps } from "react";
import { Canvas as R3FCanvas } from "@react-three/fiber/native";
import { useScreenActive } from "@/lib/use-screen-active";

type Props = ComponentProps<typeof R3FCanvas> & {
  /** Stop drawing frames while true, e.g. the scene is scrolled out of view. */
  paused?: boolean;
};

/**
 * r3f's canvas with its render loop and GL memory tied to whether anyone can see it: no frames
 * while the screen is blurred, the app is in the background or `paused`, and the canvas is
 * unmounted (its GL context freed) once the screen has been away for a while.
 */
export function Canvas({ paused = false, frameloop = "always", ...rest }: Props) {
  const { active, released } = useScreenActive();
  if (released) return null;
  return <R3FCanvas {...rest} frameloop={active && !paused ? frameloop : "never"} />;
}
