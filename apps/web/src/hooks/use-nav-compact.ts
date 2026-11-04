import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/** Distance scrolled one way before the bar changes (so a jitter doesn't flip it). */
const FOLD_AFTER = 28;
const UNFOLD_AFTER = 18;
/** Near the top the bar is always full. */
const TOP_ZONE = 48;

/**
 * The floating bottom bar's compact state, Revolut-style (the app's lib/nav-compact.ts): scrolling the
 * page down folds the bar to its icons; scrolling back up, reaching the top or opening a new page
 * unfolds it.
 */
export function useNavCompact(): boolean {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Folded for one page only: a new page reads as unfolded until its own scroll folds it.
  const [foldedOn, setFoldedOn] = useState<string | null>(null);
  const setCompact = (value: boolean) => setFoldedOn(value ? pathname : null);

  useEffect(() => {
    let last = window.scrollY;
    let anchor = last;
    let folded = false;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const prev = last;
      last = y;
      if (y <= TOP_ZONE) {
        anchor = y;
        if (folded) setCompact((folded = false));
        return;
      }
      const down = y > prev;
      if ((down && anchor > y) || (!down && anchor < y)) anchor = prev;
      if (down && !folded && y - anchor > FOLD_AFTER) setCompact((folded = true));
      else if (!down && folded && anchor - y > UNFOLD_AFTER) setCompact((folded = false));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps -- setCompact only closes over pathname

  return foldedOn === pathname;
}
