/**
 * The device's store for the sky search's favourites and recents
 * (SecureStore on native, localStorage on Expo web — see `lib/auth/storage.ts`).
 * The lists themselves, the merge with the account and the recents cap live
 * in `useSkyBookmarks` (@vedic-patro/features/sky3d).
 */
import "@/lib/auth/client";
import type { SkyBookmarkStorage } from "@vedic-patro/features/sky3d";
import { storageGet, storageSet } from "@/lib/auth/storage";

export const skyBookmarkStorage: SkyBookmarkStorage = { get: storageGet, set: storageSet };
