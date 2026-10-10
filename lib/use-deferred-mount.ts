import { useEffect, useState } from "react";
import { InteractionManager } from "react-native";

/**
 * False on the first render, true once the screen has drawn and any running
 * navigation animation has finished. Use it to hold back below-the-fold
 * sections (and the requests they make) so the first screen appears sooner.
 */
export function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let frame: number | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      frame = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      task.cancel();
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, []);
  return ready;
}
