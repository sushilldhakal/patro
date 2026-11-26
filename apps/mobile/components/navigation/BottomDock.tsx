import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { View } from "react-native";
import { useIsFocused } from "expo-router";

/**
 * Something a page keeps at the foot of the screen, just above the floating tab bar (rashifal's
 * rashi wheel). The page's own content sits inside a scroll, so it cannot pin anything to the
 * screen itself: it hands the element to the chrome (PageChrome), which draws it over the page
 * and under the tab bar. Only the focused page's element shows.
 */
let current: { owner: object; element: ReactNode } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** Publish `children` to the bottom dock while this page is focused. Draws nothing in place. */
export function BottomDock({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  const owner = useRef({}).current;
  useEffect(() => {
    if (!focused) {
      if (current?.owner === owner) {
        current = null;
        emit();
      }
      return;
    }
    current = { owner, element: children };
    emit();
  });
  useEffect(
    () => () => {
      if (current?.owner === owner) {
        current = null;
        emit();
      }
    },
    [owner],
  );
  return null;
}

/** Where the chrome draws the focused page's dock: edge to edge at the screen's foot. */
export function BottomDockHost() {
  const element = useSyncExternalStore(subscribe, () => current?.element ?? null, () => null);
  if (!element) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      {element}
    </View>
  );
}
