import type { IconNode } from "@vedic-patro/ui/contract";
import { useEffect, useRef, useSyncExternalStore } from "react";
// expo-router's own: @react-navigation/native's copy cannot see the router's navigator and throws.
import { useIsFocused } from "expo-router";

/** One choice in the header's view menu: the same shape as a page's header tab. */
export type PageViewOption = { key: string; label: string; active: boolean; onPress: () => void; /** Drawn before the label in the view menu (the home calendar's views). */ icon?: IconNode };

/** A group of choices; a titled group (e.g. the profiles) gets its own heading in the menu. */
export type PageViewSection = { key: string; title?: string; options: PageViewOption[] };

type Entry = { order: number; sections: PageViewSection[] };

/** Every focused contributor's groups (a page and, say, its profile list), merged in `order`. */
const entries = new Map<object, Entry>();
let merged: PageViewSection[] | null = null;
const listeners = new Set<() => void>();

function publish() {
  const all = [...entries.values()].sort((a, b) => a.order - b.order).flatMap((e) => e.sections);
  merged = all.length > 0 ? all : null;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** What the menu shows; a change in any of it is worth a redraw of the header. */
function signature(sections: PageViewSection[]): string {
  return sections
    .map((s) => `${s.key}|${s.title ?? ""}|${s.options.map((o) => `${o.key}:${o.label}:${o.active ? 1 : 0}`).join(",")}`)
    .join(";");
}

/**
 * A page hands its view choices (the tabs it used to draw: वि.सं. | पञ्चाङ्ग, अहोरात्र | दिन-रात,
 * पूरै | कृष्ण | शुक्ल, a profile list…) to the header's view menu instead of drawing them. Only the
 * focused screen's choices are shown; a screen without any leaves the menu icon out. Several parts of
 * one page may each add groups; `order` puts them in sequence (lower first).
 */
export function usePageViewMenu(sections: PageViewSection[] | null, order = 0) {
  const focused = useIsFocused();
  const owner = useRef({}).current;
  const latest = useRef(sections);
  latest.current = sections;
  const sig = sections ? signature(sections) : "";

  useEffect(() => {
    const list = latest.current?.filter((s) => s.options.length > 0) ?? [];
    if (!focused || list.length === 0) {
      if (entries.delete(owner)) publish();
      return;
    }
    // The page's handlers change every render: each choice calls the newest one.
    const wired = list.map((section) => ({
      ...section,
      options: section.options.map((option) => ({
        ...option,
        onPress: () =>
          latest.current?.find((s) => s.key === section.key)?.options.find((o) => o.key === option.key)?.onPress(),
      })),
    }));
    entries.set(owner, { order, sections: wired });
    publish();
  }, [focused, sig, owner, order]);

  useEffect(
    () => () => {
      if (entries.delete(owner)) publish();
    },
    [owner],
  );
}

/** The focused page's view choices, or null when it has none (the header then hides the icon). */
export function usePageViewSections(): PageViewSection[] | null {
  return useSyncExternalStore(subscribe, () => merged);
}
