/**
 * Camera + touch for the 3D learn diagrams.
 *
 * The camera lives in a ref, exactly as the Aakash Gochar sky does it: dragging
 * a finger across a diagram must not re-render the React tree sixty times a
 * second. `useDiagramGesture` owns the ref and hands back pan handlers for the
 * View wrapping the canvas; `CameraRig` lives inside the canvas and eases the
 * real camera toward whatever the ref currently says.
 *
 * Distance is not stored — zoom is. Each scene declares how much of the world
 * it needs on screen and the rig works out the distance that frames it for the
 * canvas it actually got, so the same diagram fits a short card and a tall
 * fullscreen window without anything falling off the edge.
 */

import { useEffect, useMemo, useRef } from "react";
import { PanResponder } from "react-native";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type DiagramView = {
  /** Radians around the vertical axis. */
  yaw: number;
  /** Radians above the ecliptic plane, clamped short of straight down. */
  pitch: number;
  /** 1 frames the scene exactly; below 1 moves in, above 1 pulls back. */
  zoom: number;
  /** Set on first touch — stops the idle drift so it never fights a drag. */
  touched: boolean;
};

export type DiagramViewRef = { current: DiagramView };

/** How much world a scene wants kept in view, as half-extents. */
export type DiagramFrame = {
  /** Half-width across the ecliptic plane. */
  width: number;
  /** Half-height out of the plane; defaults to a flat 0.45 of the width. */
  height?: number;
};

type GestureOptions = {
  yaw?: number;
  pitch?: number;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  minPitch?: number;
  maxPitch?: number;
};

const PITCH_LIMIT = 1.45;

export function useDiagramGesture(options: GestureOptions = {}) {
  const {
    yaw = 0.6,
    pitch = 0.55,
    zoom = 1,
    minZoom = 0.45,
    maxZoom = 2.6,
    minPitch = -PITCH_LIMIT,
    maxPitch = PITCH_LIMIT,
  } = options;

  const view = useRef<DiagramView>({ yaw, pitch, zoom, touched: false });
  const limits = useRef({ minZoom, maxZoom, minPitch, maxPitch });
  limits.current = { minZoom, maxZoom, minPitch, maxPitch };

  const start = useRef({ yaw, pitch, zoom, pinch: 0 });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.hypot(g.dx, g.dy) > 2,
        onPanResponderGrant: () => {
          start.current = { ...view.current, pinch: 0 };
          view.current.touched = true;
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;
          if (touches.length >= 2) {
            const [a, b] = touches;
            if (!a || !b) return;
            const spread = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            if (!spread) return;
            if (!start.current.pinch) start.current.pinch = spread;
            const next = start.current.zoom * (start.current.pinch / spread);
            view.current.zoom = clamp(next, limits.current.minZoom, limits.current.maxZoom);
            return;
          }
          /* Drag the system, not the camera — pull right and the far side swings
             right, which means the camera itself travels the other way. */
          view.current.yaw = start.current.yaw - g.dx * 0.007;
          view.current.pitch = clamp(
            start.current.pitch + g.dy * 0.006,
            limits.current.minPitch,
            limits.current.maxPitch,
          );
        },
      }),
    [],
  );

  /** The +/− buttons over the canvas. */
  const zoomBy = (factor: number) => {
    view.current.touched = true;
    view.current.zoom = clamp(
      view.current.zoom * factor,
      limits.current.minZoom,
      limits.current.maxZoom,
    );
  };

  const reset = () => {
    view.current.yaw = yaw;
    view.current.pitch = pitch;
    view.current.zoom = zoom;
    view.current.touched = false;
  };

  return { view, panHandlers: responder.panHandlers, zoomBy, reset };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Eases the real camera toward the ref each frame. Until the diagram is first
 * touched it also drifts slowly around the scene, which is what tells you the
 * thing can be spun at all.
 */
export function CameraRig({
  view,
  frame,
  target = [0, 0, 0],
  idleSpin = 0.04,
}: {
  view: DiagramViewRef;
  frame: DiagramFrame;
  target?: [number, number, number];
  /** Radians per second before the first touch. Zero to hold still. */
  idleSpin?: number;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const focus = useRef(new THREE.Vector3(...target));
  const current = useRef({ yaw: view.current.yaw, pitch: view.current.pitch, distance: 0 });

  useEffect(() => {
    focus.current.set(target[0], target[1], target[2]);
  }, [target]);

  useFrame((_state, delta) => {
    const want = view.current;
    if (!want.touched && idleSpin) want.yaw += idleSpin * Math.min(delta, 0.1);

    /* Fit both axes: a tall fullscreen window is narrow, and it is the width
       that decides whether the Sun stays on screen. */
    const perspective = camera as THREE.PerspectiveCamera;
    const halfFov = ((perspective.fov ?? 45) * Math.PI) / 360;
    const aspect = size.height > 0 ? size.width / size.height : 1;
    const halfHeight = frame.height ?? frame.width * 0.45;
    const fitVertical = halfHeight / Math.tan(halfFov);
    const fitHorizontal = frame.width / (Math.tan(halfFov) * Math.max(aspect, 0.2));
    const distance = Math.max(fitVertical, fitHorizontal) * want.zoom;

    const ease = 1 - Math.pow(0.001, Math.min(delta, 0.1));
    if (!current.current.distance) current.current.distance = distance;
    current.current.yaw += (want.yaw - current.current.yaw) * ease;
    current.current.pitch += (want.pitch - current.current.pitch) * ease;
    current.current.distance += (distance - current.current.distance) * ease;

    const { yaw, pitch } = current.current;
    const d = current.current.distance;
    const cp = Math.cos(pitch);
    camera.position.set(
      focus.current.x + d * cp * Math.sin(yaw),
      focus.current.y + d * Math.sin(pitch),
      focus.current.z + d * cp * Math.cos(yaw),
    );
    camera.lookAt(focus.current);
  });

  return null;
}
