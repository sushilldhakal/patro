/**
 * What the playground actually costs, on the device it is actually running on.
 *
 * The scene was tuned for a mid-range Android by reasoning — the label pass is
 * throttled to one frame in ten, the belt glyphs are drawn only for the
 * division a body stands in, the device pixel ratio is capped at 1.75 — and
 * reasoning is not measurement. This is the measurement.
 *
 * **It has to work in a release build.** A dev bundle runs unoptimised JS and,
 * with a debugger attached, an order of magnitude slower, so a frame rate read
 * there says nothing about what a reader sees. That is why this is not gated on
 * `__DEV__`: it lives off by default behind the controls sheet, where a curious
 * reader will not trip over it but a TestFlight or internal-track build can
 * still be measured.
 *
 * ## What each number is for
 *
 * - **fps** — the average over the window. The headline, and the least
 *   interesting: a scene can average 55 and still feel broken.
 * - **worst** — the longest single frame in the window, in milliseconds. This
 *   is the one that matters here. The suspected cost is the label pass, which
 *   fires every tenth frame and replaces up to sixty `Text` nodes; if it is
 *   expensive it shows up as a periodic spike, not as a lower average. A worst
 *   frame near the average means the cost is spread; a worst frame three or
 *   four times the average means something periodic is stalling, and the label
 *   rate in `playground-labels.ts` is the first knob to turn.
 * - **draws / tris** — what the GPU was asked for, straight off the renderer.
 *   These barely move with the camera, so a frame rate that sags while they
 *   hold steady is a JS problem, not a fill-rate one — which decides whether to
 *   reach for the label rate or for `dpr`.
 */

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export type PerfSample = {
  fps: number;
  /** Longest single frame in the window, in milliseconds. */
  worstMs: number;
  drawCalls: number;
  triangles: number;
};

/** How long a window is. Half a second is steady to read and still catches a spike. */
const WINDOW_MS = 500;

/**
 * Reports a sample twice a second. Mounts inside the `Canvas`.
 *
 * Deliberately the last thing in the scene tree: `useFrame` callbacks run in
 * mount order, so measuring after the sim has done its work counts that work.
 */
export function PerfMeter({ onSample }: { onSample: (s: PerfSample) => void }) {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const elapsed = useRef(0);
  const worst = useRef(0);

  useFrame((_, delta) => {
    frames.current += 1;
    elapsed.current += delta;
    /* Clamped the same way the sim clamps its own step: a backgrounded app
       resumes with one enormous delta that is not a dropped frame. */
    if (delta < 0.5) worst.current = Math.max(worst.current, delta);
    if (elapsed.current * 1000 < WINDOW_MS) return;

    onSample({
      fps: frames.current / elapsed.current,
      worstMs: worst.current * 1000,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    });
    frames.current = 0;
    elapsed.current = 0;
    worst.current = 0;
  });

  return null;
}

export default PerfMeter;
