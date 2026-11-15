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

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import { createSubscriptionScope } from "@vedic-patro/domain/subscription-scope";
import { useScreenActive } from "@/lib/use-screen-active";

export type DeviceOrientation = {
  /** Compass heading, degrees, 0 = true north, clockwise. Null until the first reading arrives. */
  headingDeg: number | null;
  /** Tilt of the back camera above the horizontal, degrees. 0 = horizon, +90 = zenith. */
  pitchDeg: number | null;
  /** Whether both sensors are live — false while permissions are still being asked for. */
  available: boolean;
  /**
   * The smoothed heading and tilt, updated on every sample without a re-render. The camera reads
   * this every frame; `headingDeg` / `pitchDeg` above only change by whole degrees, for the UI.
   */
  latest: MutableRefObject<{ headingDeg: number | null; pitchDeg: number | null }>;
};

/*
 * Holding a phone up to the sky, the raw readings shake: the accelerometer picks up every tremor
 * of the hand, and the compass jitters by a degree or two. Fed straight into the camera that read
 * as a shaking sky. Star-map apps smooth both, and so does this:
 *
 * 1. Each sensor goes through a low-pass filter (the gravity vector component-wise, the heading as
 *    a unit vector so 359° → 1° doesn't swing the long way round). Hand tremor is 4–12 Hz; a
 *    time constant of ~0.2 s removes it and still follows a deliberate turn.
 * 2. The camera doesn't jump to each filtered sample; it glides toward it every frame
 *    (components/sky3d/AakashGocharSky.tsx), so the view moves at the display's rate.
 * 3. React only hears about whole-degree changes, so the screen isn't re-rendered per sample.
 */
const ACCEL_UPDATE_MS = 40;
/** Low-pass time constant for both sensors, seconds. */
const SMOOTH_TAU_S = 0.2;
/** `headingDeg` / `pitchDeg` (state) change only by at least this much. */
const UI_STEP_DEG = 1;

const RAD = 180 / Math.PI;

/** Low-pass blend for a sample `dtMs` after the last one. */
function blend(dtMs: number): number {
  return 1 - Math.exp(-Math.max(1, Math.min(500, dtMs)) / 1000 / SMOOTH_TAU_S);
}

export function useDeviceOrientation(active: boolean): DeviceOrientation {
  const [headingDeg, setHeadingDeg] = useState<number | null>(null);
  const [pitchDeg, setPitchDeg] = useState<number | null>(null);
  const [available, setAvailable] = useState(false);
  const latest = useRef<{ headingDeg: number | null; pitchDeg: number | null }>({ headingDeg: null, pitchDeg: null });

  // Sensors stop while the sky is out of sight or the app is in the background.
  const { active: screenActive } = useScreenActive();
  const live = active && screenActive;

  useEffect(() => {
    if (!live) {
      setAvailable(false);
      return;
    }
    const scope = createSubscriptionScope();
    // Filter state: heading as a unit vector, gravity as a vector, and when each last arrived.
    let hx = 0;
    let hy = 0;
    let hAt = 0;
    let gx = 0;
    let gy = 0;
    let gz = 0;
    let gAt = 0;
    let shownHeading: number | null = null;
    let shownPitch: number | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (scope.closed || status !== "granted") return;

      /* Subscriptions go through the scope so one that finishes starting after
         the effect was torn down removes itself — the cleanup below has already
         run by then and could not have. */
      const heading = await Location.watchHeadingAsync((h) => {
        if (scope.closed) return;
        const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        if (!(deg >= 0)) return;
        const now = Date.now();
        const ux = Math.cos(deg / RAD);
        const uy = Math.sin(deg / RAD);
        if (hAt === 0) {
          hx = ux;
          hy = uy;
        } else {
          const k = blend(now - hAt);
          hx += (ux - hx) * k;
          hy += (uy - hy) * k;
        }
        hAt = now;
        const smooth = (Math.atan2(hy, hx) * RAD + 360) % 360;
        latest.current.headingDeg = smooth;
        if (shownHeading == null || Math.abs(((smooth - shownHeading + 540) % 360) - 180) >= UI_STEP_DEG) {
          shownHeading = smooth;
          setHeadingDeg(smooth);
        }
      });
      if (!scope.add(heading)) return;

      Accelerometer.setUpdateInterval(ACCEL_UPDATE_MS);
      const accel = Accelerometer.addListener(({ x, y, z }) => {
        if (scope.closed) return;
        const now = Date.now();
        if (gAt === 0) {
          gx = x;
          gy = y;
          gz = z;
        } else {
          const k = blend(now - gAt);
          gx += (x - gx) * k;
          gy += (y - gy) * k;
          gz += (z - gz) * k;
        }
        gAt = now;
        const pitch = Math.atan2(-gz, -gy) * RAD;
        latest.current.pitchDeg = pitch;
        if (shownPitch == null || Math.abs(pitch - shownPitch) >= UI_STEP_DEG) {
          shownPitch = pitch;
          setPitchDeg(pitch);
        }
      });
      if (!scope.add(accel)) return;

      setAvailable(true);
    })().catch(() => {
      /* Permission/sensor failure: leave `available` false rather than leaving an unhandled rejection. */
    });

    return () => {
      scope.close();
      latest.current = { headingDeg: null, pitchDeg: null };
      setAvailable(false);
    };
  }, [live]);

  return { headingDeg, pitchDeg, available, latest };
}
