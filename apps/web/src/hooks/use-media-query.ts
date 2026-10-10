import { useEffect, useState } from "react";

/**
 * Track a CSS media query from JS. Only for things CSS cannot express — option
 * text inside a <select>, for instance. Prefer plain responsive classes when
 * the difference is purely visual.
 *
 * Server renders (and the first client paint) report `false`, so write queries
 * such that the desktop branch is the safe default.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

/** Below Tailwind's `md` — where the date nav switches to its stacked layout. */
export const BELOW_MD_MQ = "(max-width: 767.98px)";
