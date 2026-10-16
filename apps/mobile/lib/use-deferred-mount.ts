import { useEffect, useState } from "react";
import { InteractionManager } from "react-native";

/** Longest a deferred section waits, even if some interaction never finishes. */
const MAX_WAIT_MS = 400;

/**
 * False on the first render, true once the screen has drawn and any running
 * navigation animation has finished. Use it to hold back below-the-fold
 * sections (and the requests they make) so the first screen appears sooner.
 */
export function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let frame: number | null = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      frame = requestAnimationFrame(() => setReady(true));
    };
    const task = InteractionManager.runAfterInteractions(finish);
    const fallback = setTimeout(finish, MAX_WAIT_MS);
    return () => {
      done = true;
      task.cancel();
      clearTimeout(fallback);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, []);
  return ready;
}
