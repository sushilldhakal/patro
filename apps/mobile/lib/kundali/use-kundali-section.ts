import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { scrollPageToTop } from "@/lib/page-scroll";
import {
  DEFAULT_KUNDALI_SECTION,
  parseKundaliSectionFromHash,
  type KundaliSectionId,
} from "@/lib/kundali/kundali-section-nav";

function readHashSection(): KundaliSectionId {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return parseKundaliSectionFromHash(window.location.hash);
  }
  return DEFAULT_KUNDALI_SECTION;
}

export function useKundaliSection() {
  const [section, setSectionState] = useState<KundaliSectionId>(readHashSection);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const sync = () => setSectionState(parseKundaliSectionFromHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const setSection = useCallback((id: KundaliSectionId) => {
    setSectionState(id);
    scrollPageToTop();
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const url = `${window.location.pathname}${window.location.search}#${id}`;
      window.history.replaceState(null, "", url);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && !window.location.hash) {
      setSection(DEFAULT_KUNDALI_SECTION);
    }
  }, [setSection]);

  return { section, setSection };
}
