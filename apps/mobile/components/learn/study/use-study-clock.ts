/**
 * The time behind a Learn study: a value that a play button advances, a slider
 * scrubs and a preset jumps — as the website's studies keep it with
 * `useState` + `requestAnimationFrame`.
 *
 * It only advances while the study is on screen and the screen itself is
 * showing, so an article full of paused-off-screen studies costs nothing.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { IS_LOW_MEMORY_DEVICE } from "@/lib/device-memory";
import { useOnScreen } from "@/lib/use-on-screen";
import { useScreenActive } from "@/lib/use-screen-active";

type Options = {
  initial: number;
  /** Advance per real second while playing; or a function of the current value. */
  speed?: number;
  /**
   * Called each frame with the value and the seconds since the last frame;
   * returns the next value. Defaults to `value + dt * speed`.
   */
  step?: (value: number, dt: number) => number;
  autoPlay?: boolean;
};

/**
 * Least time between drawn frames of a study animation. Every frame re-renders the study and
 * redraws its whole SVG, labels included; at 60 a second that kept Android's main thread busy
 * enough to stutter and, on weaker phones, to freeze. Android draws at most 30 a second (20 on
 * low-memory phones), which still reads as smooth for these slow orbits. iOS draws every frame.
 */
export const STUDY_FRAME_MS = Platform.OS === "android" ? (IS_LOW_MEMORY_DEVICE ? 50 : 33) : 0;

export type StudyView = ReturnType<typeof useOnScreen>;

export function useStudyClock({ initial, speed = 1, step, autoPlay = false }: Options) {
  const [value, setValueState] = useState(initial);
  const [playing, setPlaying] = useState(autoPlay);
  const view = useOnScreen(120, true);
  const { active } = useScreenActive();
  const stepRef = useRef(step);
  stepRef.current = step;

  const running = playing && active && view.onScreen;

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (now - last < STUDY_FRAME_MS) {
        raf = requestAnimationFrame(tick);
        return;
      }
      /* A long stall (app switch, a dropped frame burst) must not jump the
         study forward by seconds. */
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setValueState((v) => (stepRef.current ? stepRef.current(v, dt) : v + dt * speed));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, speed]);

  /** A scrub or a preset takes over from playback, as on the website. */
  const scrubTo = useCallback((next: number) => {
    setPlaying(false);
    setValueState(next);
  }, []);

  const toggle = useCallback(() => setPlaying((p) => !p), []);

  return { value, setValue: setValueState, playing, setPlaying, toggle, scrubTo, view };
}

/**
 * For a study that keeps the website's own `useState` + `requestAnimationFrame`
 * loop: `live` is false while the study is scrolled away or its screen is not
 * showing, and the loop stops on it.
 */
export function useStudyLive() {
  const view = useOnScreen(120, true);
  const { active } = useScreenActive();
  return { view, live: active && view.onScreen };
}
