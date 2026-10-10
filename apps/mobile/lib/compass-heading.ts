/**
 * Compass heading for aligning the 2D वास्तु wheel with the room.
 *
 * The native counterpart of the web app's `src/lib/compass-heading.ts`. The
 * hook's shape is deliberately identical — `heading`, `available`,
 * `drifting`, `permissionState`, `requestPermission` — so `app/(tabs)/vastu.tsx`
 * and `src/pages/Vastu.tsx` read the same; only the sensor underneath differs.
 *
 * Web listens to `deviceorientationabsolute` and converts `alpha` by hand.
 * Here `expo-location`'s `watchHeadingAsync` already does the
 * magnetometer/gyroscope fusion and — once a location fix lands — corrects
 * magnetic north to **true** north, the same source
 * {@link useDeviceOrientation} uses for the sky. Falls back to `magHeading`
 * when `trueHeading` is not available yet (`-1`, per `expo-location`).
 *
 * `drifting` means the same thing on both platforms: the heading is coming
 * from an uncorrected magnetic reading, so the wheel may sit a few degrees
 * off and a figure-eight wave will help. Web infers it from the absence of
 * `webkitCompassHeading`/`absolute`; here it is a low `accuracy` bucket or a
 * true-north fix that has not arrived.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

export type CompassPermissionState = "unnecessary" | "prompt-required" | "granted" | "denied";

/** `accuracy` at or below this reads as "wave the phone in a figure eight". */
const DRIFT_ACCURACY = 1;

/** Shortest-path blend so 359° → 1° does not swing the long way. */
export function dampHeading(prev: number, next: number, k = 0.28): number {
  const delta = ((next - prev + 540) % 360) - 180;
  return (prev + delta * k + 360) % 360;
}

export function useCompassHeading(active: boolean): {
  heading: number | null;
  available: boolean;
  drifting: boolean;
  permissionState: CompassPermissionState;
  requestPermission: () => Promise<boolean>;
} {
  const [heading, setHeading] = useState<number | null>(null);
  const [available, setAvailable] = useState(false);
  const [drifting, setDrifting] = useState(false);
  // Location permission is always a real prompt on device, unlike the web
  // build where only iOS Safari gates DeviceOrientation behind one.
  const [permissionState, setPermissionState] = useState<CompassPermissionState>("prompt-required");

  const prevHeading = useRef<number | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setPermissionState(granted ? "granted" : "denied");
      return granted;
    } catch {
      setPermissionState("denied");
      return false;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      prevHeading.current = null;
      setHeading(null);
      setAvailable(false);
      setDrifting(false);
      return;
    }
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (cancelled || status !== "granted") return;
      sub = await Location.watchHeadingAsync((h) => {
        if (cancelled) return;
        const trueNorth = h.trueHeading >= 0;
        const raw = trueNorth ? h.trueHeading : h.magHeading;
        if (!(raw >= 0)) return;
        const next = prevHeading.current == null ? raw : dampHeading(prevHeading.current, raw);
        prevHeading.current = next;
        setHeading(next);
        setAvailable(true);
        setDrifting(!trueNorth || h.accuracy <= DRIFT_ACCURACY);
      });
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      prevHeading.current = null;
      setAvailable(false);
    };
  }, [active]);

  return { heading, available, drifting, permissionState, requestPermission };
}
