import { memo, useEffect, type ReactNode } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useColorScheme } from "nativewind";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { weatherInk } from "@vedic-patro/design-tokens";
import { weatherClasses as wc } from "@vedic-patro/design-tokens/classes/weather-classes";
import { Box, Text } from "@vedic-patro/ui";
import type {
  NowWeather,
  WeatherFactIcon,
  WeatherGlyph as Glyph,
  WeatherUv,
  WeatherWind,
} from "@vedic-patro/features/weather";
import { Icon } from "../../../native/Icon";
import { weatherIconNodes, type WeatherUiIcon } from "../icon-nodes";
import type { MeteoconName } from "../generated/meteocon-names";
import { meteocons } from "../generated/meteocons-static";
import { meteoconOnLight } from "../cloud-ink";

const onLight = new Map<MeteoconName, string>();

/** On the light theme the white clouds vanish on a white card, so they are drawn grey instead. */
function lightXml(name: MeteoconName): string {
  let xml = onLight.get(name);
  if (!xml) {
    xml = meteoconOnLight(meteocons[name]);
    onLight.set(name, xml);
  }
  return xml;
}

/** Static Meteocons: react-native-svg does not play the website's SMIL animation. Memoised, as 48 hours draw at once. */
const Meteocon = memo(function Meteocon({
  name,
  size,
  light,
}: {
  name: MeteoconName;
  size: number;
  light: boolean;
}) {
  return <SvgXml xml={light ? lightXml(name) : meteocons[name]} width={size} height={size} />;
});

/** One loop of the icon's motion, by what it shows; still when the reader asked for reduced motion. */
function Moving({ name, size, children }: { name: MeteoconName; size: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  const spin = name === "clear-day";
  const bob = /rain|drizzle|snow|sleet|hail|thunder/.test(name);
  useEffect(() => {
    if (reduced) return;
    t.set(
      spin
        ? withRepeat(withTiming(1, { duration: 24_000, easing: Easing.linear }), -1, false)
        : withRepeat(withTiming(1, { duration: bob ? 1400 : 3200, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(t);
  }, [reduced, spin, bob, t]);
  const style = useAnimatedStyle(() =>
    spin
      ? { transform: [{ rotate: `${t.get() * 360}deg` }] }
      : bob
        ? { transform: [{ translateY: t.get() * 3 - 1.5 }] }
        : { transform: [{ translateX: t.get() * 4 - 2 }] },
  );
  // Sized to the icon, so the sun turns about its own centre, not the row's.
  return <Animated.View style={[{ width: size, height: size }, style]}>{children}</Animated.View>;
}

/** A weather condition (Meteocons); the label is its accessible name. */
export function WeatherGlyph({
  glyph,
  size = 32,
  onSky,
  animated,
}: {
  glyph: Glyph;
  size?: number;
  /** Drawn on the dark sky: keep the white clouds in both themes. */
  onSky?: boolean;
  /**
   * Gentle motion (the website plays the Meteocons' own SMIL, which react-native-svg cannot): the sun
   * turns, clouds drift, rain and snow bob. For the few big icons only; a 48-hour table stays still.
   */
  animated?: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const icon = <Meteocon name={glyph.icon} size={size} light={onSky ? false : colorScheme !== "dark"} />;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={glyph.label}>
      {animated ? <Moving name={glyph.icon} size={size}>{icon}</Moving> : icon}
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
  /** `onBrand`: light ink on the dark sky. */
  tone?: "secondary" | "foreground" | "onBrand";
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
  const { colorScheme } = useColorScheme();
  if (icon.kind === "arrow")
    return <WindArrow wind={{ arrowDeg: icon.deg }} size={size - 4} />;
  return <Meteocon name={icon.name} size={size} light={colorScheme !== "dark"} />;
}

/** The weather now (home's today card): the place, then icon and temperature, then feels-like. */
export function NowWeatherBadge({ weather }: { weather: NowWeather }) {
  return (
    <Box className={wc.nowBadge}>
      <Text className={wc.nowBadgePlace} numberOfLines={1}>{weather.place}</Text>
      <Box className={wc.nowBadgeRow}>
        <WeatherGlyph glyph={weather.glyph} size={30} animated />
        <Text className={wc.nowBadgeTemp}>{weather.temperature}</Text>
      </Box>
      <Text className={wc.nowBadgeLabel}>{weather.feelsLike}</Text>
    </Box>
  );
}
