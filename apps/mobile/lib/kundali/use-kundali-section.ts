import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { scrollPageToTop } from "@/lib/page-scroll";
import {
  DEFAULT_KUNDALI_SECTION,
  parseKundaliSectionFromHash,
  type KundaliSectionId,
} from "@vedic-patro/features/kundali";

function readHashSection(): KundaliSectionId {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return parseKundaliSectionFromHash(window.location.hash);
  }
  return DEFAULT_KUNDALI_SECTION;
}

/* One shared section for the open kundali: the page and the floating nav bar (which shows the
   sections on a profile's kundali) read and set the same value. */
let current: KundaliSectionId = readHashSection();
const listeners = new Set<() => void>();
function store(id: KundaliSectionId) {
  if (id === current) return;
  current = id;
  listeners.forEach((fn) => fn());
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setKundaliSection(id: KundaliSectionId) {
  store(id);
  scrollPageToTop();
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const url = `${window.location.pathname}${window.location.search}#${id}`;
    window.history.replaceState(null, "", url);
  }
}

export function useKundaliSection() {
  const section = useSyncExternalStore(subscribe, () => current);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const sync = () => store(parseKundaliSectionFromHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const setSection = useCallback((id: KundaliSectionId) => setKundaliSection(id), []);

  return { section, setSection };
}

/** A kundali opens on its first section (the app has no URL hash to keep one across profiles). */
export function useResetKundaliSection(profileId: string | undefined) {
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.location.hash) return;
    setKundaliSection(DEFAULT_KUNDALI_SECTION);
  }, [profileId]);
}
