import { useRef } from "react";
import { PanResponder, Text, View } from "react-native";
import { fontFamily, illustration, midnight, neutral, withAlpha } from "@vedic-patro/design-tokens";
import {
  COMPASS_DIAL_SIZE,
  COMPASS_ICON_SIZE,
  beginCompassGesture,
  compassGestureIsTap,
  moveCompassGesture,
  useCompassDial,
  type CompassGesture,
} from "@vedic-patro/features/sky3d";
import type { CompassControlProps } from "../contract";

const RADIUS = COMPASS_DIAL_SIZE / 2;

export function CompassControl({
  heading,
  onHeadingChange,
  gyroMode,
  cameraOn,
  onTap,
  onManualDrag,
  bottom = 12,
  visible = true,
  renderNeedle,
  renderCamera,
}: CompassControlProps) {
  const dial = useCompassDial(heading);
  const sensorActive = gyroMode || cameraOn;
  const glyphColor = cameraOn ? illustration.green58 : gyroMode ? illustration.amber61 : withAlpha(neutral.white, 0.8);
  const center = useRef({ x: 0, y: 0 });
  const containerRef = useRef<View>(null);
  const gesture = useRef<CompassGesture | null>(null);
  const headingRef = useRef(heading);
  headingRef.current = heading;
  const sensorRef = useRef(sensorActive);
  sensorRef.current = sensorActive;
  const onHeadingChangeRef = useRef(onHeadingChange);
  onHeadingChangeRef.current = onHeadingChange;
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const onManualDragRef = useRef(onManualDrag);
  onManualDragRef.current = onManualDrag;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        gesture.current = beginCompassGesture(pageX, pageY, center.current.x, center.current.y, headingRef.current);
      },
      onPanResponderMove: (e) => {
        if (!gesture.current) return;
        const { pageX, pageY } = e.nativeEvent;
        const next = moveCompassGesture(gesture.current, pageX, pageY, center.current.x, center.current.y, sensorRef.current);
        gesture.current = next.gesture;
        if (next.manualDrag) onManualDragRef.current();
        if (next.heading != null) onHeadingChangeRef.current(next.heading);
      },
      onPanResponderRelease: () => {
        if (gesture.current && compassGestureIsTap(gesture.current)) onTapRef.current();
      },
    }),
  ).current;

  if (!visible) return null;

  return (
    <View
      ref={containerRef}
      onLayout={() => {
        containerRef.current?.measureInWindow((x, y, w, h) => {
          center.current = { x: x + w / 2, y: y + h / 2 };
        });
      }}
      {...responder.panHandlers}
      className="absolute z-20 items-center justify-center"
      style={{ width: COMPASS_DIAL_SIZE, height: COMPASS_DIAL_SIZE, bottom, left: "50%", marginLeft: -RADIUS }}
    >
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
          borderBottomColor: sensorActive ? illustration.amber61 : withAlpha(neutral.white, 0.75),
        }}
      />
      <View
        pointerEvents="none"
        className="absolute items-center justify-center"
        style={{ left: RADIUS - COMPASS_ICON_SIZE / 2, top: RADIUS - COMPASS_ICON_SIZE / 2, width: COMPASS_ICON_SIZE, height: COMPASS_ICON_SIZE }}
      >
        {gyroMode ? renderCamera(glyphColor) : renderNeedle(glyphColor)}
      </View>
      {dial.dots.map((p) => (
        <View
          key={p.az}
          pointerEvents="none"
          className="absolute rounded-full bg-white/40"
          style={{ width: 3, height: 3, left: p.x - 1.5, top: p.y - 1.5 }}
        />
      ))}
      {dial.points.map((p) => (
        <View key={p.az} pointerEvents="none" className="absolute items-center justify-center" style={{ width: 18, height: 18, left: p.x - 9, top: p.y - 9 }}>
          <Text
            className="text-diagram-sm font-bold"
            style={{ color: p.north ? midnight.vermilion : withAlpha(neutral.white, 0.85), fontFamily: fontFamily.native.bold }}
          >
            {p.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
