import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from "react-native-svg";
import { brand, illustration, withAlpha } from "@vedic-patro/design-tokens";

/** Gold, 22-carat gold or silver's colour. */
export const metalTint = (id: string) =>
  id === "gold" ? SLIDER_TINT.gold : id === "gold22" ? SLIDER_TINT.gold22 : SLIDER_TINT.silver;

/** Each home slider has its own colour, so the rows read apart at a glance. */
export const SLIDER_TINT = {
  festival: brand.vermilion,
  festivalSoon: brand.saffron,
  news: brand.blue,
  forex: brand.green,
  gold: brand.gold,
  gold22: brand.saffronBright,
  silver: illustration.gray58,
} as const;

/**
 * A home slider card on a soft wash of its colour (strong at the top, fading down) with a
 * border in the same colour: works on the light and the dark theme, since it is the colour at
 * low opacity over the card.
 */
export function TintCard({
  tint,
  width,
  minHeight,
  onPress,
  accessibilityLabel,
  children,
  style,
}: {
  tint: string;
  width: number;
  minHeight: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      className="overflow-hidden rounded-3xl border bg-card p-3 active:opacity-80"
      style={[{ width, minHeight, borderColor: withAlpha(tint, 0.35) }, style]}
    >
      <LinearGradient
        colors={[withAlpha(tint, 0.24), withAlpha(tint, 0.05)]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </Pressable>
  );
}

/** A small price line for a card: no axes, a soft fill under it, oldest value on the left. */
export function Sparkline({
  values,
  color,
  width,
  height = 34,
}: {
  values: number[];
  color: string;
  width: number;
  height?: number;
}) {
  const v = values.filter(Number.isFinite);
  if (v.length < 2 || width <= 0) return <View style={{ height }} />;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const span = hi - lo || 1;
  const pts = v.map(
    (p, i) =>
      [
        (i / (v.length - 1)) * width,
        2 + (1 - (p - lo) / span) * (height - 4),
      ] as const,
  );
  const line = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const id = `spark-${color.replace("#", "")}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.3} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path
        d={`${line} L${width},${height} L0,${height} Z`}
        fill={`url(#${id})`}
      />
      <Path
        d={line}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
