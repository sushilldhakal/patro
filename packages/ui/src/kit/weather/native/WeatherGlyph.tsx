import { memo } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { weatherInk } from "@vedic-patro/design-tokens";
import type {
  WeatherFactIcon,
  WeatherGlyph as Glyph,
  WeatherUv,
  WeatherWind,
} from "@vedic-patro/features/weather";
import { Icon } from "../../../native/Icon";
import { weatherIconNodes, type WeatherUiIcon } from "../icon-nodes";
import type { MeteoconName } from "../generated/meteocon-names";
import { meteocons } from "../generated/meteocons-static";

/** Static Meteocons: react-native-svg does not play the website's SMIL animation. Memoised, as 48 hours draw at once. */
const Meteocon = memo(function Meteocon({
  name,
  size,
}: {
  name: MeteoconName;
  size: number;
}) {
  return <SvgXml xml={meteocons[name]} width={size} height={size} />;
});

/** A weather condition (Meteocons); the label is its accessible name. */
export function WeatherGlyph({
  glyph,
  size = 32,
}: {
  glyph: Glyph;
  size?: number;
}) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={glyph.label}>
      <Meteocon name={glyph.icon} size={size} />
    </View>
  );
}

/** A page-chrome glyph in a theme tone (back arrow, pin, chevron, ⓘ). */
export function UiIcon({
  name,
  size = 18,
  tone = "secondary",
}: {
  name: WeatherUiIcon;
  size?: number;
  tone?: "secondary" | "foreground";
}) {
  return (
    <Icon
      node={weatherIconNodes[name]}
      size={size}
      tone={tone}
      strokeWidth={2}
    />
  );
}

/** Arrow pointing where the wind goes. */
export function WindArrow({
  wind,
  size = 16,
}: {
  wind: Pick<WeatherWind, "arrowDeg">;
  size?: number;
}) {
  return (
    <View style={{ transform: [{ rotate: `${wind.arrowDeg}deg` }] }}>
      <UiIcon name="arrow" size={size} />
    </View>
  );
}

/** UV band dot. */
export function UvDot({ uv }: { uv: WeatherUv }) {
  return (
    <View
      className="size-2.5 rounded-full"
      style={{ backgroundColor: weatherInk.uv[uv.level] }}
    />
  );
}

/** The mark beside a fact: the wind's arrow, or its Meteocon. */
export function FactIcon({
  icon,
  size = 22,
}: {
  icon: WeatherFactIcon;
  size?: number;
}) {
  if (icon.kind === "arrow")
    return <WindArrow wind={{ arrowDeg: icon.deg }} size={size - 4} />;
  return <Meteocon name={icon.name} size={size} />;
}
