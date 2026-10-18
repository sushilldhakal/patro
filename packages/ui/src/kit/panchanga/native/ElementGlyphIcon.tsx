import { G, Path, Svg } from "react-native-svg";
import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { dark, light } from "@vedic-patro/design-tokens";
import { tithiIndexFromElementSpan } from "@vedic-patro/domain/panchanga/tithi-wheel-data";
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

function GlyphSvg({ art, size }: { art: GlyphArt; size: number }) {
  const scheme = useColorScheme();
  const color = scheme.colorScheme === "dark" ? dark.glyph : light.glyph;
  const [x, y, w, h] = art.vb;
  return (
    <Svg width={size} height={size} viewBox={`${x} ${y} ${w} ${h}`}>
      <G
        transform={art.transform}
        fill={color}
        stroke={color}
        strokeWidth={art.strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {art.paths.map((path, index) => (
          <Path key={index} d={path.d} strokeWidth={path.strokeWidth} fill={color} stroke={color} />
        ))}
      </G>
    </Svg>
  );
}

export function RashiGlyphIcon({ name, number, size = 28 }: GlyphIconProps) {
  const idx = rashiIconIndex(name, number);
  const art = idx == null ? undefined : RASHI_GLYPHS[idx];
  if (!art) return null;
  return <GlyphSvg art={art} size={size} />;
}

export function NakshatraGlyphIcon({ name, number, size = 28 }: GlyphIconProps) {
  const idx = nakshatraIconIndex(name, number);
  const art = idx == null ? undefined : NAKSHATRA_GLYPHS[idx];
  if (!art) return null;
  return <GlyphSvg art={art} size={size} />;
}

export function ElementPlanetIcon({ planet, size = 26 }: { planet?: string | null; size?: number; className?: string }) {
  const graha = grahaKeyFromLabel(planet);
  if (!graha) return null;
  return <GrahaPlanetIcon graha={graha} size={size} />;
}

export function ElementDayRowIcon({
  elementId,
  row,
  size = 26,
}: {
  elementId?: string;
  row: Record<string, unknown>;
  size?: number;
  className?: string;
}) {
  const num = typeof row.number === "number" ? row.number : undefined;
  if (elementId === "hora") {
    const planet = String(row.planet ?? row.planet_en ?? row.name ?? row.name_ne ?? "");
    return <ElementPlanetIcon planet={planet} size={size} />;
  }
  if (elementId === "lagna" || elementId === "pushkara" || elementId === "panchaka-rahita") {
    const rashiLabel = String(row.lagna_ne ?? row.lagna ?? row.name_ne ?? row.name ?? "");
    return <RashiGlyphIcon name={rashiLabel} number={num} size={size} />;
  }
  return null;
}

export function ElementSpanIcon({
  elementId,
  span,
  size = 32,
}: {
  elementId: string;
  span: { name: string; name_ne: string; number: number; paksha?: string };
  size?: number;
  className?: string;
}) {
  if (elementId === "nakshatra") {
    return <NakshatraGlyphIcon name={span.name_ne || span.name} number={span.number} size={size} />;
  }
  if (elementId === "chandra-rashi") {
    return <RashiGlyphIcon name={span.name_ne || span.name} number={span.number} size={size} />;
  }
  if (elementId === "tithi") {
    return (
      <View style={{ width: size, height: size }}>
        <CalendarMoonPhaseIcon tithiIndex={tithiIndexFromElementSpan(span)} size={size} />
      </View>
    );
  }
  return null;
}
