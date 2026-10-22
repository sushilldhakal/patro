import { Children, Fragment, isValidElement, type ReactNode } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { DURATION, EASE_OUT } from "@vedic-patro/ui/motion";
import { useDeferredMount } from "@/lib/use-deferred-mount";

/** Content that replaces a placeholder fades in; it does not move. */
const FADE_IN = FadeIn.duration(DURATION.standard).easing(EASE_OUT);

/** The children as a flat list, Fragments opened up, so each one is a sibling in its parent as before. */
function flatten(nodes: ReactNode, out: ReactNode[] = []): ReactNode[] {
  Children.forEach(nodes, (child) => {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) flatten(child.props.children, out);
    else if (child != null && typeof child !== "boolean") out.push(child);
  });
  return out;
}

/**
 * Renders `children` one settled frame after this element mounts. Being a
 * component (not a hook in the screen) matters: inside an already-deferred
 * page body it waits for that body to draw, rather than firing together with it.
 *
 * What replaces `fallback` fades in over a standard step instead of appearing in one frame. Each
 * child gets its own fading wrapper (not one around them all), so the parent's gap and stacking
 * between them stay as they were.
 */
export function Deferred({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  if (!useDeferredMount()) return <>{fallback}</>;
  return (
    <>
      {flatten(children).map((child, i) => (
        <Animated.View key={isValidElement(child) && child.key != null ? child.key : i} entering={FADE_IN}>
          {child}
        </Animated.View>
      ))}
    </>
  );
}

/** The first `first` items now, the rest once they have drawn. */
export function useStagedList<T>(items: T[], first: number): T[] {
  const all = useDeferredMount();
  return all ? items : items.slice(0, first);
}

/**
 * `children(items)` with the first `first` items now and all of them once those
 * have drawn — {@link useStagedList} as an element, so it can sit inside a page
 * body that is itself deferred.
 */
export function Staged<T>({ items, first, children }: { items: T[]; first: number; children: (items: T[]) => ReactNode }) {
  return <>{children(useStagedList(items, first))}</>;
}
