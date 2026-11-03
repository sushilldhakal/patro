import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Circle, Path } from "react-native-svg";
import { brand } from "@vedic-patro/design-tokens";
import { Layer, PIVOT, PIVOT_DX, RAYS } from "./VedicPatroMark";
import { useBrandMotionEnabled } from "./svg-motion";

/** Same as the native splash's `backgroundColor` in app.json (#084548), so the hand-off is invisible. */
const SPLASH_BG = brand.bluePressed;
const MARK_SIZE = 220;
const MEET_MS = 1_300;
/** The mark keeps turning at least this long in total, so a fast start still shows the turn. */
const MIN_SHOW_MS = 2_300;
const FADE_MS = 400;
const SPIN_MS = 9_000;

/**
 * Launch animation. The native splash is a blank brand-coloured screen (assets/splash-blank.png),
 * so this view takes over on the first frame: the crescent moon drops in from above while the
 * sun climbs from below, they meet as the logo, and the sun's rays keep turning until the app
 * is ready, then the whole thing fades away. Each moving part is its own SVG inside a native
 * animated view (see VedicPatroMark) — animating SVG props directly freezes Android.
 */
export function SplashIntro({ ready }: { ready: boolean }) {
  const motion = useBrandMotionEnabled();
  const [done, setDone] = useState(Platform.OS === "web");
  const [minElapsed, setMinElapsed] = useState(false);

  const moonY = useRef(new Animated.Value(-MARK_SIZE * 1.6)).current;
  const sunY = useRef(new Animated.Value(MARK_SIZE * 1.6)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const started = useRef(false);

  // First frame is on screen: only now take the native splash away.
  const onLayout = () => {
    if (started.current) return;
    started.current = true;
    requestAnimationFrame(() => {
      void SplashScreen.hideAsync().catch(() => {
        /* Already hidden or unavailable (common in Expo Go). */
      });
    });
  };

  useEffect(() => {
    if (Platform.OS === "web") return;
    // Safety net: never leave the native splash up if layout never reports.
    const safety = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, 2_500);
    return () => clearTimeout(safety);
  }, []);

  useEffect(() => {
    if (done) return;
    const minTimer = setTimeout(() => setMinElapsed(true), motion ? MIN_SHOW_MS : 700);
    if (!motion) {
      moonY.setValue(0);
      sunY.setValue(0);
      glow.setValue(0.85);
      return () => clearTimeout(minTimer);
    }
    const rise = Easing.out(Easing.cubic);
    const entrance = Animated.parallel([
      Animated.timing(moonY, { toValue: 0, duration: MEET_MS, easing: rise, useNativeDriver: true }),
      Animated.timing(sunY, { toValue: 0, duration: MEET_MS, easing: rise, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(MEET_MS * 0.55),
        Animated.timing(glow, { toValue: 0.85, duration: 600, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(MEET_MS * 0.85),
        Animated.timing(pop, { toValue: 1.1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pop, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ]);
    const turning = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: SPIN_MS, easing: Easing.linear, useNativeDriver: true }),
    );
    entrance.start();
    turning.start();
    return () => {
      clearTimeout(minTimer);
      entrance.stop();
      turning.stop();
    };
  }, [done, glow, moonY, motion, pop, spin, sunY]);

  useEffect(() => {
    if (done || !ready || !minElapsed) return;
    const out = Animated.timing(fade, { toValue: 0, duration: FADE_MS, useNativeDriver: true });
    out.start(({ finished }) => finished && setDone(true));
    return () => out.stop();
  }, [done, fade, minElapsed, ready]);

  if (done) return null;

  const dx = PIVOT_DX * MARK_SIZE;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View
      onLayout={onLayout}
      accessible
      accessibilityLabel="Vedic Patro"
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}
    >
      <View style={{ width: MARK_SIZE, height: MARK_SIZE }}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: moonY }] }]}>
          <Layer size={MARK_SIZE} id="spl-cres">
            <Path
              d="M46.3 8.5 A41.5 41.5 0 1 0 46.3 91.5 A41.5 41.5 0 1 0 46.3 8.5 Z"
              mask="url(#spl-cres-cres)"
              fill="url(#spl-cres-g)"
            />
          </Layer>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: sunY }] }]}>
          <Layer size={MARK_SIZE} id="spl-halo" fade style={{ opacity: glow }}>
            <Circle cx={PIVOT.x} cy={PIVOT.y} r={29.3} fill="url(#spl-halo-halo)" />
          </Layer>
          <Layer
            size={MARK_SIZE}
            id="spl-rays"
            style={{ transform: [{ translateX: dx }, { rotate }, { translateX: -dx }] }}
          >
            {RAYS.map((d, i) => (
              <Path key={i} d={d} fill="url(#spl-rays-g)" />
            ))}
          </Layer>
          <Layer
            size={MARK_SIZE}
            id="spl-sun"
            style={{ transform: [{ translateX: dx }, { scale: pop }, { translateX: -dx }] }}
          >
            <Circle cx={PIVOT.x} cy={PIVOT.y} r={17.7} fill="url(#spl-sun-sun)" />
            <Circle
              cx={PIVOT.x}
              cy={PIVOT.y}
              r={17.7}
              fill="none"
              stroke={brand.bluePressed}
              strokeWidth={1.2}
              opacity={0.18}
            />
          </Layer>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: SPLASH_BG, alignItems: "center", justifyContent: "center", zIndex: 1000 },
});
