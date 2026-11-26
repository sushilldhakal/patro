import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Animated, PanResponder, Pressable, View, type GestureResponderEvent } from "react-native";
import { haptics } from "@vedic-patro/ui/motion";
import { nativeShadow } from "@vedic-patro/design-tokens";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

export type RashiWheelItem = { id: number; name: string; glyph: ReactNode; percentLabel?: string };

const STEP = 30; // twelve signs
const VISIBLE_H = 214;

/** Shortest signed difference between two angles, in degrees (-180..180]. */
function angleDelta(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Index under the pointer for a wheel turned by `rot` degrees. */
function indexAt(rot: number, n: number): number {
  return (((Math.round(-rot / STEP) % n) + n) % n);
}

/**
 * The twelve rashis on a wheel seen through a window onto its bottom 120° (the arc curves down); the one over the pointer at
 * its foot is chosen. Turn it with
 * one finger either way (the finger's angle around the wheel's centre drives it, so circling left
 * or right both work), let go and it snaps to the nearest sign with a little momentum; tap a sign
 * to bring it to the top. A tick at every sign that passes the pointer.
 *
 * React Native's own Animated (native driver) turns the wheel: a Reanimated view here lost its
 * layout styles on iOS.
 */
export function RashiWheel({
  items,
  selectedIndex,
  onSelect,
  height = VISIBLE_H,
  ratio = 1.1,
}: {
  items: RashiWheelItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Window height until the width is known; then it shows the bottom 120° of the wheel, cut flat. */
  height?: number;
  /** Wheel diameter as a share of the available width. */
  ratio?: number;
}) {
  const colors = useThemeColors();
  const n = items.length;
  const [width, setWidth] = useState(0);
  const D = Math.round(width * ratio);
  const R = D / 2;
  // The bottom 120°: a flat top edge R/2 below the centre (where the ±60° radii meet the rim), plus a 12pt foot for the pointer.
  const H = width > 0 ? Math.ceil(R / 2 + 12) : height;

  const rot = useRef(new Animated.Value(-selectedIndex * STEP)).current;
  const rotNow = useRef(-selectedIndex * STEP);
  const [pointerIndex, setPointerIndex] = useState(selectedIndex);
  const pointerRef = useRef(selectedIndex);
  const wheelRef = useRef<ComponentRef<typeof View>>(null);
  const center = useRef({ x: 0, y: 0 });
  const drag = useRef({ last: 0, lastT: 0, v: 0 });
  const dragging = useRef(false);

  useEffect(() => {
    const id = rot.addListener(({ value }) => {
      rotNow.current = value;
      const i = indexAt(value, n);
      if (i !== pointerRef.current) {
        pointerRef.current = i;
        setPointerIndex(i);
        haptics.tick();
      }
    });
    return () => rot.removeListener(id);
  }, [rot, n]);

  const settleTo = (target: number, velocity = 0) => {
    Animated.spring(rot, { toValue: target, velocity, useNativeDriver: true, damping: 18, stiffness: 140, mass: 0.8 }).start(({ finished }) => {
      if (finished) onSelect(indexAt(target, n));
    });
  };

  // Outside changes (another control, first load): turn the short way to the chosen sign.
  useEffect(() => {
    if (dragging.current) return;
    if (indexAt(rotNow.current, n) === selectedIndex) return;
    const base = -selectedIndex * STEP;
    const target = base + 360 * Math.round((rotNow.current - base) / 360);
    Animated.spring(rot, { toValue: target, useNativeDriver: true, damping: 18, stiffness: 140, mass: 0.8 }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, n]);

  const fingerAngle = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.pageX - center.current.x;
    const dy = e.nativeEvent.pageY - center.current.y;
    return (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 at the top, clockwise positive
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Sideways drags turn the wheel; up/down drags are left to the page's scroll.
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
        onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          dragging.current = true;
          rot.stopAnimation();
          wheelRef.current?.measureInWindow((x: number, y: number, w: number) => {
            center.current = { x: x + w / 2, y: y + R };
          });
          drag.current = { last: fingerAngle(e), lastT: Date.now(), v: 0 };
        },
        onPanResponderMove: (e) => {
          if (!center.current.x) return;
          const a = fingerAngle(e);
          const d = angleDelta(a, drag.current.last);
          const now = Date.now();
          const dt = Math.max(1, now - drag.current.lastT);
          drag.current = { last: a, lastT: now, v: 0.7 * drag.current.v + 0.3 * (d / dt) };
          rot.setValue(rotNow.current + d);
        },
        onPanResponderRelease: () => {
          dragging.current = false;
          // A flick carries on for a little: project ~180 ms of the finger's speed, then snap.
          const projected = rotNow.current + drag.current.v * 180;
          settleTo(Math.round(projected / STEP) * STEP, drag.current.v * 1000);
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          settleTo(Math.round(rotNow.current / STEP) * STEP);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [R, n],
  );

  const turnTo = (i: number) => {
    haptics.tick();
    const base = -i * STEP;
    settleTo(base + 360 * Math.round((rotNow.current - base) / 360));
  };

  const rotate = rot.interpolate({ inputRange: [-360, 360], outputRange: ["-360deg", "360deg"], extrapolate: "extend" });
  // Rings scale with the wheel: glyphs just inside the rim, names right inside them (still clear of the
  // flat edge for the ±30° neighbours). Nothing inside R/2 shows, so dividers stop there.
  const GLYPH = Math.round(Math.min(52, Math.max(40, R * 0.26)));
  const rGlyph = R - GLYPH / 2 - 4;
  const rInner = Math.round(R / 2);
  const rName = Math.round(rGlyph - GLYPH / 2 - 12);
  const nameW = Math.floor(2 * rName * Math.sin((STEP / 2) * (Math.PI / 180))) - 2; // one segment's chord

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: H, overflow: "hidden" }}>
      {width > 0 ? (
        <View
          ref={wheelRef}
          collapsable={false}
          {...pan.panHandlers}
          style={{ position: "absolute", top: H - D - 12, left: (width - D) / 2, width: D, height: D }}
        >
          {/* The disc and its rim, still; only the signs turn. */}
          <View
            style={{ position: "absolute", inset: 0, borderRadius: R, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...nativeShadow("xs") }}
          />
          <Animated.View style={{ position: "absolute", inset: 0, transform: [{ rotate }] }}>
            {items.map((item, i) => {
              const active = i === pointerIndex;
              return (
                <View key={item.id} pointerEvents="box-none" style={{ position: "absolute", left: R, top: R, width: 0, height: 0, transform: [{ rotate: `${180 + i * STEP}deg` }] }}>
                  {/* Divider between this sign and the next. */}
                  {/* Turned about the wheel's centre (this 0x0 box), so name and glyph sit mid-segment. */}
                  <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transform: [{ rotate: `${STEP / 2}deg` }] }}>
                    <View style={{ position: "absolute", left: -0.5, top: -R, width: 1, height: R - rInner, backgroundColor: colors.border }} />
                  </View>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    style={[
                      nepaliTextStyle(13),
                      { position: "absolute", width: nameW, left: -nameW / 2, top: -rName - 10, transform: [{ rotate: "180deg" }], textAlign: "center", fontWeight: active ? "700" : "500", color: active ? colors.secondary : colors.mutedForeground },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Pressable
                    onPress={() => (active ? undefined : turnTo(i))}
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                    accessibilityState={{ selected: active }}
                    style={{
                      position: "absolute",
                      left: -GLYPH / 2,
                      top: -rGlyph - GLYPH / 2,
                      width: GLYPH,
                      height: GLYPH,
                      borderRadius: GLYPH / 2,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: active ? 2 : 1,
                      borderColor: active ? colors.secondary : colors.border,
                      backgroundColor: active ? colors.muted : colors.background,
                      transform: [{ rotate: "180deg" }], // upright at the foot of the wheel
                    }}
                  >
                    {item.glyph}
                  </Pressable>
                </View>
              );
            })}
          </Animated.View>
          {/* Pointer at the foot, pointing up into the chosen sign. */}
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: R - 7, top: D - 9, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 10, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: colors.secondary }}
          />
        </View>
      ) : null}
    </View>
  );
}
