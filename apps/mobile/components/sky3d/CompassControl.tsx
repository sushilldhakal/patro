/**
 * The sky's compass — a rotary dial docked bottom-centre over the canvas.
 *
 * The native counterpart of the web app's `CompassControl`: same dial, same
 * three behaviours, same glyphs. The Pointer Events the web version binds to a
 * plain `<div>` are a `PanResponder` here; nothing else about it differs, and
 * the two are meant to be read side by side.
 *
 * 1. **Drag it.** Spin the dial with a finger and the camera's yaw follows,
 *    the same way turning a real compass card under a fixed lubber line
 *    does — उ/पू/द/प paint on the disc, a fixed pointer at the top names
 *    whichever one you're currently facing.
 * 2. **Tap it.** Neither sensor is running yet — asks to raise the phone,
 *    then (after {@link AakashGocharSky}'s own timer) switches the dial over
 *    to `useDeviceOrientation`. The centre needle becomes a lens glyph the
 *    moment that happens, tapping *that* is what actually opens the camera.
 * 3. **While a sensor is driving it**, the dial is read-only — dragging it
 *    (or the sky itself) is the reader taking the wheel back, so the parent
 *    hears about that via {@link onManualDrag} and drops both sensors.
 */

import { useRef } from "react";
import { PanResponder, View, type LayoutChangeEvent } from "react-native";
import CameraGlyph from "@/assets/camera.svg";
import CompassNeedle from "@/assets/compass.svg";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { normalizeDeg } from "@/lib/sky3d/geocentric-model";
import { COMPASS_POINTS } from "@/lib/sky3d/sky-geometry";

export const DIAL_SIZE = 64;
const RADIUS = DIAL_SIZE / 2;
/** The centre glyph sits fixed — this is its own box, not the dial's. */
const ICON_SIZE = 20;
/** उ/पू/द/प and the dots between them share one ring, close enough to the
    centre glyph to read as one dial but never touching it. */
const RING_RADIUS = RADIUS - 12;
/** A drag shorter than this, released quickly, reads as a tap rather than a spin. */
const TAP_SLOP_PX = 6;

const POINTS = COMPASS_POINTS.filter((p) => p.major);
/** ईशान/आग्नेय/नैऋत्य/वायव्य carry no label here — just the dot that separates two cardinals. */
const DOTS = COMPASS_POINTS.filter((p) => !p.major);

export function CompassControl({
  heading,
  onHeadingChange,
  gyroMode,
  cameraOn,
  onTap,
  onManualDrag,
  bottom = 12,
  visible = true,
}: {
  /** Degrees, 0 = north, clockwise — the same frame the sky's own az is in. */
  heading: number;
  /** Fired continuously while dragging (ignored while a sensor is driving the dial). */
  onHeadingChange: (heading: number) => void;
  /** The device's own tilt/turn is driving `heading` — the dial is read-only. */
  gyroMode: boolean;
  /** The back camera is live behind the sky — always false unless {@link gyroMode} is too. */
  cameraOn: boolean;
  /** A clean tap (no real drag) — what it means depends on {@link gyroMode}/{@link cameraOn}, decided by the caller. */
  onTap: () => void;
  /** A real drag started while a sensor was driving the dial — the reader wants the wheel back. */
  onManualDrag: () => void;
  /**
   * How far off the bottom of the sky the dial is docked, px.
   *
   * Fullscreen pins the view-chip strip over the sky's own bottom edge, and
   * this used to be a hardcoded 12 — so in fullscreen the strip sat straight
   * on top of the dial. The caller knows the strip's height; it passes the
   * clearance in, the same way the adjust button and the date pill get theirs.
   */
  bottom?: number;
  /** Hidden outside the horizon view — there is no "facing direction" from space or the globe. */
  visible?: boolean;
}) {
  const { pick } = useLocale();
  const sensorActive = gyroMode || cameraOn;

  const center = useRef({ x: 0, y: 0 });
  const containerRef = useRef<View>(null);
  const gesture = useRef({ startAngle: 0, startHeading: 0, moved: 0, cancelledSensor: false });

  // The responder below is built once, so its callbacks close over whatever
  // the props were on the first render. Refs kept in step with every render
  // are what let them read the current values instead of those stale ones.
  const headingRef = useRef(heading);
  headingRef.current = heading;
  const sensorActiveRef = useRef(sensorActive);
  sensorActiveRef.current = sensorActive;
  const onHeadingChangeRef = useRef(onHeadingChange);
  onHeadingChangeRef.current = onHeadingChange;
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const onManualDragRef = useRef(onManualDrag);
  onManualDragRef.current = onManualDrag;

  const onLayout = (_e: LayoutChangeEvent) => {
    // Absolute (page) coordinates, not the layout event's local ones — touch
    // events report page coordinates, and the dial can sit inside scrolled
    // or transformed ancestors where the two disagree.
    containerRef.current?.measureInWindow((x, y, w, h) => {
      center.current = { x: x + w / 2, y: y + h / 2 };
    });
  };

  const angleAt = (pageX: number, pageY: number) =>
    Math.atan2(pageY - center.current.y, pageX - center.current.x) * (180 / Math.PI);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        gesture.current = {
          startAngle: angleAt(pageX, pageY),
          startHeading: headingRef.current,
          moved: 0,
          cancelledSensor: false,
        };
      },
      onPanResponderMove: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        const angle = angleAt(pageX, pageY);
        /* Arc length, not straight-line travel — the same measure the web uses,
           so the slop that separates a tap from a spin is the same few pixels
           of dial edge on both. */
        gesture.current.moved = Math.max(
          gesture.current.moved,
          Math.abs(angle - gesture.current.startAngle) * ((RADIUS * Math.PI) / 180),
        );
        if (sensorActiveRef.current) {
          // A real drag on a sensor-driven dial is the reader grabbing the
          // wheel back — fired once per gesture, the instant it stops reading
          // as a tap.
          if (!gesture.current.cancelledSensor && gesture.current.moved > TAP_SLOP_PX) {
            gesture.current.cancelledSensor = true;
            onManualDragRef.current();
          }
          return;
        }
        const delta = angle - gesture.current.startAngle;
        onHeadingChangeRef.current(normalizeDeg(gesture.current.startHeading + delta));
      },
      onPanResponderRelease: () => {
        if (gesture.current.moved > TAP_SLOP_PX || gesture.current.cancelledSensor) return;
        onTapRef.current();
      },
    }),
  ).current;

  if (!visible) return null;

  const glyphColor = cameraOn ? "#4ade80" : gyroMode ? "#f4c542" : "rgba(255,255,255,0.8)";

  return (
    <View
      ref={containerRef}
      onLayout={onLayout}
      {...responder.panHandlers}
      className="absolute items-center justify-center"
      style={{ width: DIAL_SIZE, height: DIAL_SIZE, bottom, left: "50%", marginLeft: -RADIUS }}
    >
      {/* The lubber line: fixed, names whichever cardinal is currently faced.
          A CSS triangle on the web; the same shape from borders here. */}
      <View
        pointerEvents="none"
        className="absolute"
        style={{
          top: -4,
          left: RADIUS - 5,
          width: 0,
          height: 0,
          borderLeftWidth: 5,
          borderRightWidth: 5,
          borderBottomWidth: 7,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: sensorActive ? "#f4c542" : "rgba(255,255,255,0.75)",
        }}
      />

      {/* The centre glyph: it names nothing itself, so it never turns — only
          the ring of letters around it carries the heading. A needle until the
          device's own tilt takes over, then the lens it can now open. */}
      <View
        pointerEvents="none"
        className="absolute items-center justify-center"
        style={{ left: RADIUS - ICON_SIZE / 2, top: RADIUS - ICON_SIZE / 2 }}
      >
        {gyroMode ? (
          <CameraGlyph width={ICON_SIZE} height={ICON_SIZE} color={glyphColor} />
        ) : (
          <CompassNeedle width={ICON_SIZE} height={ICON_SIZE} color={glyphColor} />
        )}
      </View>

      {/* उ/पू/द/प orbit the needle as the heading changes — each one's own
          angle is `az - heading`, computed straight into its x/y, rather than
          spinning a shared parent. A rotated parent would spin the glyphs with
          it and put "उ" on its side at a 90° heading; walking each one around
          the circle individually is what lets the position turn while the
          letter itself stays upright. */}
      {DOTS.map((p) => {
        const a = ((p.az - heading) * Math.PI) / 180;
        return (
          <View
            key={p.az}
            pointerEvents="none"
            className="absolute rounded-full bg-white/40"
            style={{
              width: 3,
              height: 3,
              left: RADIUS + RING_RADIUS * Math.sin(a) - 1.5,
              top: RADIUS - RING_RADIUS * Math.cos(a) - 1.5,
            }}
          />
        );
      })}
      {POINTS.map((p) => {
        const a = ((p.az - heading) * Math.PI) / 180;
        return (
          <View
            key={p.az}
            pointerEvents="none"
            className="absolute items-center justify-center"
            style={{
              width: 18,
              height: 18,
              left: RADIUS + RING_RADIUS * Math.sin(a) - 9,
              top: RADIUS - RING_RADIUS * Math.cos(a) - 9,
            }}
          >
            <Text
              className="text-caption font-bold"
              style={[
                nepaliTextStyle(13, { dense: true }),
                { color: p.az === 0 ? "#ff8a8a" : "rgba(255,255,255,0.85)" },
              ]}
            >
              {pick(p.ne, p.en)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
