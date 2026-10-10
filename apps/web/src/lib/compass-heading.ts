/**
 * Compass heading for aligning a 2D wheel with the room (Vastu Brahmasthan).
 * Prefers iOS `webkitCompassHeading`; otherwise converts absolute `alpha`.
 * iOS 13+ must call {@link useCompassHeading}'s `requestPermission` from a tap.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type CompassPermissionState = "unnecessary" | "prompt-required" | "granted" | "denied";

type IOSOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

type IOSOrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function needsIOSPermission(): boolean {
  if (typeof window === "undefined") return false;
  const ctor = window.DeviceOrientationEvent as IOSOrientationEventConstructor | undefined;
  return typeof ctor?.requestPermission === "function";
}

const ORIENTATION_EVENT: "deviceorientationabsolute" | "deviceorientation" =
  typeof window !== "undefined" && "ondeviceorientationabsolute" in window
    ? "deviceorientationabsolute"
    : "deviceorientation";

function screenAngleDeg(): number {
  if (typeof screen !== "undefined" && screen.orientation) return screen.orientation.angle;
  if (typeof window === "undefined") return 0;
  const legacy = (window as Window & { orientation?: number }).orientation;
  return typeof legacy === "number" ? legacy : 0;
}

/** Shortest-path blend so 359° → 1° does not swing the long way. */
export function dampHeading(prev: number, next: number, k = 0.28): number {
  const delta = ((next - prev + 540) % 360) - 180;
  return (prev + delta * k + 360) % 360;
}

function headingFromEvent(e: IOSOrientationEvent): number | null {
  if (typeof e.webkitCompassHeading === "number" && Number.isFinite(e.webkitCompassHeading)) {
    return ((e.webkitCompassHeading % 360) + 360) % 360;
  }
  if (e.alpha == null || !Number.isFinite(e.alpha)) return null;
  return ((360 - e.alpha + screenAngleDeg()) % 360 + 360) % 360;
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
  const [permissionState, setPermissionState] = useState<CompassPermissionState>(() =>
    needsIOSPermission() ? "prompt-required" : "unnecessary",
  );

  const listenerRef = useRef<((e: Event) => void) | null>(null);
  const prevHeading = useRef<number | null>(null);

  const attach = useCallback(() => {
    const handler = (event: Event) => {
      const e = event as IOSOrientationEvent;
      const raw = headingFromEvent(e);
      if (raw == null) return;
      const next = prevHeading.current == null ? raw : dampHeading(prevHeading.current, raw);
      prevHeading.current = next;
      setHeading(next);
      setAvailable(true);
      const absolute = "absolute" in e ? Boolean((e as DeviceOrientationEvent).absolute) : false;
      setDrifting(typeof e.webkitCompassHeading !== "number" && !absolute);
    };
    listenerRef.current = handler;
    window.addEventListener(ORIENTATION_EVENT, handler);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const ctor = window.DeviceOrientationEvent as IOSOrientationEventConstructor | undefined;
    if (typeof ctor?.requestPermission !== "function") {
      setPermissionState("unnecessary");
      return true;
    }
    try {
      const result = await ctor.requestPermission();
      setPermissionState(result === "granted" ? "granted" : "denied");
      if (result === "granted") attach();
      return result === "granted";
    } catch {
      setPermissionState("denied");
      return false;
    }
  }, [attach]);

  useEffect(() => {
    if (!active) {
      if (listenerRef.current) {
        window.removeEventListener(ORIENTATION_EVENT, listenerRef.current);
        listenerRef.current = null;
      }
      prevHeading.current = null;
      setHeading(null);
      setAvailable(false);
      return;
    }
    if (!needsIOSPermission()) attach();
    return () => {
      if (listenerRef.current) window.removeEventListener(ORIENTATION_EVENT, listenerRef.current);
      listenerRef.current = null;
    };
  }, [active, attach]);

  return { heading, available, drifting, permissionState, requestPermission };
}
