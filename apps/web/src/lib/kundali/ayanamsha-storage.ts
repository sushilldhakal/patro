import type { AyanamshaMode } from "@vedic-patro/domain/astronomy/ayanamsha";
import { AYANAMSHA_STORAGE_KEY, parseAyanamshaMode, type AyanamshaStorage } from "@vedic-patro/features/kundali";

/** The ayanamsha the kundali pages and Settings both read and write. */
export const ayanamshaStorage: AyanamshaStorage = {
  load: () => parseAyanamshaMode(typeof localStorage !== "undefined" ? localStorage.getItem(AYANAMSHA_STORAGE_KEY) : null),
  save: (mode: AyanamshaMode) => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(AYANAMSHA_STORAGE_KEY, mode);
  },
};
