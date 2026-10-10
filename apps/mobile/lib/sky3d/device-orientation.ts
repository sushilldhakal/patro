/**
 * The phone's own compass heading and tilt — what AR mode points the sky at.
 *
 * Two different sensors, because they answer two different questions well:
 *
 * - **Heading** (which way you're facing) comes from `expo-location`'s
 *   `watchHeadingAsync`, not the raw magnetometer. It already does the
 *   magnetometer/gyroscope fusion and — when a location fix is available —
 *   corrects magnetic north to **true** north, which is the frame the sky
 *   itself is drawn in (`altAzToVec3`'s az: 0=north, 90=east, clockwise).
 *   Falls back to `magHeading` when `trueHeading` isn't available yet
 *   (`-1`, per `expo-location`'s convention).
 *
 * - **Pitch** (how far the phone is tilted back from vertical, which is how
 *   far up the back camera is pointing) comes from the accelerometer's
 *   gravity vector instead of `DeviceMotion`'s Euler `rotation`, because a
 *   gravity vector's geometry is unambiguous where Euler-angle conventions
 *   vary by platform and library version.
 *
 * ## The pitch formula, and its one real assumption
 *
 * `expo-sensors`' axis convention (matching the W3C DeviceOrientation model
 * most mobile platforms share): +x is screen-right, +y is screen-up, +z is
 * out of the screen toward the person holding it. Held vertically — screen
 * facing you, back camera pointed at the horizon — gravity reads as
 * `(0, -1, 0)` in the phone's own frame. Tip the top of the phone away from
 * you, aiming the back camera up at the sky, and that same fixed
 * world-down vector rotates into the phone's frame as
 * `(0, -cos(pitch), -sin(pitch))` — so `pitch = atan2(-z, -y)` reads 0° at
 * the horizon and +90° at the zenith without needing to know which Euler
 * convention the platform happens to report.
 *
 * That derivation has not been checked against a physical device from this
 * session — there was none to check it against. If the sky tilts the wrong
 * way in AR mode, the fix is a one-line sign flip on `pitch` below, not a
 * rewrite.
 */

import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";

export type DeviceOrientation = {
  /** Compass heading, degrees, 0 = true north, clockwise. Null until the first reading arrives. */
  headingDeg: number | null;
  /** Tilt of the back camera above the horizontal, degrees. 0 = horizon, +90 = zenith. */
  pitchDeg: number | null;
  /** Whether both sensors are live — false while permissions are still being asked for. */
  available: boolean;
};

const ACCEL_UPDATE_MS = 100;

export function useDeviceOrientation(active: boolean): DeviceOrientation {
  const [headingDeg, setHeadingDeg] = useState<number | null>(null);
  const [pitchDeg, setPitchDeg] = useState<number | null>(null);
  const [available, setAvailable] = useState(false);

  // Read inside the effect via refs rather than in the dependency array —
  // the two subscriptions are independent and neither should tear the other
  // down just because a sample nudged the other's state.
  const headingRef = useRef(headingDeg);
  headingRef.current = headingDeg;

  useEffect(() => {
    if (!active) {
      setAvailable(false);
      return;
    }
    let cancelled = false;
    let headingSub: Location.LocationSubscription | null = null;
    let accelSub: { remove: () => void } | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== "granted") return;

      headingSub = await Location.watchHeadingAsync((h) => {
        if (cancelled) return;
        const heading = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        if (heading >= 0) setHeadingDeg(heading);
      });

      Accelerometer.setUpdateInterval(ACCEL_UPDATE_MS);
      accelSub = Accelerometer.addListener(({ x, y, z }) => {
        if (cancelled) return;
        const pitch = Math.atan2(-z, -y) * (180 / Math.PI);
        setPitchDeg(pitch);
      });

      if (!cancelled) setAvailable(true);
    })();

    return () => {
      cancelled = true;
      headingSub?.remove();
      accelSub?.remove();
      setAvailable(false);
    };
  }, [active]);

  return { headingDeg, pitchDeg, available };
}
