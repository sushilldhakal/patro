import { type ReactNode } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, {
  Circle,
  G,
  LinearGradient,
  Mask,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { Defs } from "@/lib/svg-defs";
import { brand, illustration, midnight, neutral } from "@vedic-patro/design-tokens";
import { useBrandMotionEnabled, useOpacityPulse, useRotate, useScalePulse } from "./svg-motion";

/** Sun pivot in the inner 100×100 artboard — web `transform-origin: 63.4px 50px`. */
const PIVOT = { x: 63.4, y: 50 };

/**
 * That pivot after `translate(6, 6) scale(5)` inside the 512 viewBox:
 * 6 + 63.4 * 5 = 323, i.e. 67 units right of the view center (256), on the
 * vertical center. As a fraction of the view width:
 */
const PIVOT_DX = (323 - 256) / 512;

const RAYS = [
  "M62.13 30.54 L63.40 18.30 L64.67 30.54 Z",
  "M69.67 31.54 L75.53 20.71 L72.02 32.51 Z",
  "M76.26 35.34 L85.82 27.58 L78.06 37.14 Z",
  "M80.89 41.38 L92.69 37.87 L81.86 43.73 Z",
  "M82.86 48.73 L95.10 50.00 L82.86 51.27 Z",
  "M81.86 56.27 L92.69 62.13 L80.89 58.62 Z",
  "M78.06 62.86 L85.82 72.42 L76.26 64.66 Z",
  "M72.02 67.49 L75.53 79.29 L69.67 68.46 Z",
  "M64.67 69.46 L63.40 81.70 L62.13 69.46 Z",
  "M57.13 68.46 L51.27 79.29 L54.78 67.49 Z",
  "M50.54 64.66 L40.98 72.42 L48.74 62.86 Z",
  "M45.91 58.62 L34.11 62.13 L44.94 56.27 Z",
  "M43.94 51.27 L31.70 50.00 L43.94 48.73 Z",
  "M44.94 43.73 L34.11 37.87 L45.91 41.38 Z",
  "M48.74 37.14 L40.98 27.58 L50.54 35.34 Z",
  "M54.78 32.51 L51.27 20.71 L57.13 31.54 Z",
] as const;

const ART = "translate(6, 6) scale(5)";

/**
 * Web `favicon.svg` motion, driven on native views.
 *
 * react-native-svg does not run the SVG's CSS animations. Animated props on
 * the SVG nodes themselves (Reanimated or otherwise) crash the Android draw
 * loop, so each moving part is its own SVG and the view around it spins,
 * scales, or fades. The sun and rays pivot on the same point as the web file.
 */
function Layer({
  size,
  id,
  style,
  fade,
  children,
}: {
  size: number;
  id: string;
  style?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  fade?: boolean;
  children: ReactNode;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      collapsable={false}
      needsOffscreenAlphaCompositing={fade}
      style={[StyleSheet.absoluteFill, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Defs>
          <LinearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={illustration.amber77} />
            <Stop offset="0.5" stopColor={illustration.amber60} />
            <Stop offset="1" stopColor={illustration.orange46} />
          </LinearGradient>
          <RadialGradient id={`${id}-sun`} cx="0.38" cy="0.34" r="0.75">
            <Stop offset="0" stopColor={illustration.amber85} />
            <Stop offset="0.55" stopColor={midnight.gold} />
            <Stop offset="1" stopColor={illustration.orange46} />
          </RadialGradient>
          <RadialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={illustration.amber81} stopOpacity={0.9} />
            <Stop offset="0.55" stopColor={illustration.amber66} stopOpacity={0.35} />
            <Stop offset="1" stopColor={illustration.amber66} stopOpacity={0} />
          </RadialGradient>
          <Mask id={`${id}-cres`}>
            <Rect width={100} height={100} fill={neutral.black} />
            <Circle cx={46.3} cy={50} r={41.5} fill={neutral.white} />
            <Circle cx={68.3} cy={50} r={36.6} fill={neutral.black} />
          </Mask>
        </Defs>
        <G transform={ART}>{children}</G>
      </Svg>
    </Animated.View>
  );
}

export function VedicPatroMark({ size = 42 }: { size?: number }) {
  const motion = useBrandMotionEnabled();
  const rays = useRotate(360, 26_000, motion);
  const sun = useScalePulse(1.05, 1_700, motion);
  const halo = useOpacityPulse(0.4, 0.85, 1_700, motion, 1);
  const crescent = useOpacityPulse(0.92, 1, 3_000, motion, 1);
  // Turn about the sun, not the view center: shift to the pivot, transform,
  // shift back. (`transformOrigin` with a native-driven transform made these
  // layers vanish on Android.)
  const dx = PIVOT_DX * size;

  return (
    <View
      accessible
      accessibilityLabel="Vedic Patro"
      pointerEvents="none"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Defs>
          <LinearGradient id="vpm-bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={illustration.teal25} />
            <Stop offset="1" stopColor={brand.bluePressed} />
          </LinearGradient>
        </Defs>
        <Rect width={512} height={512} rx={116} fill="url(#vpm-bg)" />
      </Svg>

      <Layer size={size} id="vpm-cres" fade style={{ opacity: crescent }}>
        <Path
          d="M46.3 8.5 A41.5 41.5 0 1 0 46.3 91.5 A41.5 41.5 0 1 0 46.3 8.5 Z"
          mask="url(#vpm-cres-cres)"
          fill="url(#vpm-cres-g)"
        />
      </Layer>

      <Layer size={size} id="vpm-halo" fade style={{ opacity: halo }}>
        <Circle cx={PIVOT.x} cy={PIVOT.y} r={29.3} fill="url(#vpm-halo-halo)" />
      </Layer>

      <Layer size={size} id="vpm-rays" style={{ transform: [{ translateX: dx }, { rotate: rays }, { translateX: -dx }] }}>
        {RAYS.map((d, i) => (
          <Path key={i} d={d} fill="url(#vpm-rays-g)" />
        ))}
      </Layer>

      <Layer size={size} id="vpm-sun" style={{ transform: [{ translateX: dx }, { scale: sun }, { translateX: -dx }] }}>
        <Circle cx={PIVOT.x} cy={PIVOT.y} r={17.7} fill="url(#vpm-sun-sun)" />
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
    </View>
  );
}
