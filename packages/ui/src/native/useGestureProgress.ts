import { clamp, useDerivedValue, type SharedValue } from "react-native-reanimated";

/**
 * One 0-to-1 value for a whole interaction. A drag writes `source`; everything that reacts to it
 * (a sheet's backdrop, a card's scale, a header's fade) reads this and `interpolate`s, so no part
 * of the screen runs its own timed animation and they can never drift apart.
 *
 * `range` is where `source` sits at progress 0 and at progress 1. It may run backwards
 * (`[0, -300]` for a sheet that opens upward). Outside the range the progress holds at 0 or 1, so
 * a rubber-banded drag never pushes it past the ends.
 */
export function useGestureProgress(source: SharedValue<number>, range: readonly [number, number]): SharedValue<number> {
  const [from, to] = range;
  return useDerivedValue(() => {
    const span = to - from;
    if (span === 0) return 0;
    return clamp((source.get() - from) / span, 0, 1);
  }, [from, to]);
}
