import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { trackPageView } from "@/lib/analytics";

/**
 * Sends a GA4 pageview on pathname changes only.
 *
 * Query-string updates (`?time=`, date browse) are not new pages. Tracking
 * them made gtag wrap every `history.replaceState` and Chrome throttled
 * navigation ("Throttling navigation to prevent the browser from hanging").
 */
export function AnalyticsTracker() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
