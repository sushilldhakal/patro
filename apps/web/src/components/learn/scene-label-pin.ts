import type { SceneLabel } from "./DaySimScene";

/** Screen transform for a projected label — matches the original lab's CSS pins. */
export function labelPinCss(x: number, y: number, pin: SceneLabel["pin"] = "center") {
  const pos = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  if (pin === "clock") return `${pos} translate(-100%, 0) translateY(-1rem)`;
  /* Original `.earth-label { bottom: 1em }` on a centred CSS2D node. */
  if (pin === "above") return `${pos} translate(-50%, -50%) translateY(-1em)`;
  return `${pos} translate(-50%, -50%)`;
}
