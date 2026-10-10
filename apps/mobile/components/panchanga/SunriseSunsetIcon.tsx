import type { ViewStyle } from "react-native";
import { View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { SUNRISE_ICON_PATH, SUNRISE_ICON_VIEWBOX } from "@vedic-patro/domain/sunrise-icon-art";

export type SunHorizonVariant = "rise" | "set";

type Props = {
  variant: SunHorizonVariant;
  /** Icon width in px (height follows SVG aspect ratio). */
  size?: number;
  color?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/** Sunrise / sunset glyph from `assets/sunrise-icon.svg` (180° flip for sunset). */
export function SunriseSunsetIcon({
  variant,
  size = 22,
  color = "#f59e0b",
  style,
  accessibilityLabel,
}: Props) {
  const aspect = SUNRISE_ICON_VIEWBOX.h / SUNRISE_ICON_VIEWBOX.w;
  const w = size;
  const h = size * aspect;
  const { w: vbW, h: vbH } = SUNRISE_ICON_VIEWBOX;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[{ width: w, height: h }, style]}
    >
      <Svg width={w} height={h} viewBox={`0 0 ${vbW} ${vbH}`}>
        <G transform={variant === "set" ? `rotate(180 ${vbW / 2} ${vbH / 2})` : undefined}>
          <Path d={SUNRISE_ICON_PATH} fill={color} />
        </G>
      </Svg>
    </View>
  );
}

/** Timeline marker — horizon line at `y` (rise: sun above; set: flipped). */
export function SunTimelineMarker({
  x,
  y,
  variant,
  fill,
  width = 22,
}: {
  x: number;
  y: number;
  variant: SunHorizonVariant;
  fill: string;
  width?: number;
}) {
  const { w: vbW, h: vbH } = SUNRISE_ICON_VIEWBOX;
  const scale = width / vbW;
  const h = vbH * scale;
  const left = x - width / 2;
  const top = variant === "rise" ? y - h : y;

  return (
    <G transform={`translate(${left}, ${top}) scale(${scale})`}>
      <G transform={variant === "set" ? `rotate(180 ${vbW / 2} ${vbH / 2})` : undefined}>
        <Path d={SUNRISE_ICON_PATH} fill={fill} />
      </G>
    </G>
  );
}
