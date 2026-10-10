import { G, Path } from "react-native-svg";
import type { GlyphArt } from "@/lib/wheel-glyph-art";

export { NAKSHATRA_GLYPHS, RASHI_GLYPHS } from "@/lib/wheel-glyph-art";
export type { GlyphArt } from "@/lib/wheel-glyph-art";

/**
 * Draw a glyph centred on (cx, cy), fitted into a `size`-square box.
 *
 * The web build inlines the raw SVG markup and scales it by hand. On native a
 * nested `<Svg>` is not an option — react-native-svg always renders `Svg` as a
 * *native view*, which cannot be positioned by the parent SVG's transforms — so
 * the asset geometry is pre-extracted (see scripts/generate-wheel-glyphs.mjs)
 * and drawn here as ordinary `<Path>` elements under a translate+scale group.
 *
 * The fit is "contain", matching the assets' own `preserveAspectRatio`.
 */
export function WheelGlyph({
  art,
  size,
  cx,
  cy,
  color,
  opacity = 1,
}: {
  art: GlyphArt | undefined;
  size: number;
  cx: number;
  cy: number;
  color?: string;
  opacity?: number;
}) {
  if (!art) return null;

  const [minX, minY, w, h] = art.vb;
  const scale = size / Math.max(w, h);
  const tx = cx - (minX + w / 2) * scale;
  const ty = cy - (minY + h / 2) * scale;

  return (
    <G
      transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})`}
      opacity={opacity}
      pointerEvents="none"
    >
      <G
        transform={art.transform}
        fill={color}
        stroke={color}
        strokeWidth={art.strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {art.paths.map((p, i) => (
          <Path key={i} d={p.d} strokeWidth={p.strokeWidth} />
        ))}
      </G>
    </G>
  );
}

export default WheelGlyph;
