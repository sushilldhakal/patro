import { cn } from "@vedic-patro/design-tokens/cn";
import { tithiIndexFromElementSpan } from "@vedic-patro/domain/tithi-wheel-data";
import { NAKSHATRA_GLYPHS, RASHI_GLYPHS, type GlyphArt } from "../glyph-art";
import { grahaKeyFromLabel, nakshatraIconIndex, rashiIconIndex } from "../glyph-lookup";
import { CalendarMoonPhaseIcon } from "./CalendarMoonPhaseIcon";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";

export type GlyphIconProps = {
  name?: string | null;
  number?: number | null;
  size?: number;
  className?: string;
};

function GlyphSvg({ art, size, className }: { art: GlyphArt; size: number; className?: string }) {
  const [x, y, w, h] = art.vb;
  return (
    <svg
      viewBox={`${x} ${y} ${w} ${h}`}
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0", className)}
      style={{ color: "var(--glyph-color)" }}
    >
      <g
        transform={art.transform}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={art.strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {art.paths.map((path, index) => (
          <path key={index} d={path.d} strokeWidth={path.strokeWidth} />
        ))}
      </g>
    </svg>
  );
}

export function RashiGlyphIcon({ name, number, size = 28, className }: GlyphIconProps) {
  const idx = rashiIconIndex(name, number);
  const art = idx == null ? undefined : RASHI_GLYPHS[idx];
  if (!art) return null;
  return <GlyphSvg art={art} size={size} className={className} />;
}

export function NakshatraGlyphIcon({ name, number, size = 28, className }: GlyphIconProps) {
  const idx = nakshatraIconIndex(name, number);
  const art = idx == null ? undefined : NAKSHATRA_GLYPHS[idx];
  if (!art) return null;
  return <GlyphSvg art={art} size={size} className={className} />;
}

export function ElementPlanetIcon({
  planet,
  size = 26,
  className,
}: {
  planet?: string | null;
  size?: number;
  className?: string;
}) {
  const graha = grahaKeyFromLabel(planet);
  if (!graha) return null;
  return <GrahaPlanetIcon graha={graha} size={size} className={className} />;
}

export function ElementDayRowIcon({
  elementId,
  row,
  size = 26,
  className,
}: {
  elementId?: string;
  row: Record<string, unknown>;
  size?: number;
  className?: string;
}) {
  const num = typeof row.number === "number" ? row.number : undefined;
  if (elementId === "hora") {
    const planet = String(row.planet ?? row.planet_en ?? row.name ?? row.name_ne ?? "");
    return <ElementPlanetIcon planet={planet} size={size} className={className} />;
  }
  if (elementId === "lagna" || elementId === "pushkara" || elementId === "panchaka-rahita") {
    const rashiLabel = String(row.lagna_ne ?? row.lagna ?? row.name_ne ?? row.name ?? "");
    return <RashiGlyphIcon name={rashiLabel} number={num} size={size} className={className} />;
  }
  return null;
}

export function ElementSpanIcon({
  elementId,
  span,
  size = 32,
  className,
}: {
  elementId: string;
  span: { name: string; name_ne: string; number: number; paksha?: string };
  size?: number;
  className?: string;
}) {
  if (elementId === "nakshatra") {
    return <NakshatraGlyphIcon name={span.name_ne || span.name} number={span.number} size={size} className={className} />;
  }
  if (elementId === "chandra-rashi") {
    return <RashiGlyphIcon name={span.name_ne || span.name} number={span.number} size={size} className={className} />;
  }
  if (elementId === "tithi") {
    return (
      <CalendarMoonPhaseIcon
        tithiIndex={tithiIndexFromElementSpan(span)}
        className={cn(className, "shrink-0")}
        style={{ width: size, height: size }}
      />
    );
  }
  return null;
}
