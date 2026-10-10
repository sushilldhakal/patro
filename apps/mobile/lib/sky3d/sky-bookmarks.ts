/**
 * पसन्द (favourites) and भर्खरै (recents) for the sky search.
 *
 * The two are stored differently on purpose, and the difference is what each
 * one is *for*.
 *
 * Recents are a convenience, they belong to the device, and nobody minds losing
 * them — so they live in this device's storage and nowhere else.
 *
 * Favourites are a decision the reader made, so a signed-in reader should find
 * them on their phone as well as their laptop. Those go to the account. Signed
 * out there is nowhere to put them but this device, so that is where they go,
 * and signing in later merges the two rather than choosing between them.
 *
 * Both are stored as bare ids from {@link SKY_CATALOGUE}, never as whole
 * entries: the catalogue is the truth about what a thing is called and where it
 * is, and a stored copy of that would go stale the moment either changed.
 *
 * Ported from the web's `src/lib/sky3d/sky-bookmarks.ts`. The one real
 * difference: `storageGet`/`storageSet` (SecureStore on native, localStorage
 * on Expo web — see `lib/auth/storage.ts`) are async, so every read here is
 * too, where the web's synchronous `localStorage` let it return plain arrays.
 */

import { authFetch } from "@/lib/auth/client";
import { storageGet, storageSet } from "@/lib/auth/storage";

const FAVOURITES_KEY = "vp.sky.favourites";
const RECENTS_KEY = "vp.sky.recents";
/** Enough to be useful, few enough that the list stays scannable. */
const RECENTS_MAX = 12;

/**
 * Where a signed-in reader's favourites live.
 *
 * NOTE: this endpoint does not exist on the API yet, on either platform. Every
 * call is wrapped so a 404 is indistinguishable from being signed out — the
 * on-device copy carries on working and nothing is lost. When the route is
 * added server-side this starts syncing on its own, with no change here.
 */
const FAVOURITES_ENDPOINT = "/profiles/sky-favourites";

async function readIds(key: string): Promise<string[]> {
  try {
    const raw = await storageGet(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    /* A quota, corrupt JSON, or something else's value in our slot. An empty
       list is a working search box; a thrown error is not. */
    return [];
  }
}

async function writeIds(key: string, ids: string[]): Promise<void> {
  await storageSet(key, JSON.stringify(ids));
}

export function localFavourites(): Promise<string[]> {
  return readIds(FAVOURITES_KEY);
}

export function saveLocalFavourites(ids: string[]): Promise<void> {
  return writeIds(FAVOURITES_KEY, ids);
}

export function recents(): Promise<string[]> {
  return readIds(RECENTS_KEY);
}

/** Most recent first, no duplicates, capped. Returns the new list. */
export async function pushRecent(id: string): Promise<string[]> {
  const next = [id, ...(await recents()).filter((v) => v !== id)].slice(0, RECENTS_MAX);
  await writeIds(RECENTS_KEY, next);
  return next;
}

/**
 * Pull the account's favourites and fold the device's in.
 *
 * Union rather than replace: the reader may have starred things before signing
 * in, and losing those at the moment they log in is the one outcome nobody
 * expects. Falls back to the on-device copy alone if the account has nothing to
 * say — including because the endpoint is not there yet.
 */
export async function syncFavourites(signedIn: boolean): Promise<string[]> {
  const local = await localFavourites();
  if (!signedIn) return local;
  try {
    const remote = await authFetch<{ ids?: string[] }>(FAVOURITES_ENDPOINT);
    const merged = [...new Set([...(remote.ids ?? []), ...local])];
    await saveLocalFavourites(merged);
    if (merged.length !== (remote.ids ?? []).length) void putFavourites(merged, true);
    return merged;
  } catch {
    return local;
  }
}

/** Write through: the device always, the account when there is one. */
export async function putFavourites(ids: string[], signedIn: boolean): Promise<void> {
  await saveLocalFavourites(ids);
  if (!signedIn) return;
  try {
    await authFetch(FAVOURITES_ENDPOINT, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    });
  } catch {
    /* Offline, or the route is not there yet. The on-device copy is written
       either way, so the star stays lit and the next sync will carry it up. */
  }
}
