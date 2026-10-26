import { createContext } from "react";
import { Dimensions, type ScaledSize, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { makeMutable } from "react-native-reanimated";

/**
 * What `Reveal` reads to know when a block has scrolled into view. One value for the whole app:
 * only the page being scrolled changes it, and a page that is not on screen is frozen.
 */
export const pageScrollY = makeMutable(0);
export const pageViewportH = makeMutable(Dimensions.get("window").height);

Dimensions.addEventListener("change", ({ window }: { window: ScaledSize }) => {
  pageViewportH.set(window.height);
});

/** Pass to a page ScrollView as `onScroll`, with `scrollEventThrottle={SCROLL_EVENT_THROTTLE}`. */
export function onPageScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
  pageScrollY.set(event.nativeEvent.contentOffset.y);
}

export const SCROLL_EVENT_THROTTLE = 16;

/**
 * True inside a ScrollView that reports its scroll (`onPageScroll`): a `Reveal` there waits for its
 * block to come into view. Outside one there is nothing to wait for, so it plays when it mounts —
 * a block waiting for a scroll that never comes would stay invisible.
 */
export const ScrollRevealScope = createContext(false);
