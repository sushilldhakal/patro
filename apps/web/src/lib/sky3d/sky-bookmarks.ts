/**
 * The browser's store for the sky search's favourites and recents — the
 * lists themselves, the merge with the account and the recents cap live in
 * `useSkyBookmarks` (@vedic-patro/features/sky3d).
 */
import "@/lib/auth/client";
import type { SkyBookmarkStorage } from "@vedic-patro/features/sky3d";

export const skyBookmarkStorage: SkyBookmarkStorage = {
  get: (key) => {
    if (typeof localStorage === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      /* Private mode or blocked storage — an empty list is a working search box. */
      return null;
    }
  },
  set: (key, value) => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Out of quota or blocked. The in-memory list is still correct for this session. */
    }
  },
};
