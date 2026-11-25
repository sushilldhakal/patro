import { weatherInk } from "@vedic-patro/design-tokens";
import type {
  WeatherFactIcon,
  WeatherGlyph as Glyph,
  WeatherUv,
  WeatherWind,
} from "@vedic-patro/features/weather";
import type { IconNode } from "../../../contract";
import { weatherIconNodes, type WeatherUiIcon } from "../icon-nodes";
import type { MeteoconName } from "../generated/meteocon-names";
import { meteocons } from "../generated/meteocons-animated";

/** Data URIs, built once per icon: an <img> keeps each icon's gradient ids to itself and plays its SMIL animation. */
const uris = new Map<MeteoconName, string>();
function uri(name: MeteoconName): string {
  let u = uris.get(name);
  if (!u) {
    u = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(meteocons[name])}`;
    uris.set(name, u);
  }
  return u;
}

function Meteocon({
  name,
  size,
  label,
}: {
  name: MeteoconName;
  size: number;
  label?: string;
}) {
  return (
    <img
      src={uri(name)}
      width={size}
      height={size}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className="shrink-0 select-none"
    />
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
}: {
  glyph: Glyph;
  size?: number;
}) {
  return <Meteocon name={glyph.icon} size={size} label={glyph.label} />;
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
