/**
 * Favourites and recents for the sky search, shared by the website's and the
 * app's `components/sky3d/AakashGocharSky.tsx` (it replaced both apps' copies
 * of `lib/sky3d/sky-bookmarks.ts`).
 *
 * The two are stored differently on purpose, and the difference is what each
 * one is *for*.
 *
 * Recents are a convenience, they belong to the device, and nobody minds losing
 * them — so they live in this browser / device and nowhere else.
 *
 * Favourites are a decision the reader made, so a signed-in reader should find
 * them on their phone as well as their laptop. Those go to the account. Signed
 * out there is nowhere to put them but the device, so that is where they go,
 * and signing in later merges the two rather than choosing between them.
 *
 * Both are stored as bare ids from the sky catalogue, never as whole entries:
 * the catalogue is the truth about what a thing is called and where it is, and
 * a stored copy of that would go stale the moment either changed.
 *
 * The device store is the platform's (localStorage on the website, SecureStore
 * / localStorage in the app) and is passed in; it may be synchronous or async.
 */
import { useCallback, useEffect, useState } from "react";
import { fetchSkyFavourites, putSkyFavourites } from "@vedic-patro/api-client";

export const SKY_FAVOURITES_KEY = "vp.sky.favourites";
export const SKY_RECENTS_KEY = "vp.sky.recents";
/** Enough to be useful, few enough that the list stays scannable. */
export const SKY_RECENTS_MAX = 12;

/** A key/value device store; each call may answer synchronously or with a promise. */
export type SkyBookmarkStorage = {
  get: (key: string) => string | null | Promise<string | null>;
  set: (key: string, value: string) => void | Promise<void>;
};

/** A stored id list, or [] for anything that isn't one (an empty list is a working search box). */
export function parseSkyIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Most recent first, no duplicates, capped. */
export function withRecentSkyId(ids: string[], id: string): string[] {
  return [id, ...ids.filter((v) => v !== id)].slice(0, SKY_RECENTS_MAX);
}

function readNow(storage: SkyBookmarkStorage, key: string): string[] {
  try {
    const raw = storage.get(key);
    return raw instanceof Promise ? [] : parseSkyIds(raw);
  } catch {
    return [];
  }
}

async function readIds(storage: SkyBookmarkStorage, key: string): Promise<string[]> {
  try {
    return parseSkyIds(await storage.get(key));
  } catch {
    return [];
  }
}

async function writeIds(storage: SkyBookmarkStorage, key: string, ids: string[]): Promise<void> {
  try {
    await storage.set(key, JSON.stringify(ids));
  } catch {
    /* Out of quota or blocked. The in-memory list is still correct for this session. */
  }
}

/**
 * Where a signed-in reader's favourites live.
 *
 * NOTE: this endpoint does not exist on the API yet. Every call is wrapped so a
 * 404 is indistinguishable from being signed out — the device copy carries on
 * working and nothing is lost. When the route is added server-side this starts
 * syncing on its own, with no change here.
 */
async function putFavourites(storage: SkyBookmarkStorage, ids: string[], signedIn: boolean): Promise<void> {
  await writeIds(storage, SKY_FAVOURITES_KEY, ids);
  if (!signedIn) return;
  try {
    await putSkyFavourites(ids);
  } catch {
    /* Offline, or the route is not there yet. The device copy is written
       either way, so the star stays lit and the next sync will carry it up. */
  }
}

/**
 * Pull the account's favourites and fold the device's in. Union rather than
 * replace: the reader may have starred things before signing in, and losing
 * those at the moment they log in is the one outcome nobody expects.
 */
async function syncFavourites(storage: SkyBookmarkStorage, signedIn: boolean): Promise<string[]> {
  const local = await readIds(storage, SKY_FAVOURITES_KEY);
  if (!signedIn) return local;
  try {
    const remote = await fetchSkyFavourites();
    const merged = [...new Set([...(remote.ids ?? []), ...local])];
    await writeIds(storage, SKY_FAVOURITES_KEY, merged);
    if (merged.length !== (remote.ids ?? []).length) void putFavourites(storage, merged, true);
    return merged;
  } catch {
    return local;
  }
}

export function useSkyBookmarks({ signedIn, storage }: { signedIn: boolean; storage: SkyBookmarkStorage }) {
  const [favourites, setFavourites] = useState<string[]>(() => readNow(storage, SKY_FAVOURITES_KEY));
  const [recentIds, setRecentIds] = useState<string[]>(() => readNow(storage, SKY_RECENTS_KEY));

  /* Load the device lists, then pull the account's favourites down and fold
     this device's in. Signing in runs it again. */
  useEffect(() => {
    let alive = true;
    void readIds(storage, SKY_RECENTS_KEY).then((ids) => {
      if (alive) setRecentIds(ids);
    });
    void syncFavourites(storage, signedIn).then((ids) => {
      if (alive) setFavourites(ids);
    });
    return () => {
      alive = false;
    };
  }, [signedIn, storage]);

  const toggleFavourite = useCallback(
    (id: string) => {
      setFavourites((current) => {
        const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
        void putFavourites(storage, next, signedIn);
        return next;
      });
    },
    [signedIn, storage],
  );

  const pushRecent = useCallback(
    (id: string) => {
      setRecentIds((current) => {
        const next = withRecentSkyId(current, id);
        void writeIds(storage, SKY_RECENTS_KEY, next);
        return next;
      });
    },
    [storage],
  );

  return { favourites, recentIds, toggleFavourite, pushRecent };
}
