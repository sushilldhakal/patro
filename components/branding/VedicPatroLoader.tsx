import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import Animated, { useSharedValue } from "react-native-reanimated";
import Svg, {
  Circle,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { useLocale } from "@/lib/i18n";
import { Defs } from "@/lib/svg-defs";
import {
  AnimatedG,
  useOpacityOscillation,
  useOpacityPulse,
  usePivotTransform,
  useReduceMotionEnabled,
  useScalePulse,
  useSpin,
} from "./svg-motion";

export const PAGE_LOADER_SIZE = 120;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Center of inner 100×100 artboard — matches web `transform-origin: 50px 50px`. */
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

function LoaderSvg({ size }: { size: number }) {
  const reduceMotion = useReduceMotionEnabled();

  const wraysRotation = useSharedValue(0);
  const dotsRotation = useSharedValue(0);
  const ringRotation = useSharedValue(0);
  const sunScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.4);

  useSpin(wraysRotation, -360, 30_000, reduceMotion);
  useSpin(dotsRotation, 360, 48_000, reduceMotion);
  useSpin(ringRotation, -360, 60_000, reduceMotion);
  useScalePulse(sunScale, 1.05, 1700, reduceMotion);
  useOpacityOscillation(haloOpacity, 0.85, 0.4, 1700, reduceMotion);

  const wraysProps = usePivotTransform(PIVOT, wraysRotation, null);
  const dotsProps = usePivotTransform(PIVOT, dotsRotation, null);
  const ringProps = usePivotTransform(PIVOT, ringRotation, null);
  const sunProps = usePivotTransform(PIVOT, null, sunScale);
  const haloProps = useOpacityPulse(haloOpacity);

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        <LinearGradient id="vpl-g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#f6da8a" />
          <Stop offset="0.5" stopColor="#e6b94d" />
          <Stop offset="1" stopColor="#c79126" />
        </LinearGradient>
        <RadialGradient id="vpl-sun" cx="0.38" cy="0.34" r="0.75">
          <Stop offset="0" stopColor="#fbe9b6" />
          <Stop offset="0.55" stopColor="#ecc25e" />
          <Stop offset="1" stopColor="#cf9a2c" />
        </RadialGradient>
        <RadialGradient id="vpl-halo" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#ffe6a0" stopOpacity={0.9} />
          <Stop offset="0.55" stopColor="#f4c95e" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#f4c95e" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="vpl-bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#0e6a6f" />
          <Stop offset="1" stopColor="#073f43" />
        </LinearGradient>
      </Defs>

      <Rect width={512} height={512} rx={116} fill="url(#vpl-bg)" />

      <G transform="translate(26, 26) scale(4.6)">
        <AnimatedG animatedProps={ringProps}>
          <Circle
            cx={PIVOT.x}
            cy={PIVOT.y}
            r={44}
            fill="none"
            stroke="url(#vpl-g)"
            strokeWidth={1.4}
            opacity={0.5}
          />
        </AnimatedG>

        <Circle
          cx={PIVOT.x}
          cy={PIVOT.y}
          r={33}
          fill="none"
          stroke="url(#vpl-g)"
          strokeWidth={1.4}
          opacity={0.5}
        />

        <AnimatedG animatedProps={dotsProps}>
          {DOTS.map(([cx, cy, r], i) => (
            <Circle key={i} cx={cx} cy={cy} r={r} fill="url(#vpl-g)" />
          ))}
        </AnimatedG>

        <AnimatedCircle
          animatedProps={haloProps}
          cx={PIVOT.x}
          cy={PIVOT.y}
          r={24}
          fill="url(#vpl-halo)"
        />

        <AnimatedG animatedProps={wraysProps}>
          {WRAYS.map((d, i) => (
            <Path key={i} d={d} fill="url(#vpl-g)" />
          ))}
        </AnimatedG>

        <AnimatedG animatedProps={sunProps}>
          <Circle cx={PIVOT.x} cy={PIVOT.y} r={16} fill="url(#vpl-sun)" />
          <Circle cx={PIVOT.x} cy={PIVOT.y} r={4.4} fill="#073f43" opacity={0.8} />
        </AnimatedG>
      </G>
    </Svg>
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
  const { pick } = useLocale();
  const shown = label === undefined ? pick("लोड हुँदैछ…", "Loading…") : label;

  return (
    <View className={`items-center justify-center gap-4 ${className ?? ""}`}>
      <View className="overflow-hidden rounded-[22%] shadow-md" style={{ width: size, height: size }}>
        <LoaderSvg size={size} />
      </View>
      {shown ? <Text className="text-sm text-muted-foreground">{shown}</Text> : null}
    </View>
  );
}
