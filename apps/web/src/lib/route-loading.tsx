import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { VedicPatroLoader } from "@/components/VedicPatroLoader";
import { isBrowser } from "@/lib/browser";
import {
  isPanchangaShellNavigation,
  shouldShowPanchangaSidebar,
} from "@/lib/app-routes";

type RouteLoadingContextValue = {
  setDataLoading: (loading: boolean) => void;
  setSuspenseLoading: (loading: boolean) => void;
};

const RouteLoadingContext = createContext<RouteLoadingContextValue | null>(null);

/** Fixed overlay below the site header; covers the full content area until the route is ready. */
export function RouteLoadingProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [dataLoading, setDataLoading] = useState(isBrowser);
  const [suspenseLoading, setSuspenseLoading] = useState(false);
  const [trackedPath, setTrackedPath] = useState(pathname);

  // Reset to "loading" synchronously DURING RENDER when the route changes, before
  // children commit. Skip the blanket overlay for panchanga-shell hops — the
  // sidebar stays mounted and pages report their own fetch state.
  if (pathname !== trackedPath) {
    const from = trackedPath;
    setTrackedPath(pathname);
    if (!isPanchangaShellNavigation(from, pathname)) {
      setDataLoading(true);
    }
    setSuspenseLoading(false);
  }

  const value = useMemo(
    () => ({ setDataLoading, setSuspenseLoading }),
    [],
  );

  const isLoading = dataLoading || suspenseLoading;
  const showOverlay = isLoading && !shouldShowPanchangaSidebar(pathname);

  return (
    <RouteLoadingContext.Provider value={value}>
      {children}
      <div
        hidden={!showOverlay}
        className="fixed inset-x-0 top-16 bottom-0 z-40 flex items-center justify-center bg-background"
        aria-busy={showOverlay}
        aria-live="polite"
      >
        {showOverlay ? <VedicPatroLoader /> : null}
      </div>
    </RouteLoadingContext.Provider>
  );
}

/** Report whether this route still has data to fetch. Call from every data-driven page. */
export function useRouteLoading(loading: boolean) {
  const ctx = useContext(RouteLoadingContext);
  if (!ctx) {
    throw new Error("useRouteLoading must be used within RouteLoadingProvider");
  }

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useLayoutEffect(() => {
    ctx.setDataLoading(loading);
  }, [loading, ctx, pathname]);
}

/** Suspense fallback for lazy route chunks — pairs with RouteLoadingProvider overlay. */
export function RouteSuspenseFallback() {
  const ctx = useContext(RouteLoadingContext);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!ctx) return;
    // Panchanga shell routes prefetch on hover; avoid blanketing sidebar + header.
    if (shouldShowPanchangaSidebar(pathname)) return;
    ctx.setSuspenseLoading(true);
    return () => ctx.setSuspenseLoading(false);
  }, [ctx, pathname]);

  return null;
}
