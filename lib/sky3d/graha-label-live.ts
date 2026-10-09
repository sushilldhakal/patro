import { makeMutable, type SharedValue } from "react-native-reanimated";
import type { GrahaKey } from "@/lib/graha-details";

/**
 * Where each graha's name sits on screen, written by the scene every frame and
 * read on the UI thread.
 *
 * The other names go through React state a few times a second, which is cheap
 * but means a label trails the body it names whenever the sky is moving. A
 * graha's name is the one that has to stay glued to its disc, so its position
 * is carried in shared values instead — no React commit, no cadence.
 */
export type LiveGrahaLabel = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  /** 1 when the name should be drawn this frame, else 0. */
  on: SharedValue<number>;
};

const KEYS: GrahaKey[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "rahu", "ketu"];

export const LIVE_GRAHA_KEYS = KEYS;

export const liveGrahaLabels = Object.fromEntries(
  KEYS.map((key) => [key, { x: makeMutable(0), y: makeMutable(0), on: makeMutable(0) }]),
) as unknown as Record<GrahaKey, LiveGrahaLabel>;

export function hideAllLiveGrahaLabels() {
  for (const key of KEYS) {
    if (liveGrahaLabels[key].on.value !== 0) liveGrahaLabels[key].on.value = 0;
  }
}
