import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getLocalStorageItem, isBrowser, setLocalStorageItem } from "@/lib/browser";
import { sameLocationParams } from "@/lib/url-state";

const STORAGE_KEY = "dhakalPatroLocation";

import {
  DEFAULT_PANCHANGA_LOCATION,
  healStoredLocation,
  type PanchangaLocation,
} from "@vedic-patro/domain/panchanga-location";

export {
  DEFAULT_PANCHANGA_LOCATION,
  cityToLocation,
  coordsToLocation,
  displayLocationLabel,
  resolveLocationTimezone,
  type PanchangaLocation,
} from "@vedic-patro/domain/panchanga-location";

function readStoredLocation(): PanchangaLocation {
  if (!isBrowser) return DEFAULT_PANCHANGA_LOCATION;
  try {
    const raw = getLocalStorageItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PANCHANGA_LOCATION;
    const parsed = JSON.parse(raw) as PanchangaLocation;
    if (!parsed?.label || !parsed?.params) return DEFAULT_PANCHANGA_LOCATION;
    const healed = healStoredLocation(parsed);
    if (healed !== parsed) {
      setLocalStorageItem(STORAGE_KEY, JSON.stringify(healed));
    }
    return healed;
  } catch {
    return DEFAULT_PANCHANGA_LOCATION;
  }
}

type PanchangaLocationContextValue = {
  location: PanchangaLocation;
  setLocation: (next: PanchangaLocation) => void;
};

const PanchangaLocationContext = createContext<PanchangaLocationContextValue | null>(
  null,
);

/** One shared place preference for the whole app (URL mirror hooks + sidebar links). */
export function PanchangaLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState(readStoredLocation);

  const setLocation = useCallback((next: PanchangaLocation) => {
    setLocationState(next);
    setLocalStorageItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (!isBrowser) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setLocationState(readStoredLocation());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ location, setLocation }),
    [location, setLocation],
  );

  return createElement(PanchangaLocationContext.Provider, { value }, children);
}

export function usePanchangaLocation(initial?: PanchangaLocation) {
  const ctx = useContext(PanchangaLocationContext);
  const bootstrappedRef = useRef(false);

  const [location, setLocationState] = useState<PanchangaLocation>(
    () => initial ?? readStoredLocation(),
  );

  const setLocation = useCallback((next: PanchangaLocation) => {
    setLocationState(next);
    setLocalStorageItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (!isBrowser) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setLocationState(readStoredLocation());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ctx || !initial || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    if (!sameLocationParams(initial.params, ctx.location.params)) {
      ctx.setLocation(initial);
    }
  }, [ctx, initial]);

  if (ctx) {
    return ctx;
  }

  return { location, setLocation };
}
