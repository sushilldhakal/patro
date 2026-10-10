/**
 * पसन्द (favourites) and भर्खरै (recents) for the sky search.
 *
 * The two are stored differently on purpose, and the difference is what each
 * one is *for*.
 *
 * Recents are a convenience, they belong to the device, and nobody minds losing
 * them — so they live in this browser and nowhere else.
 *
 * Favourites are a decision the reader made, so a signed-in reader should find
 * them on their phone as well as their laptop. Those go to the account. Signed
 * out there is nowhere to put them but this browser, so that is where they go,
 * and signing in later merges the two rather than choosing between them.
 *
 * Both are stored as bare ids from {@link SKY_CATALOGUE}, never as whole
 * entries: the catalogue is the truth about what a thing is called and where it
 * is, and a stored copy of that would go stale the moment either changed.
 */

import { authFetch } from "@/lib/auth/client";

const FAVOURITES_KEY = "vp.sky.favourites";
const RECENTS_KEY = "vp.sky.recents";
/** Enough to be useful, few enough that the list stays scannable. */
const RECENTS_MAX = 12;

/**
 * Where a signed-in reader's favourites live.
 *
 * NOTE: this endpoint does not exist on the API yet. Every call is wrapped so a
 * 404 is indistinguishable from being signed out — the browser copy carries on
 * working and nothing is lost. When the route is added server-side this starts
 * syncing on its own, with no change here.
 */
const FAVOURITES_ENDPOINT = "/profiles/sky-favourites";

function readIds(key: string): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    /* Private mode, a quota, or something else's key in our slot. An empty
       list is a working search box; a thrown error is not. */
    return [];
  }
}

function writeIds(key: string, ids: string[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* Out of quota or blocked. The in-memory list the caller holds is still
       correct for this session. */
  }
}

export function localFavourites(): string[] {
  return readIds(FAVOURITES_KEY);
}

export function saveLocalFavourites(ids: string[]): void {
  writeIds(FAVOURITES_KEY, ids);
}

export function recents(): string[] {
  return readIds(RECENTS_KEY);
}

/** Most recent first, no duplicates, capped. Returns the new list. */
export function pushRecent(id: string): string[] {
  const next = [id, ...recents().filter((v) => v !== id)].slice(0, RECENTS_MAX);
  writeIds(RECENTS_KEY, next);
  return next;
}

/**
 * Pull the account's favourites and fold the browser's in.
 *
 * Union rather than replace: the reader may have starred things before signing
 * in, and losing those at the moment they log in is the one outcome nobody
 * expects. Falls back to the browser copy alone if the account has nothing to
 * say — including because the endpoint is not there yet.
 */
export async function syncFavourites(signedIn: boolean): Promise<string[]> {
  const local = localFavourites();
  if (!signedIn) return local;
  try {
    const remote = await authFetch<{ ids?: string[] }>(FAVOURITES_ENDPOINT);
    const merged = [...new Set([...(remote.ids ?? []), ...local])];
    saveLocalFavourites(merged);
    if (merged.length !== (remote.ids ?? []).length) void putFavourites(merged, true);
    return merged;
  } catch {
    return local;
  }
}

/** Write through: the browser always, the account when there is one. */
export async function putFavourites(ids: string[], signedIn: boolean): Promise<void> {
  saveLocalFavourites(ids);
  if (!signedIn) return;
  try {
    await authFetch(FAVOURITES_ENDPOINT, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    });
  } catch {
    /* Offline, or the route is not there yet. The browser copy is written
       either way, so the star stays lit and the next sync will carry it up. */
  }
}
