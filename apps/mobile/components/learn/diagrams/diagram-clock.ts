/**
 * The scrub clock behind every 3D learn diagram.
 *
 * The value the scene animates (day of year, lunar day, year CE) lives in a
 * ref so playback never re-renders React; the scene samples it back a few times
 * a second, which is all the readouts and the slider need to stay in step.
 */

import { useCallback, useRef, useState } from "react";

export type DiagramClockState = {
  value: number;
  playing: boolean;
  /** Units of `value` per real second while playing. */
  speed: number;
  min: number;
  max: number;
  loop: boolean;
};

export type DiagramClockRef = { current: DiagramClockState };

type Options = {
  initial: number;
  min: number;
  max: number;
  speed: number;
  loop?: boolean;
  autoPlay?: boolean;
};

export function useDiagramClock({ initial, min, max, speed, loop = true, autoPlay = false }: Options) {
  const clock = useRef<DiagramClockState>({
    value: initial,
    playing: autoPlay,
    speed,
    min,
    max,
    loop,
  });
  const [value, setValueState] = useState(initial);
  const [playing, setPlayingState] = useState(autoPlay);

  const setValue = useCallback((next: number) => {
    clock.current.value = next;
    setValueState(next);
  }, []);

  const setPlaying = useCallback((next: boolean) => {
    clock.current.playing = next;
    setPlayingState(next);
  }, []);

  /** Scrubbing or picking a preset always takes over from playback. */
  const scrubTo = useCallback(
    (next: number) => {
      clock.current.playing = false;
      setPlayingState(false);
      clock.current.value = next;
      setValueState(next);
    },
    [],
  );

  const onSample = useCallback((next: number) => setValueState(next), []);

  return { clock, value, playing, setValue, setPlaying, scrubTo, onSample };
}

function step(clock: DiagramClockState, delta: number): number {
  if (!clock.playing) return clock.value;
  const span = clock.max - clock.min || 1;
  let next = clock.value + delta * clock.speed;
  if (next > clock.max) {
    next = clock.loop ? clock.min + ((next - clock.min) % span) : clock.max;
    if (!clock.loop) clock.playing = false;
  }
  if (next < clock.min) next = clock.loop ? clock.max - ((clock.min - next) % span) : clock.min;
  clock.value = next;
  return next;
}

/**
 * Call the returned reader once at the top of a scene's `useFrame`: it advances
 * the clock, reports a sampled value back to React, and hands the scene the
 * value to draw this frame.
 */
export function useSceneClock(clock: DiagramClockRef, onSample?: (v: number) => void) {
  const frame = useRef(0);
  const reported = useRef(Number.NaN);

  return useCallback(
    (delta: number) => {
      const value = step(clock.current, Math.min(delta, 0.1));
      frame.current += 1;
      if (onSample && frame.current % 6 === 0 && Math.abs(value - reported.current) > 1e-4) {
        reported.current = value;
        onSample(value);
      }
      return value;
    },
    [clock, onSample],
  );
}
