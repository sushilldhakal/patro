/**
 * Belt and body names over the playground canvas.
 *
 * Same idea as `diagram-labels.ts` — Devanagari inside a WebGL scene means a
 * font atlas, so the anchors are projected out to real React Native text
 * instead — but the playground needs three things that one deliberately does
 * not give it:
 *
 *   - **No clamping.** The shared projector nudges a label back inside the
 *     canvas rather than dropping it, which is right for a diagram with six
 *     names in it. This scene has sixty, and most of a belt is off screen at
 *     any camera angle; clamped, twenty-seven नक्षत्र names pile up along the
 *     edges in an unreadable stack. Off screen means gone here.
 *   - **A kind.** A राशि label draws its glyph, a नक्षत्र label its asterism
 *     icon, a clock label its own colour. The shell needs to know which is
 *     which without parsing the id.
 *   - **A budget.** Every collected pass re-renders that many `Text` nodes, so
 *     the pass is thrown away wholesale when nothing has moved a pixel, and the
 *     collection rate is set by the caller rather than fixed.
 *
 * The web app does none of this: there, the scene writes `transform` on the DOM
 * nodes itself sixty times a second and React never re-renders at all. React
 * Native has no equivalent that is cheaper than a re-render, so the labels are
 * sampled instead — a few times a second, which is why a name lags its body by
 * a frame or two while the sim is running at speed. That is the trade this
 * platform makes.
 */

import { useCallback, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export type PlaygroundLabelKind = "rashi" | "nakshatra" | "month" | "body" | "clock";

export type PlaygroundLabel = {
  id: string;
  kind: PlaygroundLabelKind;
  text: string;
  /** Which of the three clocks a `clock` label belongs to, for colouring. */
  tone?: "sidereal" | "solar" | "mean";
  /**
   * The division's own number, 1-based — 1–12 for राशि, 1–27 for नक्षत्र.
   *
   * The app's glyph components take a number, so unlike the web (which looks
   * its artwork up by unabbreviated name) the index is all the overlay needs
   * and no second name list has to travel with the labels.
   */
  index?: number;
  /** True when this is not the division the body being watched stands in. */
  dim: boolean;
  x: number;
  y: number;
};

export type PlaygroundLabelCollector = {
  /** Open a pass. False means this frame is not a collecting one. */
  begin: () => boolean;
  push: (label: Omit<PlaygroundLabel, "x" | "y">, at: THREE.Vector3) => void;
  end: () => void;
};

/** A pass is only worth a re-render if something in it actually moved. */
function changed(prev: PlaygroundLabel[], next: PlaygroundLabel[]): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < next.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    if (!a || !b) return true;
    if (a.id !== b.id || a.text !== b.text || a.dim !== b.dim) return true;
    if (Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1) return true;
  }
  return false;
}

/**
 * @param every collect on one frame in `every`. Ten is about six passes a
 *   second at 60fps, which is as often as sixty `Text` nodes can be replaced
 *   without the transport row starting to stutter on a mid-range Android.
 */
export function usePlaygroundLabels(
  onLabels: (labels: PlaygroundLabel[]) => void,
  every = 10,
): PlaygroundLabelCollector {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const scratch = useRef(new THREE.Vector3());
  const frame = useRef(0);
  const collecting = useRef(false);
  const batch = useRef<PlaygroundLabel[]>([]);
  const shown = useRef<PlaygroundLabel[]>([]);

  const begin = useCallback(() => {
    frame.current += 1;
    collecting.current = frame.current % every === 0;
    if (collecting.current) batch.current = [];
    return collecting.current;
  }, [every]);

  const push = useCallback<PlaygroundLabelCollector["push"]>(
    (label, at) => {
      if (!collecting.current) return;
      const p = scratch.current.copy(at).project(camera);
      /* Behind the camera. `project` still returns a finite point there, mirrored
         through the origin, so without this the far half of the belt comes back
         inside out. */
      if (p.z > 1) return;
      const x = (p.x * 0.5 + 0.5) * size.width;
      const y = (-p.y * 0.5 + 0.5) * size.height;
      if (x < -60 || y < -24 || x > size.width + 60 || y > size.height + 24) return;
      batch.current.push({ ...label, x, y });
    },
    [camera, size.width, size.height],
  );

  const end = useCallback(() => {
    if (!collecting.current) return;
    if (!changed(shown.current, batch.current)) return;
    shown.current = batch.current;
    onLabels(batch.current);
  }, [onLabels]);

  return { begin, push, end };
}
