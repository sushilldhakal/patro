import { useEffect, useState } from "react";

/** Longest a deferred section waits, even if the JS thread never goes idle. */
const MAX_WAIT_MS = 400;

/**
 * False on the first render, true once the screen has drawn and the JS thread
 * is idle. Use it to hold back below-the-fold sections (and the requests they
 * make) so the first screen appears sooner.
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
    const idle = requestIdleCallback(finish, { timeout: MAX_WAIT_MS });
    return () => {
      done = true;
      cancelIdleCallback(idle);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, []);
  return ready;
}
