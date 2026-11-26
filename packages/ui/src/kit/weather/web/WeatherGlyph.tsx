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
import type { IconNode } from "../../../contract";
import { weatherIconNodes, type WeatherUiIcon } from "../icon-nodes";
import type { MeteoconName } from "../generated/meteocon-names";
import { meteocons } from "../generated/meteocons-animated";
import { meteoconOnLight } from "../cloud-ink";
import { cn } from "@vedic-patro/design-tokens/cn";

/** Data URIs, built once per icon and ink: an <img> keeps each icon's gradient ids to itself and plays its SMIL animation. */
const uris = new Map<string, string>();
function uri(name: MeteoconName, light: boolean): string {
  const key = `${light ? "l" : "d"}:${name}`;
  let u = uris.get(key);
  if (!u) {
    const xml = light ? meteoconOnLight(meteocons[name]) : meteocons[name];
    u = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    uris.set(key, u);
  }
  return u;
}

function Meteocon({
  name,
  size,
  label,
  onSky,
}: {
  name: MeteoconName;
  size: number;
  label?: string;
  /** On the dark sky: the white clouds in both themes. */
  onSky?: boolean;
}) {
  const img = (light: boolean, className: string) => (
    <img
      src={uri(name, light)}
      width={size}
      height={size}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={cn("shrink-0 select-none", className)}
    />
  );
  if (onSky) return img(false, "");
  // Inside an <img> CSS cannot recolour the SVG, so each theme gets its own copy: grey clouds on light.
  return (
    <>
      {img(true, "dark:hidden")}
      {img(false, "hidden dark:block")}
    </>
  );
}

function Nodes({ node }: { node: IconNode }) {
  return (
    <>
      {node.map(([Tag, attrs], i) => {
        const El = Tag as "path";
        return <El key={i} {...(attrs as object)} />;
      })}
    </>
  );
}

/** A weather condition, animated (Meteocons); the label is its accessible name. */
export function WeatherGlyph({
  glyph,
  size = 32,
  onSky,
}: {
  glyph: Glyph;
  size?: number;
  /** Drawn on the dark sky: keep the white clouds in both themes. */
  onSky?: boolean;
  /** The website's icons already play their own animation; accepted so both kits share one call. */
  animated?: boolean;
}) {
  return <Meteocon name={glyph.icon} size={size} label={glyph.label} onSky={onSky} />;
}

/** A page-chrome glyph in the accent colour (back arrow, pin, chevron, ⓘ). */
export function UiIcon({
  name,
  size = 18,
  className,
}: {
  name: WeatherUiIcon;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className ?? "shrink-0 text-secondary dark:text-primary"}
    >
      <Nodes node={weatherIconNodes[name]} />
    </svg>
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
    <span
      className="inline-flex shrink-0"
      style={{ transform: `rotate(${wind.arrowDeg}deg)` }}
    >
      <UiIcon name="arrow" size={size} />
    </span>
  );
}

/** UV band dot. */
export function UvDot({ uv }: { uv: WeatherUv }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: weatherInk.uv[uv.level] }}
      aria-hidden
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

/** The weather now (home's today card): the place, then icon and temperature, then feels-like. */
export function NowWeatherBadge({ weather }: { weather: NowWeather }) {
  return (
    <Box className={wc.nowBadge}>
      <Text className={wc.nowBadgePlace} numberOfLines={1}>{weather.place}</Text>
      <Box className={wc.nowBadgeRow}>
        <WeatherGlyph glyph={weather.glyph} size={30} />
        <Text className={wc.nowBadgeTemp}>{weather.temperature}</Text>
      </Box>
      <Text className={wc.nowBadgeLabel}>{weather.feelsLike}</Text>
    </Box>
  );
}
