import { useEffect, useState } from "react";
import { InteractionManager } from "react-native";

/** Gap between heavy mounts (a GL canvas, say) that start in the same moment. */
const STEP_MS = 350;

/** When the next heavy mount may start; shared by every caller. */
let nextSlot = 0;

/**
 * False until this component's turn. Several heavy children mounting in one
 * frame (an article with a handful of 3D diagrams) each start a GL context and
 * stall the JS thread together; this hands out turns `STEP_MS` apart, after the
 * screen has finished its navigation animation, so the page appears first and
 * the diagrams fill in one after another.
 */
export function useStaggeredMount(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      const now = Date.now();
      const slot = Math.max(now, nextSlot);
      nextSlot = slot + STEP_MS;
      timer = setTimeout(() => setReady(true), slot - now);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return ready;
}
