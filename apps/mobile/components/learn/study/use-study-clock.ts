/**
 * The time behind a Learn study: a value that a play button advances, a slider
 * scrubs and a preset jumps — as the website's studies keep it with
 * `useState` + `requestAnimationFrame`.
 *
 * It only advances while the study is on screen and the screen itself is
 * showing, so an article full of paused-off-screen studies costs nothing.
 */
import { useCallback, useEffect, useRef, useState } from "react";
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
