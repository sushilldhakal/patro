import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { GRAHA_NAME } from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { grahaKeyFromName, HORA_TO_GRAHA } from "@/lib/graha-planet-icons";
import type { HoraPlanetKey } from "@/lib/hora-data";
import { nakshatraGlyphUrl, rashiGlyphUrl } from "@/lib/element-glyph-urls";
import { tithiIndexFromElementSpan } from "@/lib/tithi-wheel-data";
import { cn } from "@/lib/utils";

type ImgProps = {
  src: string;
  size: number;
  className?: string;
};

/**
 * The राशि / नक्षत्र artwork is single-colour (`currentColor`), which an `<img>`
 * cannot inherit — it would always draw black. Painting the SVG as a mask over a
 * background colour lets one token, `--glyph-color` in index.css, recolour every
 * glyph in light and dark mode.
 */
function GlyphImg({ src, size, className }: ImgProps) {
  return (
    <span
      className={cn("glyph-icon", className)}
      style={{ "--glyph-src": `url("${src}")`, width: size, height: size } as React.CSSProperties}
      aria-hidden
    />
  );
}

export function RashiGlyphIcon({
  name,
  number,
  size = 28,
  className,
}: {
  name?: string | null;
  number?: number | null;
  size?: number;
  className?: string;
}) {
  const src = rashiGlyphUrl(name, number);
  if (!src) return null;
  return <GlyphImg src={src} size={size} className={className} />;
}

export function NakshatraGlyphIcon({
  name,
  number,
  size = 28,
  className,
}: {
  name?: string | null;
  number?: number | null;
  size?: number;
  className?: string;
}) {
  const src = nakshatraGlyphUrl(name, number);
  if (!src) return null;
  return <GlyphImg src={src} size={size} className={className} />;
}

function grahaKeyFromLabel(raw?: string | null): GrahaKey | undefined {
  if (!raw?.trim()) return undefined;
  const direct = grahaKeyFromName(raw);
  if (direct) return direct;
  const lower = raw.trim().toLowerCase();
  for (const [horaKey, graha] of Object.entries(HORA_TO_GRAHA) as [HoraPlanetKey, GrahaKey][]) {
    if (lower.includes(horaKey)) return graha;
  }
  for (const [key, labels] of Object.entries(GRAHA_NAME) as [GrahaKey, { ne: string; en: string }][]) {
    if (lower.includes(labels.en.toLowerCase()) || raw.includes(labels.ne)) return key;
  }
  return undefined;
}

/** Planet marker for hora / graha-named element rows. */
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

/** Icon for a panchanga element day-table row. */
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

  if (
    elementId === "lagna" ||
    elementId === "pushkara" ||
    elementId === "panchaka-rahita"
  ) {
    const rashiLabel = String(row.lagna_ne ?? row.lagna ?? row.name_ne ?? row.name ?? "");
    return (
      <RashiGlyphIcon
        name={rashiLabel}
        number={num}
        size={size}
        className={className}
      />
    );
  }

  return null;
}

/** Icon for span cards (nakshatra month grid, chandra-rashi month grid). */
export function ElementSpanIcon({
  elementId,
  span,
  size = 32,
  className,
}: {
  elementId: string;
  span: { name: string; name_ne: string; number: number };
  size?: number;
  className?: string;
}) {
  if (elementId === "nakshatra") {
    return (
      <NakshatraGlyphIcon
        name={span.name_ne || span.name}
        number={span.number}
        size={size}
        className={className}
      />
    );
  }
  if (elementId === "chandra-rashi") {
    return (
      <RashiGlyphIcon
        name={span.name_ne || span.name}
        number={span.number}
        size={size}
        className={className}
      />
    );
  }
  if (elementId === "tithi") {
    const tithiIndex = tithiIndexFromElementSpan(span);
    return (
      <CalendarMoonPhaseIcon
        tithiIndex={tithiIndex}
        className={cn(className, "shrink-0")}
        style={{ width: size, height: size }}
      />
    );
  }
  return null;
}
