import { type ReactNode } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, {
  Circle,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { VedicPatroLoader as VedicPatroLoaderView } from "@vedic-patro/ui/kit/shell";
import { Defs } from "@/lib/svg-defs";
import { brand, illustration, midnight } from "@vedic-patro/design-tokens";
import { useBrandMotionEnabled, useOpacityPulse, useRotate, useScalePulse } from "./svg-motion";

export const PAGE_LOADER_SIZE = 120;

/** Center of the inner 100×100 artboard — web `transform-origin: 50px 50px`. */
const PIVOT = { x: 50, y: 50 };

const WRAYS = [
  "M49.04 32.03 L50.00 22.00 L50.96 32.03 Z",
  "M58.15 33.95 L64.00 25.75 L59.82 34.92 Z",
  "M65.08 40.18 L74.25 36.00 L66.05 41.85 Z",
  "M67.97 49.04 L78.00 50.00 L67.97 50.96 Z",
  "M66.05 58.15 L74.25 64.00 L65.08 59.82 Z",
  "M59.82 65.08 L64.00 74.25 L58.15 66.05 Z",
  "M50.96 67.97 L50.00 78.00 L49.04 67.97 Z",
  "M41.85 66.05 L36.00 74.25 L40.18 65.08 Z",
  "M34.92 59.82 L25.75 64.00 L33.95 58.15 Z",
  "M32.03 50.96 L22.00 50.00 L32.03 49.04 Z",
  "M33.95 41.85 L25.75 36.00 L34.92 40.18 Z",
  "M40.18 34.92 L36.00 25.75 L41.85 33.95 Z",
] as const;

const DOTS = [
  [50, 10, 3], [60.35, 11.36, 2.83], [70, 15.36, 2.67], [78.28, 21.72, 2.5],
  [84.64, 30, 2.33], [88.64, 39.65, 2.17], [90, 50, 2], [88.64, 60.35, 1.83],
  [84.64, 70, 1.67], [78.28, 78.28, 1.5], [70, 84.64, 1.33], [60.35, 88.64, 1.17],
  [50, 90, 1], [39.65, 88.64, 1.17], [30, 84.64, 1.33], [21.72, 78.28, 1.5],
  [15.36, 70, 1.67], [11.36, 60.35, 1.83], [10, 50, 2], [11.36, 39.65, 2.17],
  [15.36, 30, 2.33], [21.72, 21.72, 2.5], [30, 15.36, 2.67], [39.65, 11.36, 2.83],
] as const;

/** The inner 100×100 artboard, placed exactly as in web `loader.svg`. */
const ART = "translate(26, 26) scale(4.6)";

/**
 * Web `loader.svg` motion. CSS inside the SVG does not run in react-native-svg,
 * and animated props on SVG nodes freeze Android, so each moving part is a
 * separate SVG wrapped in a native animated view. The artboard center lands on
 * the view center, so those view transforms match the web file.
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
  style?: StyleProp<ViewStyle>;
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
        </Defs>
        <G transform={ART}>{children}</G>
      </Svg>
    </Animated.View>
  );
}

function LoaderSvg({ size }: { size: number }) {
  const motion = useBrandMotionEnabled();
  const wrays = useRotate(-360, 30_000, motion);
  const dots = useRotate(360, 48_000, motion);
  const ring = useRotate(-360, 60_000, motion);
  const sun = useScalePulse(1.05, 1_700, motion);
  const halo = useOpacityPulse(0.4, 0.85, 1_700, motion, 1);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Defs>
          <LinearGradient id="vpl-g" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={illustration.amber77} />
            <Stop offset="0.5" stopColor={illustration.amber60} />
            <Stop offset="1" stopColor={illustration.orange46} />
          </LinearGradient>
          <LinearGradient id="vpl-bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={illustration.teal25} />
            <Stop offset="1" stopColor={brand.bluePressed} />
          </LinearGradient>
        </Defs>
        <Rect width={512} height={512} rx={116} fill="url(#vpl-bg)" />
        <G transform={ART}>
          <Circle cx={PIVOT.x} cy={PIVOT.y} r={33} fill="none" stroke="url(#vpl-g)" strokeWidth={1.4} opacity={0.5} />
        </G>
      </Svg>

      <Layer size={size} id="vpl-ring" style={{ transform: [{ rotate: ring }] }}>
        <Circle
          cx={PIVOT.x}
          cy={PIVOT.y}
          r={44}
          fill="none"
          stroke="url(#vpl-ring-g)"
          strokeWidth={1.4}
          opacity={0.5}
        />
      </Layer>

      <Layer size={size} id="vpl-dots" style={{ transform: [{ rotate: dots }] }}>
        {DOTS.map(([cx, cy, r], i) => (
          <Circle key={i} cx={cx} cy={cy} r={r} fill="url(#vpl-dots-g)" />
        ))}
      </Layer>

      <Layer size={size} id="vpl-halo" fade style={{ opacity: halo }}>
        <Circle cx={PIVOT.x} cy={PIVOT.y} r={24} fill="url(#vpl-halo-halo)" />
      </Layer>

      <Layer size={size} id="vpl-wrays" style={{ transform: [{ rotate: wrays }] }}>
        {WRAYS.map((d, i) => (
          <Path key={i} d={d} fill="url(#vpl-wrays-g)" />
        ))}
      </Layer>

      <Layer size={size} id="vpl-sun" style={{ transform: [{ scale: sun }] }}>
        <Circle cx={PIVOT.x} cy={PIVOT.y} r={16} fill="url(#vpl-sun-sun)" />
        <Circle cx={PIVOT.x} cy={PIVOT.y} r={4.4} fill={brand.bluePressed} opacity={0.8} />
      </Layer>
    </View>
  );
}

export function VedicPatroLoader({
  label,
  size = PAGE_LOADER_SIZE,
  className,
}: {
  label?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <VedicPatroLoaderView
      label={label}
      className={className}
      mark={
        <View className="overflow-hidden rounded-[22%] shadow-md" style={{ width: size, height: size }}>
          <LoaderSvg size={size} />
        </View>
      }
    />
  );
}
