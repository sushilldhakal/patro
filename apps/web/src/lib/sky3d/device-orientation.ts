/**
 * The phone/laptop's own orientation and tilt — what AR mode points the sky
 * at on the web, the browser-API counterpart to the mobile app's
 * `useDeviceOrientation` (which reads `expo-location`/`expo-sensors`
 * instead). Same job, same output shape — `{ yaw, pitch, roll }` in radians,
 * ready to hand straight to the horizon camera's
 * `cam.rotation.set(-pitch, yaw, roll)` — different sensors, because the
 * browser only offers one API for all three axes at once.
 *
 * ## One rotation, composed — never three angles taken from three places
 *
 * `DeviceOrientationEvent` reports `alpha`/`beta`/`gamma`: an intrinsic
 * Z-X'-Y'' Euler triple, `Rz(alpha)·Rx(beta)·Ry(gamma)`, carrying the phone's
 * own axes into (east, north, up). Read one at a time those three numbers
 * lie. The triple is only unique because the spec pins `gamma` into
 * [-90°, 90°), so every posture on the far side of that fence is reported on
 * the *other* branch — `alpha` jumps 180°, `beta` reflects about 90°, `gamma`
 * changes sign, all inside one event — while the rotation they compose to
 * does not move at all. The jumps cancel. Which is precisely why they have to
 * be composed, and never consumed individually.
 *
 * Yaw straight off the compass, pitch out of an `asin`, roll from `-gamma` —
 * what this used to do — breaks that cancellation three ways. The branch flip
 * reaches the view as a 180° spin of the whole grid. `asin` cannot report an
 * altitude past the zenith, so raising the phone over the top and bringing it
 * down the far side folded the sky back onto the near side and left it facing
 * the wrong way with the horizon upside down. And `gamma` is the least
 * trustworthy of the three near vertical, which is where AR mode spends its
 * whole life.
 *
 * So: compose the whole quaternion, then decompose it once, in the camera's
 * own `'YXZ'` convention. That round trip is exact — `cam.rotation.set` puts
 * back the rotation this took apart — so whatever the sensor triple does at a
 * branch boundary, the camera sees one continuous rotation. Nothing
 * degenerates at the zenith either: YXZ's own lock sits exactly there, but a
 * locked decomposition still reconstructs the rotation it came from, and the
 * dome's pitch limit already reaches the pole.
 *
 * ## Heading: a slow offset, not a per-sample yaw
 *
 * `alpha` is compass-referenced (0 = north) only when the event arrives as
 * `deviceorientationabsolute`, or with `.absolute` set — mostly an
 * Android/Chrome thing. Safari never sets either; it stamps every
 * `deviceorientation` event with `webkitCompassHeading` instead.
 *
 * So the compass never drives yaw. It calibrates `alpha` — smooth,
 * gyro-fused, but referenced to wherever the phone happened to be pointing
 * when tracking started — through a single offset in degrees: snapped on the
 * first reading, then damped hard, because it corrects a drifting reference
 * rather than the reader's own movement. Turning on the spot is answered by
 * `alpha` at sensor rate; the compass only says, slowly, which way north
 * was. Where no absolute source exists at all the offset stays 0 and
 * `driftingHeading` tells the UI to say so.
 *
 * ### What the compass is the bearing of, and why `beta` has to be in the sum
 *
 * `webkitCompassHeading` is CoreLocation's bearing for the phone's *top
 * edge* — its +y axis — projected onto the horizontal plane. Hold the phone
 * flat, screen up, and it reads where the top of the phone points, which is
 * the ordinary compass-app behaviour.
 *
 * Under `Rz(alpha)·Rx(beta)·Ry(gamma)` that axis lands at `(0, cos beta, sin
 * beta)` before `alpha` turns it about the vertical, so its bearing is
 * `psi − alpha`, where `psi` is 0° while `cos beta > 0` and 180° once `cos
 * beta` goes negative — the phone tipped past upright, camera lifted above
 * the horizon. The offset that makes `alpha` north-referenced is therefore
 * `psi − alpha − compass`, and dropping `psi` — reading it as plain
 * `360 − compass − alpha`, correct only for the half of the sphere where the
 * camera points *down* — is what spun the sky. Tilt the phone from aimed at
 * the sky to aimed at the ground and it crosses `beta = 90°`: the top edge
 * swings through vertical, its bearing flips a half turn, and with no `psi`
 * to cancel it the offset chases that flip and walks the whole view 180°
 * round over about a third of a second.
 *
 * `psi` also makes the offset a function of the *rotation* rather than of
 * the triple that reported it. On the far side of the `gamma` fence a
 * browser reports `(alpha + 180, 180 − beta, gamma ∓ 180)` for the very same
 * posture: `alpha` gains a half turn and `cos beta` changes sign, so `psi`
 * gains one too and the difference is unchanged. Without it the offset
 * jumped 180° every time the phone passed through screen-edge-on.
 *
 * ### Where the reading means nothing
 *
 * That same geometry says when to stop listening. The bearing of the top
 * edge is a projection of length `|cos beta|`, so it is at its sharpest with
 * the phone flat — camera at the zenith or the nadir — and degenerates to
 * noise as the phone stands upright, which is exactly the posture AR mode
 * asks for: the top edge points at the sky, its bearing is whatever the
 * magnetometer's last digit says, and consecutive samples can differ by
 * 180°. The damping is therefore weighted by that projection and frozen
 * outright once it collapses, so the noise cannot drag the offset anywhere.
 *
 * ## iOS's permission gate
 *
 * iOS 13+ hides `alpha`/`beta`/`gamma` entirely behind
 * `DeviceOrientationEvent.requestPermission()`, which only resolves if
 * called synchronously inside a user gesture handler (a click, a tap) —
 * calling it from a `useEffect` throws or silently never resolves on some
 * versions. `requestPermission` below is therefore exposed to be called
 * directly from the same tap that turns AR mode on, not from this hook's
 * own effect.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type OrientationPermissionState =
  | "unnecessary"
  | "prompt-required"
  | "granted"
  | "denied";

export type DeviceOrientationSample = {
  /**
   * Whether events are actually arriving — false before permission is granted.
   *
   * The angles themselves are not here on purpose: they arrive at sensor
   * rate, and holding them in React state re-rendered the whole sky sixty
   * times a second for a value nothing rendered. They go to `onSample`, which
   * writes the ref the frame loop already reads.
   */
  available: boolean;
  /** No `deviceorientationabsolute`/`.absolute`/`webkitCompassHeading` seen yet — yaw will drift. */
  driftingHeading: boolean;
  permissionState: OrientationPermissionState;
  /**
   * Must be invoked directly inside a user-gesture event handler (a tap on
   * the AR toggle), never from an effect — see the module doc comment.
   * Resolves to whether orientation events can now be listened for.
   */
  requestPermission: () => Promise<boolean>;
};

/** iOS's non-standard extensions, absent from lib.dom's event/constructor types. */
type IOSOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  /** Degrees of slop, or negative when CoreLocation says the reading is junk. */
  webkitCompassAccuracy?: number;
};
type IOSOrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function needsIOSPermission(): boolean {
  // Called from `useState`'s initializer, which also runs during SSR —
  // `window` does not exist there, so this has to check before touching it.
  if (typeof window === "undefined") return false;
  const ctor = window.DeviceOrientationEvent as IOSOrientationEventConstructor | undefined;
  return typeof ctor?.requestPermission === "function";
}

const DEG = Math.PI / 180;

/* Scratch objects the conversion below writes into every event — this runs
   at sensor rate, not React's, so it must not allocate per call. */
const deviceEuler = new THREE.Euler();
const cameraEuler = new THREE.Euler(0, 0, 0, "YXZ");
const scratchQuat = new THREE.Quaternion();
const screenTransform = new THREE.Quaternion();
/**
 * −90° about x, post-multiplied: the spec's world is (east, north, up) and
 * its device frame has +z out of the *screen*; three.js wants y up with north
 * at −z, and the camera has to look out of the *back*. One quarter turn
 * reconciles both at once — `Rx(-90)·Rz(a)Rx(b)Ry(g)` is the same rotation as
 * `Ry(a)·Rx(b-90)·Ry(g)`, which is what this composes.
 */
const cameraCorrection = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const zAxis = new THREE.Vector3(0, 0, 1);

const normalizeDeg = (d: number) => ((d % 360) + 360) % 360;

/** Shortest-path blend, so 359° → 1° does not swing the long way round. */
function dampDeg(prev: number, next: number, k: number): number {
  const delta = ((next - prev + 540) % 360) - 180;
  return normalizeDeg(prev + delta * k);
}

/**
 * `alpha`/`beta`/`gamma` (+ the screen's own rotation) → the world rotation
 * of a camera looking out of the phone's back lens, in the scene's frame
 * (−z north, +y zenith).
 *
 * `alphaDeg` is expected to be north-referenced; the hook folds its compass
 * offset in before calling. Everything else is the raw event.
 */
export function deviceOrientationToCameraQuaternion(
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenAngleDeg: number,
  out: THREE.Quaternion,
): THREE.Quaternion {
  deviceEuler.set(betaDeg * DEG, alphaDeg * DEG, -gammaDeg * DEG, "YXZ");
  out.setFromEuler(deviceEuler);
  out.multiply(cameraCorrection);
  // The reader turns the phone sideways and the *screen's* up is no longer
  // the phone's up; the camera has to roll with it or landscape renders on
  // its side.
  out.multiply(screenTransform.setFromAxisAngle(zAxis, -screenAngleDeg * DEG));
  return out;
}

/**
 * The same rotation, split into what `cam.rotation.set(-pitch, yaw, roll)`
 * takes — the exact inverse of what the camera does with it, so the split
 * costs nothing even where the angles themselves are degenerate.
 */
export function cameraEulerFromQuaternion(q: THREE.Quaternion): OrientationSample {
  cameraEuler.setFromQuaternion(q, "YXZ");
  return { yaw: cameraEuler.y, pitch: -cameraEuler.x, roll: cameraEuler.z };
}

/** Device angles straight through to the camera's `{ yaw, pitch, roll }`. */
export function deviceOrientationToCameraEuler(
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenAngleDeg: number,
): OrientationSample {
  return cameraEulerFromQuaternion(
    deviceOrientationToCameraQuaternion(alphaDeg, betaDeg, gammaDeg, screenAngleDeg, scratchQuat),
  );
}

/**
 * How much of the phone's top edge — the axis `webkitCompassHeading` reports
 * the bearing of — survives being projected onto the horizontal plane, as a
 * fraction in [0, 1].
 *
 * `|cos beta|`: 1 with the phone flat on its face or its back, where the top
 * edge lies along the ground and its bearing is as sharp as the magnetometer
 * gets; 0 with the phone standing upright, where the edge points at the sky
 * and the bearing is noise. `gamma` cannot move it — a turn about the top
 * edge itself leaves the edge where it is — so `beta` is the whole of it.
 */
export function compassAxisHorizontality(betaDeg: number): number {
  return Math.abs(Math.cos(betaDeg * DEG));
}

/**
 * Degrees to add to `alpha` to make it north-referenced, from one compass
 * reading — the derivation in the module doc comment, in one line.
 *
 * The `beta` term is the load-bearing half: the top edge's bearing is
 * `psi − alpha` with `psi` a half turn once `cos beta` goes negative, and
 * leaving it out is a 180° error over the entire half of the sphere where the
 * camera is raised above the horizon.
 */
export function headingOffsetDeg(compassDeg: number, alphaDeg: number, betaDeg: number): number {
  const psi = Math.cos(betaDeg * DEG) >= 0 ? 0 : 180;
  return normalizeDeg(psi - alphaDeg - compassDeg);
}

/**
 * Both event names, always. Chrome advertises `ondeviceorientationabsolute`
 * even when the Sensors panel (and some phones) only ever dispatch the
 * relative `deviceorientation` event — listening to the absolute name alone
 * is how the compass dial went deaf. Absolute samples still win when they
 * actually arrive; see the handler in {@link useDeviceOrientation}.
 */
const ORIENTATION_EVENTS = ["deviceorientationabsolute", "deviceorientation"] as const;

/**
 * Below this much horizontal projection ({@link compassAxisHorizontality}) the
 * compass is reading the bearing of an edge that is pointing at the sky —
 * noise, and noise that flips by 180°. The offset it feeds is held at its last
 * good value instead. 0.25 is the phone within about 15° of upright.
 */
const HEADING_TRUST_HORIZONTALITY = 0.25;
/**
 * How fast the compass offset is allowed to move per sample, at the posture
 * where the reading is sharpest — scaled down by
 * {@link compassAxisHorizontality} everywhere else. It corrects a reference
 * that drifts over minutes, not the reader's own turning (that is `alpha`, at
 * full rate), so it is deliberately slow enough that a bad magnetometer
 * sample cannot jerk the sky.
 */
const HEADING_OFFSET_DAMP = 0.05;
/**
 * Slerp toward each new reading rather than snapping to it. Quaternions,
 * because damping the angles one by one is the same mistake as reading them
 * one by one — at the zenith yaw and roll trade places and a per-angle blend
 * would rotate the sky through the whole gap.
 */
const ORIENTATION_SMOOTHING = 0.45;

function screenAngleDeg(): number {
  if (typeof screen !== "undefined" && screen.orientation) return screen.orientation.angle;
  if (typeof window === "undefined") return 0;
  const legacy = (window as Window & { orientation?: number }).orientation;
  return typeof legacy === "number" ? legacy : 0;
}

export type OrientationSample = { yaw: number; pitch: number; roll: number };

export function useDeviceOrientation(
  active: boolean,
  onSample?: (sample: OrientationSample) => void,
): DeviceOrientationSample {
  const [available, setAvailable] = useState(false);
  const [driftingHeading, setDriftingHeading] = useState(false);
  const [permissionState, setPermissionState] = useState<OrientationPermissionState>(() =>
    needsIOSPermission() ? "prompt-required" : "unnecessary",
  );

  const listenerRef = useRef<((e: Event) => void) | null>(null);
  const onSampleRef = useRef(onSample);
  useEffect(() => {
    onSampleRef.current = onSample;
  }, [onSample]);

  /** Degrees added to `alpha` to make it north-referenced. Null until the first compass reading. */
  const headingOffset = useRef<number | null>(null);
  /** A compass reading has arrived from a posture where the bearing is worth something. */
  const headingCalibrated = useRef(false);
  /** An absolute source has spoken at least once — the relative twin is ignored from then on. */
  const sawAbsolute = useRef(false);
  const smoothed = useRef<THREE.Quaternion | null>(null);
  const target = useRef(new THREE.Quaternion());

  const detach = useCallback(() => {
    if (!listenerRef.current) return;
    for (const type of ORIENTATION_EVENTS) {
      window.removeEventListener(type, listenerRef.current);
    }
    listenerRef.current = null;
    // A fresh session recalibrates from scratch: the phone may well have been
    // put down and picked up facing somewhere else.
    headingOffset.current = null;
    headingCalibrated.current = false;
    sawAbsolute.current = false;
    smoothed.current = null;
  }, []);

  const attach = useCallback(() => {
    if (listenerRef.current) return;
    const handler = (event: Event) => {
      const e = event as IOSOrientationEvent;
      // Some browsers fire the event with nulls until permission lands, or
      // omit gamma on cheap hardware — skip a frame, don't drop the listener.
      if (e.alpha == null && e.beta == null && e.gamma == null) return;

      // CoreLocation signals "no usable heading" — an uncalibrated
      // magnetometer, or one sitting next to a magnet — by handing back
      // negatives rather than nothing at all, and Safari passes them
      // straight through. Taken at face value they normalise to a bearing
      // near 359° and drag the offset with them.
      const compass =
        typeof e.webkitCompassHeading === "number" &&
        Number.isFinite(e.webkitCompassHeading) &&
        e.webkitCompassHeading >= 0 &&
        !(typeof e.webkitCompassAccuracy === "number" && e.webkitCompassAccuracy < 0)
          ? normalizeDeg(e.webkitCompassHeading)
          : null;
      const isAbsolute =
        compass != null ||
        event.type === "deviceorientationabsolute" ||
        ("absolute" in e ? Boolean((e as DeviceOrientationEvent).absolute) : false);

      // Chrome dispatches both names, with *different* alphas — one
      // north-referenced, one not. Letting them take turns walked the sky
      // back and forth between two headings every frame, so once an absolute
      // source has been heard the relative one is dropped.
      if (isAbsolute) sawAbsolute.current = true;
      else if (sawAbsolute.current) return;

      const alpha = e.alpha ?? 0;
      const beta = e.beta ?? 90;
      const gamma = e.gamma ?? 0;
      const screenAngle = screenAngleDeg();

      if (compass != null) {
        // The constant that turns this device's own `alpha` into the absolute,
        // north-referenced one — from the bearing of the top edge, which is
        // what the compass actually measures, so `beta` is in the sum.
        const want = headingOffsetDeg(compass, alpha, beta);
        const trust = compassAxisHorizontality(beta);
        const trusted = trust >= HEADING_TRUST_HORIZONTALITY;
        if (headingOffset.current == null) {
          headingOffset.current = want;
        } else if (trusted) {
          // Weighted by how square-on the reading is, so the offset creeps
          // toward a glancing one and locks onto a flat-on one.
          headingOffset.current = dampDeg(headingOffset.current, want, HEADING_OFFSET_DAMP * trust);
        } else if (!headingCalibrated.current) {
          // Nothing square-on has arrived yet and the phone is being held
          // upright, which is where AR mode lives — so this is all there is.
          // Keep averaging it at full rate: the reading is noisy there, not
          // biased, and a sky frozen on whichever single sample happened to
          // land first is worse than one that settles over a third of a
          // second. The weighted branch above takes over the moment the
          // reader tips the phone far enough for the edge to mean something.
          headingOffset.current = dampDeg(headingOffset.current, want, HEADING_OFFSET_DAMP);
        }
        if (trusted) headingCalibrated.current = true;
      }

      deviceOrientationToCameraQuaternion(
        alpha + (headingOffset.current ?? 0),
        beta,
        gamma,
        screenAngle,
        target.current,
      );
      if (smoothed.current == null) smoothed.current = target.current.clone();
      else smoothed.current.slerp(target.current, ORIENTATION_SMOOTHING);

      // Straight out of the decomposition, all three together. Nudging one of
      // them on its own — `roll` used to be unwrapped by a half turn whenever
      // it moved fast, from before this composed quaternions — is not a
      // correction but a 180° spin of the view about its own axis: the round
      // trip is exact, so the only way to keep the camera on the rotation the
      // sensors reported is to hand back what came out of it.
      const result = cameraEulerFromQuaternion(smoothed.current);

      setDriftingHeading(!isAbsolute);
      setAvailable(true);
      onSampleRef.current?.(result);
    };
    listenerRef.current = handler;
    for (const type of ORIENTATION_EVENTS) {
      window.addEventListener(type, handler);
    }
  }, []);

  type PermissionAsk = () => Promise<"granted" | "denied">;
  const requestPermission = useCallback((): Promise<boolean> => {
    const orientCtor = window.DeviceOrientationEvent as IOSOrientationEventConstructor | undefined;
    const motionCtor = window.DeviceMotionEvent as
      | (typeof DeviceMotionEvent & { requestPermission?: PermissionAsk })
      | undefined;

    // Listeners first — iOS starts delivering in the same turn as the grant
    // if they are already bound, and Android has no grant to wait for.
    attach();

    const orientAsk = orientCtor?.requestPermission;
    if (typeof orientAsk !== "function") {
      setPermissionState("unnecessary");
      return Promise.resolve(true);
    }

    // The native call has to stay in this tap's synchronous stack. An
    // `async` function is what made Safari treat it as *not* a user gesture,
    // resolve "denied" (or never), and leave the sky with no samples.
    let orientPromise: Promise<"granted" | "denied">;
    try {
      orientPromise = orientAsk.call(orientCtor);
    } catch {
      setPermissionState("denied");
      return Promise.resolve(false);
    }
    const motionAsk = motionCtor?.requestPermission;
    if (typeof motionAsk === "function") {
      try {
        void motionAsk.call(motionCtor);
      } catch {
        /* Orientation is the one the sky needs; motion is a courtesy. */
      }
    }

    return Promise.resolve(orientPromise).then(
      (result) => {
        const ok = result === "granted";
        setPermissionState(ok ? "granted" : "denied");
        return ok;
      },
      () => {
        setPermissionState("denied");
        return false;
      },
    );
  }, [attach]);

  useEffect(() => {
    if (!active) return;
    // iOS: stay idle until the tap's `requestPermission` actually granted —
    // attaching from an effect before that is what the gesture-gate exists
    // to prevent. After a grant, attach here too so React Strict Mode's
    // simulated unmount (which runs this cleanup) does not leave the sky
    // deaf: the remount re-binds the same listeners.
    if (needsIOSPermission() && permissionState !== "granted") return;
    attach();
    return () => {
      detach();
      setAvailable(false);
    };
  }, [active, attach, detach, permissionState]);

  return { available, driftingHeading, permissionState, requestPermission };
}
