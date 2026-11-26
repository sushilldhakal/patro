import { useEffect, useSyncExternalStore } from "react";
import { authFetch } from "@/lib/auth/client";
import { deviceStore } from "@/lib/device-store";

/** `share:NABIL`, `forex:USD`, `metal:gold`. */
export type WatchKind = "share" | "forex" | "metal";
const KEY = "market.watchlist";
/** Changes wait this long before the account copy is written, so quick taps make one request. */
const SAVE_DELAY_MS = 800;

let ids: string[] = [];
let signedIn = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function set(next: string[]) {
  ids = next;
  listeners.forEach((l) => l());
  void deviceStore.set(KEY, ids);
}

void deviceStore.get<string[]>(KEY).then((saved) => {
  if (Array.isArray(saved) && !ids.length) set(saved);
});

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function saveToAccount() {
  if (!signedIn) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    // A failed write keeps the device copy; the next change or sign-in sends it again.
    void authFetch("/watchlist", { method: "PUT", body: JSON.stringify({ items: ids }) }).catch(() => {});
  }, SAVE_DELAY_MS);
}

/**
 * Keeps the watchlist on the signed-in account: on sign-in the account's list comes down (items
 * starred on this device beforehand are added after it), and every change goes back up. Signing
 * out clears the device copy, so the next person on the phone starts with an empty list.
 */
export function useWatchlistSync(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) {
      if (signedIn) set([]);
      signedIn = false;
      return;
    }
    signedIn = true;
    let live = true;
    void authFetch<{ items: string[] }>("/watchlist")
      .then(({ items }) => {
        if (!live) return;
        const merged = [...items, ...ids.filter((x) => !items.includes(x))];
        set(merged);
        if (merged.length !== items.length) saveToAccount();
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [isAuthenticated]);
}

/** Starred items of one kind (scrips, currencies, metals), newest first. */
export function useWatchlist(kind: WatchKind) {
  const all = useSyncExternalStore(subscribe, () => ids);
  const prefix = `${kind}:`;
  const mine = all.filter((x) => x.startsWith(prefix)).map((x) => x.slice(prefix.length));
  return {
    ids: mine,
    has: (id: string) => mine.includes(id),
    toggle: (id: string) => {
      const full = prefix + id;
      set(ids.includes(full) ? ids.filter((x) => x !== full) : [full, ...ids]);
      saveToAccount();
    },
    remove: (id: string) => {
      set(ids.filter((x) => x !== prefix + id));
      saveToAccount();
    },
  };
}

/** Every starred item, newest first, as `kind:id`. */
export function useWatchlistAll(): string[] {
  return useSyncExternalStore(subscribe, () => ids);
}

/** Removes one `kind:id` entry (the watchlist page's swipe). */
export function removeWatched(entry: string) {
  set(ids.filter((x) => x !== entry));
  saveToAccount();
}
