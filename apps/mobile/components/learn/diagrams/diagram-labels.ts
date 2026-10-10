/**
 * Text over the canvas, not in it.
 *
 * Devanagari inside a WebGL scene means either a font atlas or a sprite sheet;
 * projecting anchors out to real React Native text is both sharper and free.
 * A scene collects its anchors during `useFrame` and the shell draws them.
 */

import { useCallback, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export type DiagramLabel = {
  id: string;
  text: string;
  color?: string;
  /** Font size in points; defaults to 10. */
  size?: number;
  /** Screen pixels to nudge the text off its anchor. */
  dx?: number;
  dy?: number;
  x: number;
  y: number;
};

export type LabelCollector = {
  /** Start a new pass; returns false when this frame is not a collecting one. */
  begin: () => boolean;
  push: (
    label: Omit<DiagramLabel, "x" | "y">,
    at: readonly [number, number, number],
  ) => void;
  end: () => void;
};

/** Anything under a pixel of movement is not worth a re-render. */
function moved(prev: DiagramLabel[], next: DiagramLabel[]): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < next.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (!a || !b) return true;
    if (a.id !== b.id || a.text !== b.text) return true;
    if (Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1) return true;
  }
  return false;
}

/**
 * @param every collect on one frame in `every` — labels do not need 60 Hz.
 */
export function useLabelProjector(
  onLabels?: (labels: DiagramLabel[]) => void,
  every = 5,
): LabelCollector {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const scratch = useRef(new THREE.Vector3());
  const frame = useRef(0);
  const collecting = useRef(false);
  const batch = useRef<DiagramLabel[]>([]);
  const shown = useRef<DiagramLabel[]>([]);

  const begin = useCallback(() => {
    frame.current += 1;
    collecting.current = Boolean(onLabels) && frame.current % every === 0;
    if (collecting.current) batch.current = [];
    return collecting.current;
  }, [onLabels, every]);

  const push = useCallback<LabelCollector["push"]>(
    (label, at) => {
      if (!collecting.current) return;
      scratch.current.set(at[0], at[1], at[2]).project(camera);
      if (scratch.current.z > 1) return;
      const x = (scratch.current.x * 0.5 + 0.5) * size.width;
      const y = (-scratch.current.y * 0.5 + 0.5) * size.height;
      if (x < -60 || y < -30 || x > size.width + 60 || y > size.height + 30) return;
      /* Nudged back inside the canvas rather than dropped: a name half off the
         edge is worse than one sitting a few pixels from its anchor. */
      batch.current.push({
        ...label,
        x: Math.min(Math.max(x, 42), Math.max(42, size.width - 42)),
        y: Math.min(Math.max(y, 10), Math.max(10, size.height - 14)),
      });
    },
    [camera, size.width, size.height],
  );

  const end = useCallback(() => {
    if (!collecting.current || !onLabels) return;
    if (!moved(shown.current, batch.current)) return;
    shown.current = batch.current;
    onLabels(batch.current);
  }, [onLabels]);

  return { begin, push, end };
}
