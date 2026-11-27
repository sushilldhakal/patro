import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PLACES_STORAGE_KEY, type WeatherPlacesStorage } from "@vedic-patro/features/weather";
import { authFetch } from "@/lib/auth/client";

/** `{places: [{id, label, params}], primaryId}` as use-weather-places writes it. */
type Saved = { places: { id: string }[]; primaryId: string };
/** Changes wait this long before the account copy is written, so quick edits make one request. */
const SAVE_DELAY_MS = 800;

let signedIn = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveToAccount(raw: string) {
  if (!signedIn) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    // A failed write keeps the device copy; the next change or sign-in sends it again.
    void authFetch("/places", { method: "PUT", body: raw }).catch(() => {});
  }, SAVE_DELAY_MS);
}

/** The saved places (place picker and weather): plain AsyncStorage, copied to the account when signed in. */
export const placesStorage: WeatherPlacesStorage = {
  read: (key) => AsyncStorage.getItem(key),
  write: (key, value) => {
    void AsyncStorage.setItem(key, value);
    if (key === PLACES_STORAGE_KEY) saveToAccount(value);
  },
};

function parse(raw: string | null): Saved | null {
  try {
    const v = raw ? (JSON.parse(raw) as Saved) : null;
    return v && Array.isArray(v.places) && typeof v.primaryId === "string" ? v : null;
  } catch {
    return null;
  }
}

/** The account's list first, then places added on this device before signing in; the account's primary wins. */
export function mergePlaces(account: Saved | null, device: Saved | null): Saved | null {
  if (!account) return device;
  const extra = (device?.places ?? []).filter((p) => !account.places.some((a) => a.id === p.id));
  return { ...account, places: [...account.places, ...extra] };
}

/**
 * Keeps the saved places on the signed-in account, like the watchlist: on sign-in the account's list
 * comes down (places added on this device are kept after it) and every change goes back up. Signing out
 * clears the device copy, so the next person on the phone starts with their own places.
 */
export function usePlacesSync(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) {
      if (signedIn) void AsyncStorage.removeItem(PLACES_STORAGE_KEY);
      signedIn = false;
      return;
    }
    signedIn = true;
    let live = true;
    void Promise.all([authFetch<Saved | null>("/places"), AsyncStorage.getItem(PLACES_STORAGE_KEY)])
      .then(([account, local]) => {
        if (!live) return;
        const merged = mergePlaces(account, parse(local));
        if (!merged) return;
        const raw = JSON.stringify(merged);
        void AsyncStorage.setItem(PLACES_STORAGE_KEY, raw);
        if (!account || merged.places.length !== account.places.length) saveToAccount(raw);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [isAuthenticated]);
}
