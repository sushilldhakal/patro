/**
 * The weather page's own places: "here" (the device's GPS, else the app's chosen place) and the
 * places the reader added with "+". The reader marks one primary: the page opens on it. Adding a
 * place never touches the app's location, so no other page moves.
 */
import { useEffect, useRef, useState } from "react";
import type { LocationParams } from "@vedic-patro/api-client";
import type { PanchangaLocation } from "@vedic-patro/read-models/geography/panchanga-location";
import type { LocateDevice } from "../panchanga/use-location-selector";

/** Where the list is kept: `read` may answer now (web) or later (device). Same shape as the vastu planner's. */
export type WeatherPlacesStorage = {
  read: (key: string) => string | null | Promise<string | null>;
  write: (key: string, value: string) => void;
};

export type WeatherPlace = {
  id: string;
  label: string;
  params: LocationParams;
};
type Saved = { places: WeatherPlace[]; primaryId: string };

/** The first page: GPS, or the app's place when GPS is refused. */
export const HERE_ID = "here";
const STORAGE_KEY = "weather.places.v1";
/** Give up on GPS after this long (a permission prompt left open, no fix indoors). */
const GPS_WAIT_MS = 12_000;

export function placeId(params: LocationParams): string {
  return params.city_id != null
    ? `city:${params.city_id}`
    : `geo:${params.lat?.toFixed(2)},${params.lon?.toFixed(2)}`;
}

function parse(raw: string | null): Saved {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
    const places = Array.isArray(v?.places)
      ? v.places.filter((p) => p && typeof p.id === "string" && p.params)
      : [];
    const primaryId =
      typeof v?.primaryId === "string" &&
      (v.primaryId === HERE_ID || places.some((p) => p.id === v.primaryId))
        ? v.primaryId
        : HERE_ID;
    return { places, primaryId };
  } catch {
    return { places: [], primaryId: HERE_ID };
  }
}

export function useWeatherPlaces({
  location,
  locate,
  storage,
}: {
  location: PanchangaLocation;
  locate?: LocateDevice;
  storage?: WeatherPlacesStorage;
}) {
  // GPS once per visit; the app's place when it is refused or slow.
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsState, setGpsState] = useState<"trying" | "on" | "off">(
    locate ? "trying" : "off",
  );
  useEffect(() => {
    if (!locate) return;
    let live = true;
    const timer = setTimeout(
      () => live && setGpsState((s) => (s === "trying" ? "off" : s)),
      GPS_WAIT_MS,
    );
    locate()
      .then(({ lat, lon }) => {
        if (!live) return;
        // ~1 km: the server snaps to the nearest city anyway, and the exact position never leaves the device.
        setGps({
          lat: Math.round(lat * 100) / 100,
          lon: Math.round(lon * 100) / 100,
        });
        setGpsState((s) => (s === "trying" ? "on" : s));
      })
      .catch(() => live && setGpsState("off"))
      .finally(() => clearTimeout(timer));
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [locate]);

  const [saved, setSaved] = useState<Saved>({ places: [], primaryId: HERE_ID });
  const [index, setIndex] = useState(0);
  const opened = useRef(false);
  useEffect(() => {
    if (!storage) return;
    let live = true;
    void Promise.resolve(storage.read(STORAGE_KEY)).then((raw) => {
      if (!live) return;
      const next = parse(raw);
      setSaved(next);
      // Open on the primary place, once.
      if (!opened.current) {
        opened.current = true;
        const at =
          next.primaryId === HERE_ID
            ? 0
            : next.places.findIndex((p) => p.id === next.primaryId) + 1;
        setIndex(Math.max(0, at));
      }
    });
    return () => {
      live = false;
    };
  }, [storage]);
  const persist = (next: Saved) => {
    setSaved(next);
    storage?.write(STORAGE_KEY, JSON.stringify(next));
  };

  const usingGps = gpsState === "on" && gps != null;
  const here: WeatherPlace = {
    id: HERE_ID,
    label: usingGps ? "" : location.label,
    params: usingGps ? gps : location.params,
  };
  const pages = [here, ...saved.places];
  const at = Math.min(index, pages.length - 1);
  const current = pages[at]!;

  return {
    pages,
    index: at,
    current,
    primaryId: saved.primaryId,
    /** "Here" is waiting for GPS: no request yet, so it does not load the app's place first. */
    waiting: current.id === HERE_ID && gpsState === "trying",
    usingGps: current.id === HERE_ID && usingGps,
    /** GPS answered: "here" is the device's position (for any page, not only the current one). */
    gpsOn: usingGps,
    select: (i: number) => setIndex(Math.max(0, Math.min(pages.length - 1, i))),
    next: () => setIndex((i) => Math.min(pages.length - 1, i + 1)),
    prev: () => setIndex((i) => Math.max(0, i - 1)),
    /** Adds a place (or finds it if already there), optionally as primary, and shows it. */
    add: (place: PanchangaLocation, primary: boolean) => {
      const id = placeId(place.params);
      const exists = saved.places.findIndex((p) => p.id === id);
      const places =
        exists >= 0
          ? saved.places
          : [...saved.places, { id, label: place.label, params: place.params }];
      persist({ places, primaryId: primary ? id : saved.primaryId });
      setIndex((exists >= 0 ? exists : places.length - 1) + 1);
    },
    makePrimary: (id: string) => persist({ ...saved, primaryId: id }),
    remove: (id: string) => {
      const places = saved.places.filter((p) => p.id !== id);
      persist({
        places,
        primaryId: saved.primaryId === id ? HERE_ID : saved.primaryId,
      });
      setIndex((i) => Math.min(i, places.length));
    },
  };
}
