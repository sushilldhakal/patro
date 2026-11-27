import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Which optional sections the home page shows (Profile → Home screen). The calendar and today's
 * panchanga are not in the list: they always stay. Stored as the hidden ids, so a section added
 * later shows by default.
 */
export const HOME_SECTIONS = ["festivals", "news", "weather", "gold", "forex", "watchlist", "shares"] as const;
export type HomeSection = (typeof HOME_SECTIONS)[number];

const KEY = "homeHiddenSections";
let hidden: ReadonlySet<HomeSection> = new Set();
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function load() {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      const ids = raw ? (JSON.parse(raw) as unknown) : [];
      if (!Array.isArray(ids)) return;
      hidden = new Set(ids.filter((id): id is HomeSection => (HOME_SECTIONS as readonly unknown[]).includes(id)));
      emit();
    })
    .catch(() => {
      /* unreadable: every section shows */
    });
}

function subscribe(fn: () => void) {
  load();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setHomeSectionShown(id: HomeSection, shown: boolean) {
  const next = new Set(hidden);
  if (shown) next.delete(id);
  else next.add(id);
  hidden = next;
  emit();
  void AsyncStorage.setItem(KEY, JSON.stringify([...next])).catch(() => {});
}

/** The hidden set; `shown(id)` is the usual question. */
export function useHomeSections() {
  const current = useSyncExternalStore(subscribe, () => hidden);
  return { shown: (id: HomeSection) => !current.has(id), hiddenCount: current.size };
}
